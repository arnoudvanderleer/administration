import { Sequelize, DataTypes, Model, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BelongsToCreateAssociationMixin } from 'sequelize';
import Transaction from './Transaction';

export default class BankTransaction extends Model {
    declare getTransaction: BelongsToGetAssociationMixin<Transaction>;
    declare setTransaction: BelongsToSetAssociationMixin<Transaction, number>;
    declare createTransaction: BelongsToCreateAssociationMixin<Transaction>;

    declare id: number;
    declare bank_transaction_id: string;
    declare this_account: string;
    declare other_account: string;
    declare other_account_name: string;
    declare is_credit: boolean;
};

export function init(sequelize: Sequelize) {
    BankTransaction.init({
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
        },
        bank_transaction_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        this_account: DataTypes.STRING,
        other_account: DataTypes.STRING,
        other_account_name: DataTypes.STRING,
        is_credit: DataTypes.BOOLEAN,
    }, {sequelize});
}