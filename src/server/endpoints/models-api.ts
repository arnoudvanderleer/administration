import bodyParser from 'body-parser';
import express from 'express';

import connect_db from '../database/database';
import Mutation from '../database/Mutation';
import Account from '../database/Account';

import { Transaction, Op } from 'sequelize';

const router = express.Router();
export default router;

const json_parser = bodyParser.json();
const urlencoded_parser = bodyParser.urlencoded({ extended: false });

(async () => {
    const models = await connect_db;

    router.get('/account', async (_, res) => res.send(JSON.stringify(await models.Account.findAll({ order: [['number', 'ASC']] }))));

    router.post('/account', urlencoded_parser, async (req, res) => {
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

        res.send(JSON.stringify(account))
    });

    router.get('/transaction', async (_, res) => res.send(JSON.stringify(await models.Transaction.findAll({
        order: [['date', 'ASC']],
        where: { complete: true },
        include: [
            {
                model: Mutation,
                include: [Account],
            },
            models.BankTransaction
        ],
    }))));

    router.get('/transaction/:id', async (req, res) => res.send(JSON.stringify(
        (await models.Mutation.findAll({
            include: [
                {
                    model: models.Account,
                    where: { id: req.params.id },
                    attributes: [],
                }, {
                    model: models.Transaction,
                    order: [['date', 'ASC']],
                    where: { complete: true },
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
    )));

    router.put('/account/:id', urlencoded_parser, async (req, res) => {
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

        account.save();

        res.send(account);
    });

    router.delete('/account/:id', urlencoded_parser, async (req, res) => {
        let account = await models.Account.findOne({ where: { id: req.params.id } });

        if (account == null) {
            return res.status(404).send("No account with this id was found");
        }

        account.destroy();

        res.status(200).send();
    });

    router.put('/transaction/:id', json_parser, async (req, res) => {
        let transaction = await models.Transaction.findOne({ where: { id: req.params.id } });

        if (transaction == null) {
            return res.status(404).send("No transaction with this id was found");
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
        let existing = await models.FinancialPeriod.findOne({
            where: {[Op.and]: [
                {start_date: {[Op.lte]: [end_date]}},
                {end_date: {[Op.gte]: [start_date]}},
            ]}
        });
        if (existing) {
            return res.status(400).send(`This period overlaps with ${JSON.stringify(existing)}`)
        }
        res.send(await models.FinancialPeriod.create({
            start_date,
            end_date,
        }));
    });
})();
