import { Sequelize, DataTypes, Model, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BelongsToCreateAssociationMixin } from 'sequelize';
import Account from './Account';
import Transaction from './Transaction';

export default class Mutation extends Model {
    declare getAccount: BelongsToGetAssociationMixin<Account>;
    declare setAccount: BelongsToSetAssociationMixin<Account, number>;
    declare createAccount: BelongsToCreateAssociationMixin<Account>;

    declare getTransaction: BelongsToGetAssociationMixin<Transaction>;
    declare setTransaction: BelongsToSetAssociationMixin<Transaction, number>;
    declare createTransaction: BelongsToCreateAssociationMixin<Transaction>;
};

export function init(sequelize: Sequelize) {
    Mutation.init({
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },
        amount: {
            type: DataTypes.DECIMAL,
            allowNull: false,
        },
    }, {sequelize});
}