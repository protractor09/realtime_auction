module.exports = (sequelize, DataTypes) => {
  const Bid = sequelize.define('Bid', {
    amount: DataTypes.FLOAT,
    userId: DataTypes.INTEGER,
    auctionId: DataTypes.INTEGER,
    status: { type: DataTypes.STRING, defaultValue: 'active' }, // active, outbid, accepted, rejected
  });
  return Bid;
};