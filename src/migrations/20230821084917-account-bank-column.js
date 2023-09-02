'use strict';

const { DataTypes } = require('sequelize');

module.exports = {
  async up (queryInterface, Sequelize) {
    queryInterface.addColumn("Accounts", "is_bank", {type: DataTypes.BOOLEAN});
  },

  async down (queryInterface, Sequelize) {
    queryInterface.removeColumn("Accounts", "is_bank");
  }
};
