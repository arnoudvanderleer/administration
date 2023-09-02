import { Sequelize, DataTypes, Model, HasManyGetAssociationsMixin, HasManyCreateAssociationMixin, HasManyCountAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManySetAssociationsMixin, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasOneCreateAssociationMixin, HasOneSetAssociationMixin, HasOneGetAssociationMixin } from 'sequelize';

import Mutation from './Mutation';
import BankTransaction from './BankTransaction';

export default class Transaction extends Model {
    declare id: number;
    declare description: string;
    declare date: Date;
    declare complete: boolean;

    declare getMutations: HasManyGetAssociationsMixin<Mutation>;
    declare countMutations: HasManyCountAssociationsMixin;
    declare hasMutation: HasManyHasAssociationMixin<Mutation, number>;
    declare hasMutations: HasManyHasAssociationsMixin<Mutation, number>;
    declare setMutations: HasManySetAssociationsMixin<Mutation, number>;
    declare addMutation: HasManyAddAssociationMixin<Mutation, number>;
    declare addMutations: HasManyAddAssociationsMixin<Mutation, number>;
    declare removeMutation: HasManyRemoveAssociationMixin<Mutation, number>;
    declare removeMutations: HasManyRemoveAssociationsMixin<Mutation, number>;
    declare createMutation: HasManyCreateAssociationMixin<Mutation, "TransactionId">;

    declare getBankTransaction: HasOneGetAssociationMixin<BankTransaction>;
    declare createBankTransaction: HasOneCreateAssociationMixin<BankTransaction>;
    declare setBankTransaction: HasOneSetAssociationMixin<BankTransaction, number>;
};

export function init(sequelize: Sequelize) {
    Transaction.init({
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
        },
        description: DataTypes.STRING,
        date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        complete: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    }, {sequelize});
}