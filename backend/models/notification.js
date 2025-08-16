module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define('Notification', {
    userId: DataTypes.INTEGER,
    message: DataTypes.STRING,
    read: { type: DataTypes.BOOLEAN, defaultValue: false },
  });
  return Notification;
};
