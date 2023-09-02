'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.addColumn(
      'AccountFinancialPeriods',
      'budget',
      Sequelize.DECIMAL,
   );
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.removeColumn('AccountFinancialPeriods', 'budget');
  }
};
