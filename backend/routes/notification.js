const express = require('express');
const { Notification } = require('../models');
const router = express.Router();

router.get('/:userId', async (req, res) => {
  const notifications = await Notification.findAll({ where: { userId: req.params.userId } });
  res.json(notifications);
});

module.exports = router;  