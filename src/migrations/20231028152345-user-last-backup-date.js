'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    queryInterface.addColumn("Users", "last_backup", Sequelize.DATE);
  },

  async down (queryInterface, Sequelize) {
    queryInterface.removeColumn("Users", "last_backup");
  }
};
