'use strict';

import { DataTypes, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyCreateAssociationMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin, Model, Sequelize } from "sequelize";
import PlannedMutation from "./PlannedMutation";

export default class PlannedTransaction extends Model {
    declare id: number;
    declare description: string;
    declare nextDate: Date;
    declare period: number;
    declare periodUnit: string;

    declare getPlannedMutations: HasManyGetAssociationsMixin<PlannedMutation>;
    declare countPlannedMutations: HasManyCountAssociationsMixin;
    declare hasPlannedMutation: HasManyHasAssociationMixin<PlannedMutation, number>;
    declare hasPlannedMutations: HasManyHasAssociationsMixin<PlannedMutation, number>;
    declare setPlannedMutations: HasManySetAssociationsMixin<PlannedMutation, number>;
    declare addPlannedMutation: HasManyAddAssociationMixin<PlannedMutation, number>;
    declare addPlannedMutations: HasManyAddAssociationsMixin<PlannedMutation, number>;
    declare removePlannedMutation: HasManyRemoveAssociationMixin<PlannedMutation, number>;
    declare removePlannedMutations: HasManyRemoveAssociationsMixin<PlannedMutation, number>;
    declare createPlannedMutation: HasManyCreateAssociationMixin<PlannedMutation, "TransactionId">;
}

export function init(sequelize: Sequelize) {
    PlannedTransaction.init({
        description: DataTypes.TEXT,
        nextDate: DataTypes.DATE,
        period: DataTypes.INTEGER,
        periodUnit: DataTypes.ENUM('day', 'week', 'month'),
    }, {sequelize});
}