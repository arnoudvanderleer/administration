import express from 'express';
import { parse } from 'csv-parse';
import fs from 'fs/promises';

import connect_db, { dump } from '../database/database';
import BankTransaction from '../database/BankTransaction';
import Mutation from '../database/Mutation';
import Account from '../database/Account';
import { Op, Sequelize, literal } from 'sequelize';
import FinancialPeriod from 'database/FinancialPeriod';

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
        let period_start = new Date(req.session.financial_period?.start_date ?? 0).getTime();
        let period_end = new Date(req.session.financial_period?.end_date ?? 0).getTime();

        let clip = (d : Date) => new Date(Math.max(Math.min(d.getTime(), period_end), period_start));

        let from = clip(new Date((req.query.from as string) ?? period_start));
        let to = clip(new Date((req.query.to as string) ?? period_end));
        let before_from = new Date(from);
        before_from.setDate(before_from.getDate() - 1);

        res.send(await models.Account.findAll({
            include: [
                {
                    model: models.Mutation,
                    attributes: ["amount"],
                    include: [{
                        model: models.Transaction,
                        attributes: ["date"],
                        where: {
                            complete: true,
                            date: { [Op.between]: [from, to] },
                        },
                    }],
                },
                {
                    attributes: ["budget"],
                    model: models.AccountFinancialPeriod,
                    where: { FinancialPeriodId: req.session.financial_period?.id },
                }
            ],
            attributes: {
                include: [[
                    literal(`COALESCE((
                        SELECT SUM("Mutations".amount)
                        FROM "Mutations", "Transactions"
                        WHERE "Mutations"."TransactionId" = "Transactions".id
                            AND "Mutations"."AccountId" = "Account".id
                            AND "Transactions".date BETWEEN
                                '${new Date(req.session.financial_period?.start_date ?? 0).toISOString()}'
                                AND '${before_from.toISOString()}'
                    ), 0) + "AccountFinancialPeriods".start_amount`),
                    'start_amount'
                ]]
            },
            where: req.params.id ? {id : req.params.id} : {},
            order: ["number"],
        }));
    });

    router.get("/graph", async (req, res) => {
        let result = await models.Mutation.findAll({
            include: [
                {
                    model: models.Transaction,
                    where: {
                        date: { [Op.between]: [req.session.financial_period?.start_date, req.session.financial_period?.end_date] },
                    },
                    attributes: [],
                },
                {
                    model: models.Account,
                    attributes: [],
                    where: {
                        number: {[Op.between] : [3000, 4999]}
                    }
                }
            ],
            attributes: [
                [Sequelize.col("Transaction.date"), "date"],
                [Sequelize.fn('SUM', Sequelize.col("Mutation.amount")), 'change'],
            ],
            order: [Sequelize.col("Transaction.date")],
            group: [Sequelize.col("Transaction.date")],
        });
        res.send(result);
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
