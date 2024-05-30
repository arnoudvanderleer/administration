import express, { Request, Response } from 'express';
import { Schema, checkSchema, matchedData, validationResult } from 'express-validator';

import connect_db from '../database/database';
import Mutation from '../database/Mutation';
import Account from '../database/Account';

import { Transaction, Op, FindOptions, IncludeOptions, col } from 'sequelize';
import FinancialPeriod from 'database/FinancialPeriod';

const router = express.Router();

const schemas : {[key: string]: Schema} = {
    account: {
        name: {exists: {options: {values: 'falsy'}}},
        number: {isInt: true},
        AccountFinancialPeriods: {
            isArray: true,
        },
        'AccountFinancialPeriods.*.budget': {isDecimal: true},
    },
    transaction: {
        description: {exists: true},
        date: {isDate: true},
        complete: {isBoolean: true},
        Mutations: {
            isArray: true,
            isEmpty: false
        },
        'Mutations.*.AccountId': {isInt: true},
        'Mutations.*.amount': {isDecimal: true},
    },
    financial_period: {
        start_date: {isDate: true},
        end_date: {isDate: true},
    },
};

export default (async () => {
    const models = await connect_db;

    const account_query: ((financial_period_id: number | undefined) => FindOptions<any>) = (financial_period_id) => ({
        order: [['number', 'ASC']],
        include: {
            model: models.AccountFinancialPeriod,
            required: false,
            where: { FinancialPeriodId: financial_period_id },
        },
    });

    const transaction_query: ((start: Date | undefined, end: Date | undefined) => IncludeOptions) = (start, end) => ({
        order: [['date', 'DESC']],
        where: {
            complete: true,
            date: { [Op.between]: [start, end] },
        },
        include: [
            {
                model: Mutation,
                include: [Account],
            },
            models.BankTransaction
        ],
    });

    router.get('/account', async (req, res) => res.send(await models.Account.findAll(account_query(req.session.financial_period?.id))));

    router.post('/account',
        checkSchema(schemas.account), 
        async (req: Request, res: Response) => {
            let validation_result = validationResult(req);
            if (!validation_result.isEmpty()) {
                return res.status(400).send(validation_result.array());
            }
            let validated_data = matchedData(req);

            let account = await models.Account.create({
                number: validated_data.number,
                name: validated_data.name,
            });

            let period = await models.AccountFinancialPeriod.create({
                start_amount: 0,
                budget: validated_data.AccountFinancialPeriods[0].budget ?? 0,
            });
            await period.setAccount(account.id);
            await period.setFinancialPeriod(req.session.financial_period?.id);

            res.send(await models.Account.findOne({
                ...account_query(req.session.financial_period?.id),
                where: { id: account.id },
            }));
        }
    );

    router.put('/account/:id',
        checkSchema({
            ...schemas.account,
            id: {isInt: true},
        }),
        async (req: Request, res: Response) => {
            let validation_result = validationResult(req);
            if (!validation_result.isEmpty()) {
                return res.status(400).send(validation_result.array());
            }
            let validated_data = matchedData(req);

            let account = await models.Account.findOne({ where: { id: validated_data.id } });

            if (account == null) {
                return res.status(404).send("No account with this id was found");
            }

            account.number = validated_data.number;
            account.name = validated_data.name;

            let existing_periods = await account.getAccountFinancialPeriods({
                where: { FinancialPeriodId: req.session.financial_period?.id },
            });

            if (req.body.AccountFinancialPeriods.length == 0) {
                if (existing_periods.length > 0) {
                    if (parseFloat(existing_periods[0].start_amount)) {
                        return res.status(400).send('Kan deze rekening en dit boekjaar niet ontkoppelen omdat de startwaarde niet 0 is');
                    }
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
                        return res.status(400).send(`Kan deze rekening en dit boekjaar niet ontkoppelen omdat het nog mutaties bevat: ${JSON.stringify(matching_mutations)}`);
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
                ...account_query(req.session.financial_period?.id),
                where: { id: account.id },
            }));
        }
    );

    router.delete('/account/:id', async (req, res) => {
        let account = await models.Account.findOne({ where: { id: req.params.id }, include: [models.Mutation] }) as (Account & { Mutations: Mutation[] });

        if (account == null) {
            return res.status(404).send("Er bestaat geen rekening met dit id");
        }

        if (account.Mutations.length > 0) {
            return res.status(400).send("Er zijn nog mutaties gelinkt aan deze rekening");
        }

        let account_financial_periods = await account.getAccountFinancialPeriods();

        if (account_financial_periods.map(p => p.FinancialPeriodId != req.session.financial_period?.id).reduce((a, b) => a || b, false)) {
            return res.status(400).send("Er zijn nog boekjaren gelinkt aan deze rekening");
        }

        for (let p of account_financial_periods) {
            await p.destroy();
        }

        account.destroy();

        res.status(200).send();
    });

    router.get('/transaction', async (req, res) => {
        let start = new Date(req.session.financial_period?.start_date as Date);
        if (req.query.from) {
            let new_start = new Date(req.query.from as string);
            if (new_start > start) {
                start = new_start;
            }
        }
        let end = new Date(req.session.financial_period?.end_date as Date);
        if (req.query.to) {
            let new_end = new Date(req.query.to as string);
            if (new_end < end) {
                end = new_end;
            }
        }
        res.send(await models.Transaction.findAll(transaction_query(start, end)));
    });

    router.get('/account/:id/transaction', async (req, res) => {
        let start = new Date(req.session.financial_period?.start_date as Date);
        if (req.query.from) {
            let new_start = new Date(req.query.from as string);
            if (new_start > start) {
                start = new_start;
            }
        }
        let end = new Date(req.session.financial_period?.end_date as Date);
        if (req.query.to) {
            let new_end = new Date(req.query.to as string);
            if (new_end < end) {
                end = new_end;
            }
        }
        res.send(
            (await models.Mutation.findAll({
                include: [
                    {
                        model: models.Account,
                        where: { id: req.params.id },
                        attributes: [],
                    }, {
                        ...transaction_query(start, end),
                        model: models.Transaction,
                    }
                ],
                order: [[col("Transaction.date"), "DESC"]],
                attributes: [],
            })).map(m => (m as Mutation & { Transaction: Transaction }).Transaction)
        );
    });

    router.post('/transaction',
        checkSchema(schemas.transaction),
        async (req: Request, res: Response) => {
            let validation_result = validationResult(req);
            if (!validation_result.isEmpty()) {
                return res.status(400).send(validation_result.array());
            }
            let validated_data = matchedData(req);
            validated_data.date = new Date(validated_data.date);

            if (
                validated_data.date < new Date((req.session.financial_period as FinancialPeriod).start_date) ||
                validated_data.date > new Date((req.session.financial_period as FinancialPeriod).end_date)
            ) {
                return res.status(400).send("Je kunt geen transactie aanmaken buiten je boekjaar.");
            }

            let transaction = await models.Transaction.create({
                date: validated_data.date,
                description: validated_data.description,
                complete: !!validated_data.complete,
            });

            for (let m of (validated_data.Mutations as { AccountId: number, amount: string }[])) {
                let mutation = await transaction.createMutation({ amount: m.amount });
                try {
                    await mutation.setAccount(m.AccountId);
                } catch (e) {
                    return res.status(400).send(`An error occurred when trying to make a mutation at account ${m.AccountId}: ${e}`);
                }
            }

            res.send(await models.Transaction.findOne({
                ...transaction_query(req.session.financial_period?.start_date, req.session.financial_period?.end_date),
                where: {
                    id: transaction.id,
                },
            }));
        }
    );

    router.put('/transaction/:id', 
        checkSchema({
            ...schemas.transaction,
            id: {isInt: true},
        }),
        async (req: Request, res: Response) => {
            let transaction = await models.Transaction.findOne({ where: { id: req.params.id } });

            if (transaction == null) {
                return res.status(404).send("Er bestaat geen transactie met dit id");
            }

            if (
                transaction.date < new Date((req.session.financial_period as FinancialPeriod).start_date) ||
                transaction.date > new Date((req.session.financial_period as FinancialPeriod).end_date)
            ) {
                return res.status(400).send("Je kunt geen transactie bewerken buiten je boekjaar.");
            }

            let validated_data = matchedData(req);
            validated_data.date = new Date(validated_data.date);

            if (!(await transaction.getBankTransaction())) {
                if (
                    validated_data.date < new Date((req.session.financial_period as FinancialPeriod).start_date) ||
                    validated_data.date > new Date((req.session.financial_period as FinancialPeriod).end_date)
                ) {
                    return res.status(400).send("Je kunt de datum niet buiten het boekjaar verplaatsen.");
                }
                transaction.date = validated_data.date;
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
        }
    );

    router.delete('/transaction/:id', 
        checkSchema({
            id: {isInt: true},
        }),
        async (req: Request, res: Response) => {
            let transaction = await models.Transaction.findOne({ where: { id: req.params.id } });

            if (transaction == null) {
                return res.status(404).send("Er bestaat geen transactie met dit id");
            }

            if (
                transaction.date < new Date((req.session.financial_period as FinancialPeriod).start_date) ||
                transaction.date > new Date((req.session.financial_period as FinancialPeriod).end_date)
            ) {
                return res.status(400).send("Je kunt geen transactie bewerken buiten je boekjaar.");
            }

            await models.Transaction.destroy({
                where: { id: req.params.id },
            });

            res.send();
        }
    );

    router.get('/financial-period', async (_, res) => res.send(JSON.stringify(await models.FinancialPeriod.findAll({
        order: [['start_date', 'DESC']],
    }))));

    router.post('/financial-period', async (req, res) => {
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
