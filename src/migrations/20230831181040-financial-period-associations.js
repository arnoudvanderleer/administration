'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn(
      'AccountFinancialPeriods',
      'FinancialPeriodId',
      {
        type: Sequelize.INTEGER,
        references: {
          model: 'FinancialPeriods',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    );
    await queryInterface.addColumn(
      'AccountFinancialPeriods',
      'AccountId',
      {
        type: Sequelize.INTEGER,
        references: {
          model: 'Accounts',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }
    );
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('AccountFinancialPeriods', 'FinancialPeriodId');
    await queryInterface.removeColumn('AccountFinancialPeriods', 'AccountId');
  }
};
