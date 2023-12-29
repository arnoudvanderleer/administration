import bodyParser from 'body-parser';
import express from 'express';
import connect_db from '../database/database';

import crypto from 'crypto';

const router = express.Router();

export default (async () => {
    let models = await connect_db;

    router.use(bodyParser.urlencoded({ extended: false }));

    router.get('/', async (req, res) => {
        if (req.session.user_id != null) {
            return res.writeHead(302, {
                'Location': '/',
            }).send();
        }

        let user_count = await models.User.count();
        let params = {
            layout: null,
            action: user_count == 0 ? "Registreren" : "Inloggen",
            title: user_count == 0 ? "Gebruiker aanmaken" : "Inloggen",
        };
        res.render("login", params);
    });

    router.post("/", async (req, res) => {
        if (req.session.user_id != null) {
            return res.writeHead(302, {
                'Location': '/',
            }).send();
        }

        let user_count = await models.User.count();

        if (user_count == 0) {
            let salt = crypto.randomBytes(16).toString('hex');
            let hash = crypto.pbkdf2Sync(req.body.password, salt, 1000, 64, `sha512`).toString(`hex`);

            let new_user = await models.User.create({
                username: req.body.username,
                salt: salt,
                password: hash,
            });

            req.session.user_id = new_user.id;
        } else {
            let user = await models.User.findOne({where: {username: req.body.username}});
            if (user != null) {
                let hash = crypto.pbkdf2Sync(req.body.password, user.salt, 1000, 64, `sha512`).toString(`hex`);
                if (hash == user.password) {
                    req.session.user_id = user.id;
                }
            }

        }

        if (req.session.user_id != null) {
            req.session.financial_period = await models.FinancialPeriod.findOne({
                raw: true,
                order: [['start_date', 'DESC']]
            });
            return res.writeHead(302, {
                'Location': '/',
            }).send();
        }

        return res.writeHead(302, {
            'Location': '/auth',
        }).send();
    });

    router.get("/logout", (req, res) => {
        req.session.user_id = null;

        return res.writeHead(302, {
            'Location': '/auth',
        }).send();
    });

    return router;
})();
