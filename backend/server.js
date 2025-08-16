const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const { sequelize } = require('./models');
const redis = require('./utils/redis');
const auctionRoutes = require('./routes/auction');
const bidRoutes = require('./routes/bid');
const notificationRoutes = require('./routes/notification');
const uuid = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: "*", // allow all origins for dev
    methods: ["GET", "POST"],
    credentials: false
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Setup middleware and routes
app.set('io', io);
app.use(express.json());
app.use('/api/auction', auctionRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/notifications', notificationRoutes);


// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected', socket.id);

  // New event listener to join a specific auction room
  socket.on('joinAuction', (auctionId) => {
    socket.join(`auction_${auctionId}`);
    console.log(`User ${socket.id} joined auction room: auction_${auctionId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('A user disconnected', socket.id);
  });
});

// Root route now serves the static HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Debug route
app.get('/redis-debug', async (req, res) => {
  try {
    const { client: redis } = require('./utils/redis');
    if (!redis.isOpen) await redis.connect();
    const keys = await redis.keys('*');
    const result = {};
    for (const key of keys) {
      result[key] = await redis.get(key);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;



sequelize.sync().then(() => {
  server.listen(PORT, () => console.log(`Server running on ${PORT}`));
});