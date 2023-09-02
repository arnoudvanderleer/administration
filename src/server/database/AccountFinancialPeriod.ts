import { BelongsToCreateAssociationMixin, BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, DataTypes, Model, Sequelize } from "sequelize"
import Account from "./Account";
import FinancialPeriod from "./FinancialPeriod";

export default class AccountFinancialPeriod extends Model {
    declare id: number;
    declare enabled: boolean;
    declare start_amount: number;
    declare budget: number;

    declare getAccount: BelongsToGetAssociationMixin<Account>;
    declare setAccount: BelongsToSetAssociationMixin<Account, number>;
    declare createAccount: BelongsToCreateAssociationMixin<Account>;

    declare getFinancialPeriod: BelongsToGetAssociationMixin<FinancialPeriod>;
    declare setFinancialPeriod: BelongsToSetAssociationMixin<FinancialPeriod, number>;
    declare createFinancialPeriod: BelongsToCreateAssociationMixin<FinancialPeriod>;
}

export function init(sequelize: Sequelize) {
    AccountFinancialPeriod.init({
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
        },
        enabled: DataTypes.BOOLEAN,
        start_amount: {
            type: DataTypes.DECIMAL,
        },
        budget: DataTypes.DECIMAL,
    }, {sequelize});
}