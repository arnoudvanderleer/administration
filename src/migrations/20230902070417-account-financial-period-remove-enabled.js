'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.removeColumn("AccountFinancialPeriods", "enabled");
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.addColumn("AccountFinancialPeriods", "enabled", Sequelize.BOOLEAN);
  }
};
