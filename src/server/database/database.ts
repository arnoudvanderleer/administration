import { Sequelize } from 'sequelize';
import util from 'util';
import { exec } from 'child_process';

import Account, {init as initAccount} from "./Account";
import BankTransaction, {init as initBankTransaction} from "./BankTransaction";
import FinancialPeriod, {init as initFinancialPeriod} from './FinancialPeriod';
import AccountFinancialPeriod, {init as initAccountFinancialPeriod} from './AccountFinancialPeriod';
import Mutation, {init as initMutation} from "./Mutation";
import Transaction, {init as initTransaction} from "./Transaction";
import PlannedMutation, {init as initPlannedMutation} from "./PlannedMutation";
import PlannedTransaction, {init as initPlannedTransaction} from "./PlannedTransaction";
import User, {init as initUser} from "./User";

const exec_promise = util.promisify(exec);

const credentials = {
    host: 'db',
    username: 'postgres',
    password: 'accountant',
    database: 'postgres',
    port: 5432,
};

export default (async () => {
    const sequelize = new Sequelize(credentials.database, credentials.username, credentials.password, {
        host: credentials.host,
        dialect: 'postgres',
    });

    console.log('Connecting to database');
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }

    initAccount(sequelize);
    initBankTransaction(sequelize);
    initFinancialPeriod(sequelize);
    initAccountFinancialPeriod(sequelize);
    initMutation(sequelize);
    initTransaction(sequelize);
    initPlannedMutation(sequelize);
    initPlannedTransaction(sequelize);
    initUser(sequelize);

    Account.hasMany(AccountFinancialPeriod, {
        onDelete: 'RESTRICT',
    });
    AccountFinancialPeriod.belongsTo(Account);

    Account.hasMany(Mutation, {
        onDelete: 'RESTRICT',
    });
    Mutation.belongsTo(Account);

    FinancialPeriod.hasMany(AccountFinancialPeriod, {
        onDelete: 'RESTRICT',
    });
    AccountFinancialPeriod.belongsTo(FinancialPeriod);

    Transaction.hasOne(BankTransaction, {
        onDelete: 'CASCADE',
    });
    BankTransaction.belongsTo(Transaction);

    Transaction.hasMany(Mutation, {
        onDelete: 'CASCADE',
    });
    Mutation.belongsTo(Transaction);

    Account.hasMany(PlannedMutation, {
        onDelete: 'RESTRICT',
    });
    PlannedMutation.belongsTo(Account);

    PlannedTransaction.hasMany(PlannedMutation, {
        onDelete: 'CASCADE',
    });
    PlannedMutation.belongsTo(PlannedTransaction);

    sequelize.sync();

    return {
        sequelize,
        Account,
        BankTransaction,
        FinancialPeriod,
        AccountFinancialPeriod,
        Mutation,
        Transaction,
        PlannedMutation,
        PlannedTransaction,
        User,
    };
})();

const pg_flags = [
        ['username', credentials.username],
        ['host', credentials.host],
        ['port', credentials.port],
        ['format', 't'],
    ]
    .map(([name, value]) => `--${name}="${value}"`)
    .join(" ");

export async function dump() {
    let name = `./backup-${new Date().getTime()}.tar.gz`;

    let command = `PGPASSWORD="${credentials.password}" pg_dump ${pg_flags} "${credentials.database}" | gzip > "${name}"`;

    await exec_promise(command);

    return name;
}

export async function restore(name: string) {
    let command = `gunzip -c "${name}" | PGPASSWORD="${credentials.password}" pg_restore ${pg_flags} --clean --dbname "${credentials.database}"`;

    return exec_promise(command);
}