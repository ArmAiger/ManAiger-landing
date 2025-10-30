module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('users');
    
    const columnsToAdd = [];
    
    // Check if we need to add avatar field
    if (!tableInfo.avatar) {
      columnsToAdd.push(['avatar', {
        type: Sequelize.STRING,
        allowNull: true
      }]);
    }
    
    // Check if we need to add isGoogleAuth field
    if (!tableInfo.is_google_auth) {
      columnsToAdd.push(['is_google_auth', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }]);
    }
    
    // Add columns that don't exist
    for (const [columnName, columnDefinition] of columnsToAdd) {
      await queryInterface.addColumn('users', columnName, columnDefinition);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the columns we added
    const tableInfo = await queryInterface.describeTable('users');
    
    if (tableInfo.avatar) {
      await queryInterface.removeColumn('users', 'avatar');
    }
    
    if (tableInfo.is_google_auth) {
      await queryInterface.removeColumn('users', 'is_google_auth');
    }
  }
};
