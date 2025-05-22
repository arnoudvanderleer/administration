'use strict';

async function change_transaction_descriptions(queryInterface, data_type) {
    const transaction = await queryInterface.sequelize.transaction();

    const columns = ['Transactions', 'PlannedTransactions'];

    await Promise.all(
      columns.map(column => queryInterface.changeColumn(
        column,
        'description', 
        data_type,
        { transaction, }
      ),
    ));

    await transaction.commit();
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    change_transaction_descriptions(queryInterface, Sequelize.TEXT);
  },

  async down (queryInterface, Sequelize) {
    change_transaction_descriptions(queryInterface, Sequelize.STRING);
  }
};