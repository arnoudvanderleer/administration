'use strict';

import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BelongsToCreateAssociationMixin, Transaction, Sequelize, DataTypes, Model } from "sequelize";
import Account from "./Account";
import PlannedTransaction from "./PlannedTransaction";

export default class PlannedMutation extends Model {
    declare id: number;
    declare amount: number;
    declare AccountId: number;

    declare getAccount: BelongsToGetAssociationMixin<Account>;
    declare setAccount: BelongsToSetAssociationMixin<Account, number>;
    declare createAccount: BelongsToCreateAssociationMixin<Account>;

    declare getPlannedTransaction: BelongsToGetAssociationMixin<PlannedTransaction>;
    declare setPlannedTransaction: BelongsToSetAssociationMixin<PlannedTransaction, number>;
    declare createPlannedTransaction: BelongsToCreateAssociationMixin<PlannedTransaction>;
};

export function init(sequelize: Sequelize) {
    PlannedMutation.init({
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
