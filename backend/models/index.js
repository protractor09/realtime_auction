const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// You can adjust the database config as needed
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '../auction.sqlite'),
  logging: false,
});

const Auction = require('./auction')(sequelize, DataTypes);
const Bid = require('./bid')(sequelize, DataTypes);
const Notification = require('./notification')
  ? require('./notification')(sequelize, DataTypes)
  : undefined;

// Setup associations if needed
// Example: Auction.hasMany(Bid); Bid.belongsTo(Auction);

module.exports = {
  sequelize,
  Auction,
  Bid,
  Notification,
};
