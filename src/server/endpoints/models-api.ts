import bodyParser from 'body-parser';
import express from 'express';

import connect_db from '../database/database';
import Mutation from '../database/Mutation';
import Account from '../database/Account';

import { Transaction, Op } from 'sequelize';
import FinancialPeriod from 'database/FinancialPeriod';

const router = express.Router();

const json_parser = bodyParser.json();
const urlencoded_parser = bodyParser.urlencoded({ extended: false });

export default (async () => {
    const models = await connect_db;

    router.get('/account', async (req, res) => res.send(await models.Account.findAll({
        order: [['number', 'ASC']],
        include: {
            model: models.AccountFinancialPeriod,
            required: false,
            where: { FinancialPeriodId: req.session.financial_period?.id },
        }
    })));

    router.post('/account', json_parser, async (req, res) => {
        if (!req.body.name) {
            return res.status(400).send("No account name was given.");
        }
        if (!req.body.number) {
            return res.status(400).send("No account number was given.");
        }

        let account = await models.Account.create({
            number: req.body.number,
            name: req.body.name,
        });

        let new_period = req.body.AccountFinancialPeriods[0];
        let period = await models.AccountFinancialPeriod.create({
            start_amount: 0,
            budget: new_period.budget ?? 0,
        });
        await period.setAccount(account.id);
        await period.setFinancialPeriod(req.session.financial_period?.id);

        res.send(await models.Account.findOne({
            where: { id: account.id },
            include: {
                model: models.AccountFinancialPeriod,
                required: false,
                where: { FinancialPeriodId: req.session.financial_period?.id },
            },
        }));
    });

    router.put('/account/:id', json_parser, async (req, res) => {
        let account = await models.Account.findOne({ where: { id: req.params.id } });

        if (account == null) {
            return res.status(404).send("No account with this id was found");
        }

        if (req.body.number) {
            account.number = req.body.number;
        }
        if (req.body.name) {
            account.name = req.body.name;
        }

        let existing_periods = await account.getAccountFinancialPeriods({
            where: { FinancialPeriodId: req.session.financial_period?.id },
        });

        if (req.body.AccountFinancialPeriods.length == 0) {
            if (existing_periods.length > 0) {
                let matching_mutations = await account.getMutations({
                    include: {
                        model: models.Transaction,
                        where: {
                            date: {
                                [Op.between]: [req.session.financial_period?.start_date, req.session.financial_period?.end_date]
                            }
                        }
                    }
                });
                if (matching_mutations.length > 0) {
                    return res.status(400).send(`Kan dit account en dit boekjaar niet ontkoppelen omdat het nog mutaties bevat: ${JSON.stringify(matching_mutations)}`);
                }
                await existing_periods[0].destroy();
            }
        } else {
            let new_period = req.body.AccountFinancialPeriods[0];
            if (existing_periods.length == 0) {
                let period = await models.AccountFinancialPeriod.create({
                    start_amount: 0,
                    budget: new_period.budget ?? 0,
                });
                await period.setAccount(account.id);
                await period.setFinancialPeriod(req.session.financial_period?.id);
            } else {
                let existing_period = existing_periods[0];
                existing_period.budget = new_period.budget;
                await existing_period.save();
            }
        }

        await account.save();

        res.send(await models.Account.findOne({
            where: { id: req.params.id },
            include: {
                model: models.AccountFinancialPeriod,
                required: false,
                where: { FinancialPeriodId: req.session.financial_period?.id },
            },
        }));
    });

    router.delete('/account/:id', async (req, res) => {
        let account = await models.Account.findOne({ where: { id: req.params.id }, include: models.Mutation }) as (Account & { Mutations: Mutation[] });

        if (account == null) {
            return res.status(404).send("No account with this id was found");
        }

        if (account.Mutations.length > 0) {
            return res.status(400).send("This account still has associated mutations");
        }

        account.destroy();

        res.status(200).send();
    });

    router.get('/transaction', async (req, res) => res.send(await models.Transaction.findAll({
        order: [['date', 'ASC']],
        where: {
            complete: true,
            date: { [Op.between]: [req.session.financial_period?.start_date, req.session.financial_period?.end_date] },
        },
        include: [
            {
                model: Mutation,
                include: [Account],
            },
            models.BankTransaction
        ],
    })));

    router.get('/account/:id/transaction', async (req, res) => res.send(
        (await models.Mutation.findAll({
            include: [
                {
                    model: models.Account,
                    where: { id: req.params.id },
                    attributes: [],
                }, {
                    model: models.Transaction,
                    order: [['date', 'ASC']],
                    where: {
                        complete: true,
                        date: { [Op.between]: [req.session.financial_period?.start_date, req.session.financial_period?.end_date] },
                    },
                    include: [
                        {
                            model: models.Mutation,
                            include: [Account],
                        }, models.BankTransaction
                    ],
                }
            ],
            attributes: [],
        })).map(m => (m as Mutation & { Transaction: Transaction }).Transaction)
    ));

    router.put('/transaction/:id', json_parser, async (req, res) => {
        let transaction = await models.Transaction.findOne({ where: { id: req.params.id } });

        if (transaction == null) {
            return res.status(404).send("Er bestaat geen transactie met dit id");
        }

        console.log(
            transaction.date,
            (req.session.financial_period as FinancialPeriod).start_date,
            (req.session.financial_period as FinancialPeriod).end_date,
        );

        if (
            transaction.date < new Date((req.session.financial_period as FinancialPeriod).start_date) ||
            transaction.date > new Date((req.session.financial_period as FinancialPeriod).end_date)
        ) {
            return res.status(400).send("Je kunt geen transactie bewerken buiten je boekjaar.");
        }

        let existing_mutations = await transaction.getMutations();
        await Promise.all(existing_mutations.map(m => m.destroy()));

        for (let m of (req.body.Mutations as { AccountId: number, amount: string }[])) {
            let mutation = await transaction.createMutation({ amount: m.amount });
            try {
                await mutation.setAccount(m.AccountId);
            } catch (e) {
                return res.status(400).send(`An error occurred when trying to make a mutation at account ${m.AccountId}: ${e}`);
            }
        }

        if (req.body.description) {
            transaction.description = req.body.description;
        }
        if (req.body.complete) {
            transaction.complete = req.body.complete;
        }

        transaction.save();

        res.send(transaction);
    });

    router.get('/financial-period', async (_, res) => res.send(JSON.stringify(await models.FinancialPeriod.findAll({
        order: [['start_date', 'DESC']],
    }))));

    router.post('/financial-period', json_parser, async (req, res) => {
        let start_date = req.body.start_date;
        let end_date = req.body.end_date;

        if (end_date <= start_date) {
            return res.status(400).send("De eindtijd moet na de begintijd komen.")
        }

        let existing = await models.FinancialPeriod.findOne({
            where: {
                [Op.and]: [
                    { start_date: { [Op.lte]: [end_date] } },
                    { end_date: { [Op.gte]: [start_date] } },
                ]
            }
        });
        if (existing) {
            return res.status(400).send(`Deze periode overlapt met ${JSON.stringify(existing)}`)
        }
        res.send(await models.FinancialPeriod.create({
            start_date,
            end_date,
        }));
    });

    return router;
})();
