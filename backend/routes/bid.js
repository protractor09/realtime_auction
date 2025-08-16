const express = require('express');
const { Bid, Auction } = require('../models');
const { client: redis } = require('../utils/redis');
const router = express.Router();

router.post('/auction', async (req, res) => {
  try {

    // if (!redis.isOpen) await redis.connect();

    const { auctionId, userId, amount } = req.body;
    const auction = await Auction.findByPk(auctionId);
    if (!auction || auction.status !== 'live') return res.status(400).json({ error: 'Auction not live' });

    let highestBid = await redis.get(`auction:${auctionId}:highestBid`);
    let highestBidUser = await redis.get(`auction:${auctionId}:highestBidUser`);

    const minBid = Math.max(auction.startingPrice, highestBid ? parseFloat(highestBid) : 0) + auction.bidIncrement;
    if (amount < minBid) return res.status(400).json({ error: 'Bid too low' });

    const bid = await Bid.create({ auctionId, userId, amount });
    await redis.set(`auction:${auctionId}:highestBid`, amount.toString());
    await redis.set(`auction:${auctionId}:highestBidUser`, userId.toString());


    console.log(redis)


    // Notify via Socket.IO
    req.app.get('io').to(`auction_${auctionId}`).emit('newBid', { amount, userId });

    res.json(bid);
  } catch (err) {
    console.error('Bid error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;