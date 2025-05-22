'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    await Promise.all([
      queryInterface.addColumn("Accounts", "iban", Sequelize.STRING),
      queryInterface.removeColumn("Accounts", "is_bank"),
    ]);

    await transaction.commit();
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    await Promise.all([
      queryInterface.addColumn("Accounts", "is_bank", Sequelize.BOOLEAN),
      queryInterface.removeColumn("Accounts", "iban"),
    ]);

    await transaction.commit();
  }
};
