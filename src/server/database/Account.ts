import { Sequelize, DataTypes, Model, HasManyGetAssociationsMixin, HasManyCountAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManySetAssociationsMixin, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManyCreateAssociationMixin, QueryTypes } from 'sequelize';
import Mutation from './Mutation';
import AccountFinancialPeriod from './AccountFinancialPeriod';

export default class Account extends Model {
    declare id: number; // An auto increment primary key
    declare number: number; // The account number as shown to the user
    declare name: string;

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

    static overview(period_id: number, date: string) : Promise<{id: number, number: number, name: string, is_bank: boolean, budget: string, amount: string}[]> | undefined {
        let query =
            `WITH mutation_data AS (
                SELECT
                    M."AccountId",
                    M.amount
                FROM
                    "Mutations" AS M
                    JOIN "Transactions" AS T ON M."TransactionId" = T.id
                    JOIN "FinancialPeriods" AS FP ON FP.id = $period_id
                WHERE
                    T.date BETWEEN FP.start_date AND FP.end_date
                    AND T.date < $date
                    AND T.complete = TRUE
            )
            SELECT
                A.id,
                A.number,
                A.name,
                A.is_bank,
                AFP.budget,
                AFP.start_amount + SUM(COALESCE(M.amount, 0)) AS amount
            FROM
                "Accounts" AS A
                JOIN "AccountFinancialPeriods" AS AFP ON AFP."AccountId" = A.id
                    AND AFP."FinancialPeriodId" = $period_id
                LEFT JOIN mutation_data M ON M."AccountId" = A.id
            GROUP BY
                A.id,
                AFP.id
            ORDER BY
                A.number ASC;`;

        return Account.sequelize?.query(query, {
            bind: {
                date,
                period_id,
            },
            type: QueryTypes.SELECT,
        });
    }
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