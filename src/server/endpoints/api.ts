import express from 'express';
import { parse } from 'csv-parse';
import fs from 'fs/promises';

import connect_db, { dump } from '../database/database';
import BankTransaction from '../database/BankTransaction';
import Mutation from '../database/Mutation';
import Account from '../database/Account';
import { Op, QueryTypes, Sequelize, literal } from 'sequelize';
import FinancialPeriod from 'database/FinancialPeriod';
import * as util from '../util';

const router = express.Router();

export default (async () => {
    const models = await connect_db;

    router.post("/upload-transactions", async (req, res) => {
        if (!req.files || Object.keys(req.files).length === 0) {
            return res.status(400).send('No files were uploaded.');
        }

        if (!req.body || !req.body.account) {
            return res.status(400).send('No account was given.');
        }

        let account = await models.Account.findByPk(req.body.account);

        if (account == null) {
            return res.status(400).send('The account does not exist!');
        }

        let file = req.files.transactions;

        let lines: Object[][] = [];
        if (Array.isArray(file)) {
            lines.concat(...await Promise.all(file.map(f => parse_csv(f.data))));
        } else {
            lines = await parse_csv(file.data);
        }

        let results: { added: number, skipped: number, errors: string[] } = {
            added: 0,
            skipped: 0,
            errors: [],
        };
        for (let line of lines) {
            let bank_transaction_id = `${line[1]} ${line[0]} ${line[15]}`;

            let existing_bank_transaction = await BankTransaction.findOne({ where: { bank_transaction_id } });
            if (existing_bank_transaction) {
                results.skipped++;
                continue;
            }

            let date_string = line[0] as string;
            let date = new Date(`${date_string.substring(6, 10)}-${date_string.substring(3, 5)}-${date_string.substring(0, 2)}`);

            if (
                date < new Date((req.session.financial_period as FinancialPeriod).start_date) ||
                date > new Date((req.session.financial_period as FinancialPeriod).end_date)
            ) {
                results.errors.push(`Kan de regel ${JSON.stringify(line)} niet toevoegen omdat ${date} buiten het boekjaar ligt`);
                continue;
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

            results.added++;
        }

        console.log(results);

        return res.writeHead(302, {
            'Location': '/process-transactions',
        }).send();
    });

    router.get("/unprocessed-transactions/:id", async (req, res) => {
        if (!req.session.financial_period?.current) {
            return res.status(400).send("Je kunt geen wijzigingen meer doen in dit boekjaar.");
        }

        res.send(await models.Transaction.findAll({
            where: {
                complete: false,
                date: { [Op.between]: [req.session.financial_period?.start_date, req.session.financial_period?.end_date] },
            },
            order: [['date', 'ASC']],
            include: [
                BankTransaction,
                {
                    model: Mutation,
                    include: [Account],
                    where: { AccountId: req.params.id },
                },
            ],
        }));
    });

    router.get("/account-overview/:id?", async (req, res) => {
        let date = util.clip_period(req, (req.query.date as string) ?? util.period_end(req));

        let query =
            `WITH mutation_data AS (
                SELECT
                    M."AccountId",
                    M.amount
                FROM
                    "Mutations" AS M
                    JOIN "Transactions" AS T ON M."TransactionId" = T.id
                    JOIN "FinancialPeriods" AS FP ON FP.id = $period_id
                WHERE
                    T.date BETWEEN FP.start_date AND $date
                    AND T.complete = TRUE
            )
            SELECT
                A.id,
                A.number,
                A.name,
                A.is_bank,
                AFP.budget,
                AFP.start_amount + SUM(COALESCE(M.amount, 0)) AS amount
            FROM
                "Accounts" AS A
                JOIN "AccountFinancialPeriods" AS AFP ON AFP."AccountId" = A.id
                    AND AFP."FinancialPeriodId" = $period_id
                LEFT JOIN mutation_data M ON M."AccountId" = A.id
            GROUP BY
                A.id,
                AFP.id
            ORDER BY
                A.number ASC;`;

        try {
            let result = await models.sequelize.query(query, {
                bind: {
                    date,
                    period_id: req.session.financial_period?.id,
                },
                type: QueryTypes.SELECT,
            });

            res.send(result);
        } catch (e) {
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
                    period_id: req.session.financial_period?.id,
                    from,
                    to,
                },
                type: QueryTypes.SELECT,
            });

            res.send(result);
        } catch (e) {
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
