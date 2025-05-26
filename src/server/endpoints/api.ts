import express from 'express';
import { parse } from 'csv-parse';
import fs from 'fs/promises';
import yauzl from 'yauzl-promise';

import { Op, QueryTypes } from 'sequelize';
import connect_db, { dump } from '../database/database';
import BankTransaction from '../database/BankTransaction';
import FinancialPeriod from '../database/FinancialPeriod';
import Account from '../database/Account';
import * as util from '../util';
import { buffer } from 'stream/consumers';

const router = express.Router();

export default (async () => {
    const models = await connect_db;

    async function upload_transaction (line: Object[], account: Account, financial_period: FinancialPeriod) : Promise<{ added?: boolean, skipped?: boolean, error?: string }> {
        let bank_transaction_id = `${line[1]} ${line[0]} ${line[15]}`;

        let existing_bank_transaction = await BankTransaction.findOne({ where: { bank_transaction_id } });
        if (existing_bank_transaction) {
            return { skipped: true };
        }

        let date_string = line[0] as string;
        let date = new Date(`${date_string.substring(6, 10)}-${date_string.substring(3, 5)}-${date_string.substring(0, 2)}`);

        if (date < new Date(financial_period.start_date) || date > new Date(financial_period.end_date)) {
            return { error: `Kan de regel ${JSON.stringify(line)} niet toevoegen omdat ${date} buiten het boekjaar ligt` };
        }

        let transaction = await models.Transaction.create({
            date,
            description: `${line[16]} ${line[17]}`.trim(),
        });
        let amount = parseFloat(line[10] as string);
        await transaction.createBankTransaction({
            bank_transaction_id,
            this_account: line[1],
            other_account: line[2],
            other_account_name: line[3],
            is_credit: amount > 0,
        });
        let mutation = await transaction.createMutation({
            amount: amount.toFixed(2),
        });
        account.addMutation(mutation);

        return { added : true };
    }

    router.post("/upload-transactions", async (req, res) => {
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).send('No files were uploaded.');
        }

        let uploaded_file = req.files.transactions;

        if (Array.isArray(uploaded_file)) {
            return res.status(400).send(`Please upload a single zip or csv file.`);
        }

        let files: {data: Buffer, name: string, account: Account}[] = [];

        if (uploaded_file.mimetype == 'text/csv') {
            if (!req.body || !req.body.account) {
                return res.status(400).send('No account was given.');
            }

            let account = await models.Account.findByPk(req.body.account);

            if (account == null) {
                return res.status(400).send('The account does not exist!');
            }

            files.push({
                data: uploaded_file.data,
                name: uploaded_file.name,
                account: account,
            });
        } else if (uploaded_file.mimetype == 'application/zip') {
            const bank_accounts = Account.findAll({ where: { iban: { [Op.ne]: null } } });
            const zip = await yauzl.fromBuffer(uploaded_file.data);
            try {
              for await (const entry of zip) {
                if (!entry.filename.endsWith('/')) {
                    let account = match_filename_iban(entry.filename, await bank_accounts);
                    if (account == null) {
                        console.log(`No account found for file ${entry.filename}`);
                        continue;
                    }
                    files.push({
                        data: await buffer(await entry.openReadStream()),
                        account,
                        name: entry.filename,
                    });
                }
              }
            } finally {
              await zip.close();
            }
        }

        for (let file of files) {
            let results = await Promise.all((await parse_csv(file.data)).map(line =>
                upload_transaction(line, file.account, req.session.financial_period as FinancialPeriod)
            ));

            console.log({
                added: results.filter(r => r.added).length,
                skipped: results.filter(r => r.skipped).length,
                errors: results.filter(r => r.error),
            }, file.name, file.account.name);
        }

        return res.writeHead(302, {
            'Location': '/process-transactions',
        }).send();
    });

    router.get("/unprocessed-transactions/:id", async (req, res) => {
        if (!(req.session.financial_period as FinancialPeriod).current) {
            return res.status(400).send("Je kunt geen wijzigingen meer doen in dit boekjaar.");
        }

        res.send(await models.Transaction.unprocessed(parseInt(req.params.id)));
    });

    router.get("/account-overview/:id?", async (req, res) => {
        try {
            res.send(await models.Account.overview(
                (req.session.financial_period as FinancialPeriod).id,
                (req.query.date as string) ?? util.period_end(req)
            ));
        } catch (e) {
            console.log(e);
            res.send("Something went terribly wrong.");
        }
    });

    router.get("/graph/:id", async (req, res) => {
        let from = util.clip_period(req, (req.query.from as string) ?? util.period_start(req));
        let to = util.clip_period(req, (req.query.to as string) ?? util.period_end(req));

        let account_part = `AND M."AccountId" = $account_id`;
        let factor = `1`;

        if (req.params.id == "-1") {
            account_part = ``;
            factor = `(CASE WHEN A.number / 1000 - 1 < 2 THEN 0 ELSE -1 END)`;
        }

        let query =
            `SELECT
                T.date,
                SUM(M.amount * ${factor}) AS amount
            FROM
                "Mutations" AS M
                JOIN "Transactions" AS T
                    ON M."TransactionId" = T.id
                JOIN "Accounts" AS A
                    ON M."AccountId" = A.id
            WHERE
                T.complete = TRUE
                ${account_part}
                And T.date BETWEEN $from AND $to
            GROUP BY T.date
            ORDER BY date ASC;`;

        try {
            let result = await models.sequelize.query(query, {
                bind: {
                    account_id: req.params.id,
                    period_id: (req.session.financial_period as FinancialPeriod).id,
                    from,
                    to,
                },
                type: QueryTypes.SELECT,
            });

            res.send(result);
        } catch (e) {
            console.log(e);
            res.send("Something went terribly wrong.");
        }
    });

    router.get("/backup", async (req, res) => {
        let name = await dump();

        res.download(name, async e => {
            await fs.unlink(name);

            let user = await models.User.findByPk(req.session.user_id ?? 0);
            if (user) {
                user.last_backup = new Date();
                await user.save();
            }
        });
    });

    router.post("/close-financial-period", async (req, res) => {
        let financial_period_id = (req.session.financial_period as FinancialPeriod).id;

        let confirm = (req.query.confirm ?? 'false') == '';

        let messages = [];

        if (!(req.session.financial_period as FinancialPeriod).current) {
            messages.push({
                success: false,
                text: "Dit boekjaar is al gesloten.",
            });
        }

        let new_start = new Date(new Date((req.session.financial_period as FinancialPeriod).end_date).getTime() + 24 * 60 * 60 * 1000);

        if (new Date() < new_start) {
            messages.push({
                success: false,
                text: "Het boekjaar is nog niet afgelopen.",
            });
        }

        let accounts = await models.Account.overview(financial_period_id, new_start.toISOString().substring(0, 10));

        if (accounts == undefined) {
            return res.send("The accounts could not be fetched");
        }

        let bank_account_transactions = await Promise.all(accounts.filter(a => a.iban).map(a =>
            models.Transaction.unprocessed(a.id).then(u => ({
                number: a.number,
                name: a.name,
                count: u.length
            }))
        ));
        
        for (let t of bank_account_transactions) {
            if (t.count > 0) {
                messages.push({
                    success: false,
                    text: `Er zijn nog onverwerkte transacties op grootboekrekening ${t.number}: ${t.name}`,
                });
            }
        }

        let success = messages.map(m => m.success).reduce((a, b) => a && b, true);

        if (confirm && !success) {
            return res.send(messages);
        }

        let new_period : (FinancialPeriod | null) = null;

        if (confirm) {
            try {
                new_period = await models.FinancialPeriod.create({
                    current: true,
                    start_date: new_start,
                    end_date: req.body.end_date,
                });
            } catch (e) {
                console.log(e);
                return res.send(`Something went terribly wrong`);
            }

            req.session.financial_period = new_period;

            let period = (await models.FinancialPeriod.findByPk(financial_period_id) as FinancialPeriod);
            period.current = false;
            await period.save();

            messages.push({
                success: true,
                text: `Het nieuwe boekjaar loopt van ${new_period.start_date.toDateString().substring(4)} tot en met ${new_period.end_date.toDateString().substring(4)}.`
            });
        }

        await Promise.all(accounts.map(async a => {
            let category = Math.floor(a.number / 1000 - 1);
            let factor = ([0, 3].indexOf(category) > -1 ? (-1) : 1);
            let is_result = [0, 1].indexOf(category) > -1;
            messages.push({
                success: true,
                text: `${a.number}: ${a.name} ${is_result ? 'gaat terug naar 0' : 'blijft op ' + (factor * parseFloat(a.amount)).toFixed(2)}`,
            });

            if (confirm) {
                return await models.AccountFinancialPeriod.create({
                    start_amount: is_result ? 0 : a.amount,
                    budget: a.budget,
                    AccountId: a.id,
                    FinancialPeriodId: (new_period as FinancialPeriod).id,
                });
            }
        }));

        res.send(messages);
    });

    return router;
})();

function parse_csv(data: Buffer): Promise<Object[][]> {
    return new Promise(resolve => {
        let parser = parse({ delimiter: ',' });
        let lines: string[][] = [];
        parser.on("readable", () => {
            let line: string[];
            while ((line = parser.read()) !== null) {
                lines.push(
                    line.map(item => item.replace(/^'(.*)'$/, '$1'))
                );
            }
        });
        parser.on("end", () => {
            resolve(lines);
        });

        parser.write(data.toString());
        parser.end();
    });
}

function match_filename_iban(filename: string, accounts: Account[]): Account | null {
    const filter_functions : ((name: string, iban: string) => boolean)[] = [
        (name, iban) => name.startsWith(iban),
        (name, iban) => name.endsWith(iban),
        (name, iban) => name.indexOf(iban) > -1,
    ];

    let sanitized_name = filename.replace(/(\.[^.]*| )/g, "").toUpperCase();

    for (let f of filter_functions) {
        let selected_accounts = accounts.filter(a => f(sanitized_name, a.iban));
        if (selected_accounts.length == 1) {
            return selected_accounts[0];
        }
    }

    return null;
}
