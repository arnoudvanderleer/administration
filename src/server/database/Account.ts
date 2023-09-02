import { Sequelize, DataTypes, Model, HasManyGetAssociationsMixin, HasManyCountAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManySetAssociationsMixin, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManyCreateAssociationMixin } from 'sequelize';
import Mutation from './Mutation';
import AccountFinancialPeriod from './AccountFinancialPeriod';

export default class Account extends Model {
    declare id: number; // An auto increment primary key
    declare number: number; // The account number as shown to the user
    declare name: string;

    declare getFinancialPeriods: HasManyGetAssociationsMixin<AccountFinancialPeriod>;
    declare countFinancialPeriods: HasManyCountAssociationsMixin;
    declare hasFinancialPeriod: HasManyHasAssociationMixin<AccountFinancialPeriod, number>;
    declare hasFinancialPeriods: HasManyHasAssociationsMixin<AccountFinancialPeriod, number>;
    declare setFinancialPeriods: HasManySetAssociationsMixin<AccountFinancialPeriod, number>;
    declare addFinancialPeriod: HasManyAddAssociationMixin<AccountFinancialPeriod, number>;
    declare addFinancialPeriods: HasManyAddAssociationsMixin<AccountFinancialPeriod, number>;
    declare removeFinancialPeriod: HasManyRemoveAssociationMixin<AccountFinancialPeriod, number>;
    declare removeFinancialPeriods: HasManyRemoveAssociationsMixin<AccountFinancialPeriod, number>;
    declare createFinancialPeriod: HasManyCreateAssociationMixin<AccountFinancialPeriod>;

    declare getMutations: HasManyGetAssociationsMixin<Mutation>;
    declare countMutations: HasManyCountAssociationsMixin;
    declare hasMutation: HasManyHasAssociationMixin<Mutation, number>;
    declare hasMutations: HasManyHasAssociationsMixin<Mutation, number>;
    declare setMutations: HasManySetAssociationsMixin<Mutation, number>;
    declare addMutation: HasManyAddAssociationMixin<Mutation, number>;
    declare addMutations: HasManyAddAssociationsMixin<Mutation, number>;
    declare removeMutation: HasManyRemoveAssociationMixin<Mutation, number>;
    declare removeMutations: HasManyRemoveAssociationsMixin<Mutation, number>;
    declare createMutation: HasManyCreateAssociationMixin<Mutation>;
};

export function init(sequelize: Sequelize) {
    Account.init({
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
        },
        number: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        is_bank: DataTypes.BOOLEAN,
    }, {sequelize});
}