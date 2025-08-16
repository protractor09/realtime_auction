module.exports = (sequelize, DataTypes) => {
  const Auction = sequelize.define('Auction', {
    itemName: DataTypes.STRING,
    description: DataTypes.TEXT,
    startingPrice: DataTypes.FLOAT,
    bidIncrement: DataTypes.FLOAT,
    goLiveAt: DataTypes.DATE,
    durationMinutes: DataTypes.INTEGER,
    status: { type: DataTypes.STRING, defaultValue: 'pending' }, // pending, live, ended, closed
    sellerId: DataTypes.INTEGER,
    highestBidId: DataTypes.INTEGER,
  });
  return Auction;
};