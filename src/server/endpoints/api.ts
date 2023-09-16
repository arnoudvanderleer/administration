import express from 'express';
import { parse } from 'csv-parse';
import bodyParser from 'body-parser';

import connect_db from '../database/database';
import BankTransaction from '../database/BankTransaction';
import Mutation from '../database/Mutation';
import Account from '../database/Account';
import { Op, Sequelize, Transaction } from 'sequelize';
import FinancialPeriod from 'database/FinancialPeriod';

const router = express.Router();
const json_parser = bodyParser.json();

export default (async () => {
    const models = await connect_db;

    router.post("/upload-transactions", async (req, res) => {
        if (!req.session.financial_period?.current) {
            return res.status(400).send("Je kunt geen wijzigingen meer doen in dit boekjaar.");
        }

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

        res.send(results);
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

    router.get("/account-overview", async (req, res) => {
        let result = await models.Account.findAll({
            include: [
                {
                    model: models.Mutation,
                    attributes: [],
                    include: [{
                        model: models.Transaction,
                        attributes: [],
                        where: {
                            complete: true,
                            date: { [Op.between]: [req.session.financial_period?.start_date, req.session.financial_period?.end_date] },
                        },
                    }]
                },
                {
                    model: models.AccountFinancialPeriod,
                    where: { FinancialPeriodId: req.session.financial_period?.id },
                }
            ],
            attributes: {
                include: [
                    [Sequelize.fn('SUM', Sequelize.col("Mutations.amount")), 'amount_sum']
                ]
            },
            group: [Sequelize.col("Account.id"), Sequelize.col("AccountFinancialPeriods.id")],
            order: [Sequelize.col("Account.number")],
        });
        res.send(result);
    });

    router.put("/financial-period", json_parser, async (req, res) => {
        let period = await models.FinancialPeriod.findByPk(req.body.id);
        if (!period) return res.status(400).send();
        req.session.financial_period = period;
        res.send();
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