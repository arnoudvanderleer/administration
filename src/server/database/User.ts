import { Sequelize, DataTypes, Model } from 'sequelize';

export default class User extends Model {
    declare id: number;
    declare username: string;
    declare salt: string;
    declare password: string;
    declare last_backup: Date;
};

export function init(sequelize: Sequelize) {
    User.init({
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            autoIncrement: true,
            primaryKey: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        salt: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        last_backup : DataTypes.DATE,
    }, {sequelize});
}