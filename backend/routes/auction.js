const express = require('express');
const { Auction } = require('../models');
const router = express.Router();

console.log('Auction routes loaded');

let auctions= [];


router.post('/auction', async (req, res) => {
  // Set status to 'live' instead of 'pending'
  const auction = await Auction.create({ ...req.body, status: 'live' });
  auctions.push(auction);
  console.log('Auction created:', auction);
  res.json(auction);
});

router.get('/auction', async (req, res) => {
  const auctions = await Auction.findAll();
  res.json(auctions);
});



module.exports = router;

