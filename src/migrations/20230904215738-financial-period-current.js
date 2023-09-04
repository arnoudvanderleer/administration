'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    queryInterface.addColumn("FinancialPeriods", "current", Sequelize.BOOLEAN);
  },

  async down (queryInterface, Sequelize) {
    queryInterface.removeColumn("FinancialPeriods", "current");
  }
};
