import { Op } from 'sequelize';
import connect_db from './database/database';
import PlannedMutation from './database/PlannedMutation';
import PlannedTransaction from 'database/PlannedTransaction';

export async function process_planned_transactions () {
    console.log("Process planned transactions");
    const models = await connect_db;

    let financial_period = await models.FinancialPeriod.findOne({
        where: {
            current: true,
        },
    });

    if (financial_period == null) {
        return;
    }

    let transactions = (await models.PlannedTransaction.findAll({
        where: {
            nextDate: { [Op.lte]: new Date().toISOString().substring(0, 10) },
        },
        include: PlannedMutation,
    }) as (PlannedTransaction & {PlannedMutations: PlannedMutation[]})[]);

    for (let t of transactions) {
        while (t.nextDate <= new Date()) {
            if (t.nextDate < financial_period.start_date || financial_period.end_date < t.nextDate) {
                break;
            }

            console.log("Processing planned transaction", t.get({plain: true}));
            let new_transaction = await models.Transaction.create({
                description: t.description,
                date: t.nextDate,
                complete: true,
            });

            await Promise.all(t.PlannedMutations.map(m => 
                new_transaction.createMutation({
                    amount: m.amount,
                    AccountId: m.AccountId,
                })
            ));

            if (t.period <= 0) {
                await t.destroy();
                break;
            }

            let new_date = new Date(t.nextDate);
            switch (t.periodUnit) {
                case "day":
                    new_date.setDate(new_date.getDate() + t.period);
                    break;
                case "week":
                    new_date.setDate(new_date.getDate() + t.period * 7);
                    break;
                case "month":
                    new_date.setMonth(new_date.getMonth() + t.period);
                    break;
            }
            t.nextDate = new_date;
            t.save();
        }
    }
}

let daemons = [
    {daemon: process_planned_transactions, time: 1000 * 3600 * 12},
];

export default async function start_daemons() {
    for (let {daemon, time} of daemons) {
        daemon();
        setInterval(daemon, time);
    }
};