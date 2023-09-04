import { DataTypes, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin, Model, Sequelize } from "sequelize";
import AccountFinancialPeriod from "./AccountFinancialPeriod";

export default class FinancialPeriod extends Model {
    declare id: number;
    declare start_date: Date;
    declare end_date: Date;
    declare current: boolean;

    declare getAccountFinancialPeriods: HasManyGetAssociationsMixin<AccountFinancialPeriod>;
    declare countAccountFinancialPeriods: HasManyCountAssociationsMixin;
    declare hasAccountFinancialPeriod: HasManyHasAssociationMixin<AccountFinancialPeriod, number>;
    declare hasAccountFinancialPeriods: HasManyHasAssociationsMixin<AccountFinancialPeriod, number>;
    declare setAccountFinancialPeriods: HasManySetAssociationsMixin<AccountFinancialPeriod, number>;
    declare addAccountFinancialPeriod: HasManyAddAssociationMixin<AccountFinancialPeriod, number>;
    declare addAccountFinancialPeriods: HasManyAddAssociationsMixin<AccountFinancialPeriod, number>;
    declare removeAccountFinancialPeriod: HasManyRemoveAssociationMixin<AccountFinancialPeriod, number>;
    declare removeAccountFinancialPeriods: HasManyRemoveAssociationsMixin<AccountFinancialPeriod, number>;
    declare createAccountFinancialPeriod: HasManyCreateAssociationMixin<AccountFinancialPeriod>;
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
        current: DataTypes.BOOLEAN,
    }, {sequelize});
}