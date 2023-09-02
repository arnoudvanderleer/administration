import { DataTypes, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin, Model, Sequelize } from "sequelize";
import AccountFinancialPeriod from "./AccountFinancialPeriod";

export default class FinancialPeriod extends Model {
    declare id: number;
    declare start_date: Date;
    declare end_date: Date;

    declare getAccounts: HasManyGetAssociationsMixin<AccountFinancialPeriod>;
    declare countAccounts: HasManyCountAssociationsMixin;
    declare hasAccount: HasManyHasAssociationMixin<AccountFinancialPeriod, number>;
    declare hasAccounts: HasManyHasAssociationsMixin<AccountFinancialPeriod, number>;
    declare setAccounts: HasManySetAssociationsMixin<AccountFinancialPeriod, number>;
    declare addAccount: HasManyAddAssociationMixin<AccountFinancialPeriod, number>;
    declare addAccounts: HasManyAddAssociationsMixin<AccountFinancialPeriod, number>;
    declare removeAccount: HasManyRemoveAssociationMixin<AccountFinancialPeriod, number>;
    declare removeAccounts: HasManyRemoveAssociationsMixin<AccountFinancialPeriod, number>;
    declare createAccount: HasManyCreateAssociationMixin<AccountFinancialPeriod>;
}

export function init(sequelize: Sequelize) {
    FinancialPeriod.init({
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
        },
        start_date: DataTypes.DATE,
        end_date: DataTypes.DATE,
    }, {sequelize});
}