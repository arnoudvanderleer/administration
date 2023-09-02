'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.addColumn("BankTransactions", "is_debit", {type: DataTypes.BOOLEAN});
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.removeColumn("BankTransactions", "is_debit");
  }
};
