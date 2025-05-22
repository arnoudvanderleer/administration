import bodyParser from 'body-parser';
import express from 'express';
import connect_db, { restore } from '../database/database';
import tmp from 'tmp-promise';
import fs from 'fs';

import crypto from 'crypto';
import { sanitize_iban } from '../util';

const router = express.Router();

export default (async () => {
    let models = await connect_db;

    router.use(bodyParser.urlencoded({ extended: false }));

    router.get("/logout", (req, res) => {
        req.session.user_id = undefined;

        return res.writeHead(302, {
            'Location': '/auth',
        }).send();
    });

    router.use(async (req, res, next) => {
        if (req.session.user_id) {
            return res.writeHead(302, {
                'Location': '/',
            }).send();
        }
        next();
    });

    router.get('/', async (req, res) => {
        let user_count = await models.User.count();
        let first = user_count == 0;
        let params = {
            layout: null,
            first,
            action: first ? "Registreren" : "Inloggen",
        };
        res.render("login", params);
    });

    router.post("/", async (req, res) => {
        let user_count = await models.User.count();

        if (user_count == 0) {
            let salt = crypto.randomBytes(16).toString('hex');
            let hash = crypto.pbkdf2Sync(req.body.password, salt, 1000, 64, `sha512`).toString(`hex`);

            let user_data = {
                username: req.body.username,
                salt: salt,
                password: hash,
            };

            if (new Date(req.body.financial_period[0]) >= new Date(req.body.financial_period[1])) {
                res.status(400).send("Het begin van het boekjaar moet voor het einde komen.");
            }

            let financial_period_data = {
                start_date: new Date(req.body.financial_period[0]),
                end_date: new Date(req.body.financial_period[1]),
                current: true,
            };

            let account_data = (req.body.account_name as string[]).map((n, i) => ({
                name: req.body.account_name[i],
                number: req.body.account_number[i],
                iban: sanitize_iban(req.body.account_iban[i]),
                value: ([1, 4].indexOf(Math.floor(req.body.account_number[i] / 1000)) > -1 ? (-1) : 1) * req.body.account_value[i],
            }));

            let new_user = await models.User.create(user_data);

            let new_financial_period = await models.FinancialPeriod.create(financial_period_data);

            await Promise.all(account_data.map(async a => {
                let account = await models.Account.create(a);
                let period = await models.AccountFinancialPeriod.create({
                    start_amount: a.value,
                    budget: 0,
                });
                await period.setAccount(account.id);
                await period.setFinancialPeriod(new_financial_period.id);
            }));

            req.session.user_id = new_user.id;
            req.session.financial_period = new_financial_period;
        } else {
            let user = await models.User.findOne({where: {username: req.body.username}});
            if (user) {
                let hash = crypto.pbkdf2Sync(req.body.password, user.salt, 1000, 64, `sha512`).toString(`hex`);
                if (hash == user.password) {
                    req.session.user_id = user.id;
                    req.session.financial_period = await models.FinancialPeriod.findOne({
                        raw: true,
                        order: [['start_date', 'DESC']]
                    }) ?? undefined;
                }
            }
        }

        if (req.session.user_id) {
            return res.writeHead(302, {
                'Location': '/',
            }).send();
        }

        return res.writeHead(302, {
            'Location': '/auth',
        }).send();
    });

    router.post("/restore-backup", async (req, res) => {
        if (await models.User.count() > 0) {
            return res.send("I am sorry, you cannot restore a backup on an existing installation.");
        }

        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).send('No files were uploaded.');
        }

        let file = req.files.backup;

        if (Array.isArray(file)) {
            file = file[0];
        }

        let tmp_file = await tmp.file();

        let stream = fs.createWriteStream(tmp_file.path);
        stream.write(file.data);
        stream.close();

        try {
            await restore(tmp_file.path);
        } catch (e) {
            console.log(e);
            return res.send("Something went wrong.");
        }

        return res.send("Backup restored successfully. Please return to the previous page to log in.");
    });

    return router;
})();
