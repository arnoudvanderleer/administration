import { Sequelize } from 'sequelize';

import Account, {init as initAccount} from "./Account";
import BankTransaction, {init as initBankTransaction} from "./BankTransaction";
import FinancialPeriod, {init as initFinancialPeriod} from './FinancialPeriod';
import AccountFinancialPeriod, {init as initAccountFinancialPeriod} from './AccountFinancialPeriod';
import Mutation, {init as initMutation} from "./Mutation";
import Transaction, {init as initTransaction} from "./Transaction";
import User, {init as initUser} from "./User";

export default (async () => {
    const sequelize = new Sequelize('postgres', 'postgres', 'accountant', {
        host: 'db',
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
    initUser(sequelize);

    Account.hasMany(AccountFinancialPeriod);
    AccountFinancialPeriod.belongsTo(Account);

    Account.hasMany(Mutation);
    Mutation.belongsTo(Account);

    FinancialPeriod.hasMany(AccountFinancialPeriod);
    AccountFinancialPeriod.belongsTo(FinancialPeriod);

    Transaction.hasOne(BankTransaction);
    BankTransaction.belongsTo(Transaction);

    Transaction.hasMany(Mutation);
    Mutation.belongsTo(Transaction);

    sequelize.sync();

    return {
        sequelize,
        Account,
        BankTransaction,
        FinancialPeriod,
        AccountFinancialPeriod,
        Mutation,
        Transaction,
        User,
    };
})();