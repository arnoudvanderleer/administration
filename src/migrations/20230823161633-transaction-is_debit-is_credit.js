'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    queryInterface.renameColumn("BankTransactions", "is_debit", "is_credit");
  },

  async down (queryInterface, Sequelize) {
    queryInterface.renameColumn("BankTransactions", "is_credit", "is_debit");
  }
};
