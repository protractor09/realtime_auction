const express = require('express');
const http = require('http');
const socketio = require('socket.io');
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

// Attach io to app for use in routes (important for bid notifications)
app.set('io', io);

app.use(express.json());
app.use('/api/auction', auctionRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/notifications', notificationRoutes);


// server.js
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

app.get('/test', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Auction Test</title>
      <meta charset="utf-8"/>
      <style>
        body { font-family: Arial, sans-serif; background: #fff; color: #222; }
        .container { max-width: 900px; margin: 40px auto; border: 1px solid #e53935; border-radius: 8px; padding: 24px; }
        .row { display: flex; gap: 32px; }
        .left, .right { flex: 1; }
        .highest { background: #ffeaea; border: 1px solid #e53935; border-radius: 8px; padding: 16px; margin-bottom: 16px; text-align: center; }
        .label { color: #e53935; font-weight: bold; }
        .bid-history { margin-top: 16px; }
        .bid-history li { margin-bottom: 4px; }
        .error { color: #e53935; }
        .success { color: #388e3c; }
        input[type="number"], input[type="text"], textarea, input[type="datetime-local"] { padding: 6px; border: 1px solid #e53935; border-radius: 4px; }
        button { background: #e53935; color: #fff; border: none; border-radius: 4px; padding: 8px 18px; font-weight: bold; cursor: pointer; }
        button:disabled { opacity: 0.6; }
        .add-auction-form { margin-bottom: 32px; border: 1px solid #e53935; border-radius: 8px; padding: 16px; background: #fff8f8; }
        .add-auction-form input, .add-auction-form textarea { margin-bottom: 8px; width: 100%; }
        .auction-list { margin-bottom: 24px; }
        .auction-list button { margin-right: 8px; margin-bottom: 8px; }
        .timer { font-weight: bold; color: #e53935; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2 class="label">Auction Test Page</h2>
        <form class="add-auction-form" id="addAuctionForm">
          <div class="label" style="margin-bottom:8px;">Add Auction</div>
          <input type="text" name="itemName" placeholder="Item Name" required /><br/>
          <textarea name="description" placeholder="Description" required></textarea><br/>
          <input type="number" name="startingPrice" placeholder="Starting Price" required /><br/>
          <input type="number" name="bidIncrement" placeholder="Bid Increment" required /><br/>
          <input type="datetime-local" name="goLiveAt" placeholder="Go Live At" /><br/>
          <input type="number" name="durationMinutes" placeholder="Duration (minutes)" required /><br/>
          <input type="number" name="sellerId" placeholder="Seller ID" required /><br/>
          <button type="submit">Add Auction</button>
          <span id="addAuctionMsg"></span>
        </form>
        <div class="auction-list" id="auctionList"></div>
        <div class="row">
          <div class="left">
            <h3 id="itemName"></h3>
            <div id="description"></div>
            <div class="bid-history">
              <div class="label">Bid History</div>
              <ul id="bidHistory"></ul>
            </div>
            <div class="timer" id="timer"></div>
          </div>
          <div class="right">
            <div class="highest">
              <div class="label">Current Highest Bid</div>
              <div id="highestBid" style="font-size:2em; margin:8px 0;">₹0</div>
              <div id="highestBidUser" style="font-size:0.9em; color:#888;"></div>
            </div>
            <form id="bidForm">
              <div class="label">Place a Bid</div>
              <input type="number" id="bidInput" min="1" required placeholder="Enter your bid"/><br/><br/>
              <input type="text" id="userInput" required placeholder="User ID" readonly style="background:#f5f5f5;"/><br/><br/>
              <button type="submit">Place Bid</button>
            </form>
            <div id="msg"></div>
          </div>
        </div>
      </div>
      <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/uuid@9.0.0/dist/umd/uuidv4.min.js"></script>
      <script>
        // --- User ID logic using uuid ---
        function getOrCreateUserId() {
          let uid = localStorage.getItem('auction_user_id');
          if (!uid) {
            // Use uuidv4 from CDN
            uid = uuidv4();
            localStorage.setItem('auction_user_id', uid);
          }
          return uid;
        }
        const userId = getOrCreateUserId();
        document.addEventListener('DOMContentLoaded', () => {
          document.getElementById('userInput').value = userId;
        });

        let auctions = [];
        let selectedAuction = null;
        let highest = 0;
        let bidIncrement = 1;
        let highestBidUser = "";
        let socket;
        let timerInterval = null;

        async function fetchAuctionsAndRender(selectLatest = false) {
          const res = await fetch('/api/auction/auction');
          auctions = await res.json();
          renderAuctionList();
          if (auctions.length > 0) {
            if (selectLatest || !selectedAuction) {
              selectAuction(auctions[auctions.length - 1].id);
            } else {
              const found = auctions.find(a => a.id === selectedAuction.id);
              if (found) selectAuction(found.id, true);
            }
          } else {
            clearAuctionDisplay();
          }
        }

        function renderAuctionList() {
          const listDiv = document.getElementById('auctionList');
          listDiv.innerHTML = '<div class="label">Available Auctions:</div>' +
            auctions.map(a =>
              \`<button onclick="selectAuction(\${a.id})" \${selectedAuction && selectedAuction.id === a.id ? 'style="background:#ffeaea;"' : ''}>
                \${a.itemName}
              </button>\`
            ).join('');
        }

        window.selectAuction = async function(id, keepBid = false) {
          selectedAuction = auctions.find(a => a.id === id);
          if (!selectedAuction) return;
          document.getElementById('itemName').textContent = selectedAuction.itemName;
          document.getElementById('description').textContent = selectedAuction.description;
          // Fetch highest bid and user from Redis
          try {
            const redisRes = await fetch('/redis-debug');
            const redisData = await redisRes.json();
            highest = selectedAuction.startingPrice || 0;
            bidIncrement = selectedAuction.bidIncrement || 1;
            const highestBidKey = \`auction:\${selectedAuction.id}:highestBid\`;
            const highestBidUserKey = \`auction:\${selectedAuction.id}:highestBidUser\`;
            if (redisData[highestBidKey]) highest = parseFloat(redisData[highestBidKey]);
            highestBidUser = redisData[highestBidUserKey] || "";
          } catch {
            highest = selectedAuction.startingPrice || 0;
            highestBidUser = "";
          }
          document.getElementById('highestBid').textContent = '₹' + highest;
          document.getElementById('highestBidUser').textContent = highestBidUser ? "Highest Bidder: " + highestBidUser : "";
          document.getElementById('bidInput').min = highest + bidIncrement;
          document.getElementById('bidHistory').innerHTML = '<li>₹' + highest + '</li>';
          if (!keepBid) document.getElementById('bidInput').value = '';
          setupSocket();
          startTimer();
        };

        function clearAuctionDisplay() {
          selectedAuction = null;
          document.getElementById('itemName').textContent = '';
          document.getElementById('description').textContent = '';
          document.getElementById('highestBid').textContent = '₹0';
          document.getElementById('bidHistory').innerHTML = '';
          document.getElementById('timer').textContent = '';
          document.getElementById('highestBidUser').textContent = '';
        }

        function startTimer() {
          if (timerInterval) clearInterval(timerInterval);
          if (!selectedAuction) {
            document.getElementById('timer').textContent = '';
            return;
          }
          function updateTimer() {
            const goLive = selectedAuction.goLiveAt ? new Date(selectedAuction.goLiveAt).getTime() : Date.now();
            const end = goLive + (selectedAuction.durationMinutes || 0) * 60 * 1000;
            const now = Date.now();
            const diff = end - now;
            if (diff <= 0) {
              document.getElementById('timer').textContent = "Auction ended";
            } else {
              const min = Math.floor(diff / 60000);
              const sec = Math.floor((diff % 60000) / 1000);
              document.getElementById('timer').textContent = "Time left: " + min + "m " + (sec < 10 ? "0" : "") + sec + "s";
            }
          }
          updateTimer();
          timerInterval = setInterval(updateTimer, 1000);
        }

        function setupSocket() {
          if (socket) socket.disconnect();
          socket = io();
          if (selectedAuction) socket.emit('joinAuction', selectedAuction.id);
          socket.on('newBid', data => {
            highest = data.amount;
            highestBidUser = data.userId;
            document.getElementById('highestBid').textContent = '₹' + highest;
            document.getElementById('highestBidUser').textContent = highestBidUser ? "Highest Bidder: " + highestBidUser : "";
            document.getElementById('bidInput').min = highest + bidIncrement;
            document.getElementById('msg').innerHTML = '<span class="success">New bid: ₹'+data.amount+' by user '+data.userId+'</span>';
            document.getElementById('bidHistory').innerHTML = '<li>₹' + highest + '</li>';
          });
        }

        document.getElementById('bidForm').onsubmit = async function(e) {
          e.preventDefault();
          document.getElementById('msg').textContent = '';
          if (!selectedAuction) {
            document.getElementById('msg').innerHTML = '<span class="error">No auction selected</span>';
            return;
          }
          const amount = parseFloat(document.getElementById('bidInput').value);
          // Use the persistent userId
          if (!userId) {
            document.getElementById('msg').innerHTML = '<span class="error">User ID required</span>';
            return;
          }
          const res = await fetch('/api/bids/auction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auctionId: selectedAuction.id, userId, amount })
          });
          if (res.ok) {
            document.getElementById('msg').innerHTML = '<span class="success">Bid placed!</span>';
            document.getElementById('bidInput').value = '';
            fetchAuctionsAndRender();
          } else {
            const err = await res.json();
            document.getElementById('msg').innerHTML = '<span class="error">' + (err.error || 'Bid failed') + '</span>';
          }
        };

        document.getElementById('addAuctionForm').onsubmit = async function(e) {
          e.preventDefault();
          document.getElementById('addAuctionMsg').textContent = '';
          const form = e.target;
          const data = {
            itemName: form.itemName.value,
            description: form.description.value,
            startingPrice: parseFloat(form.startingPrice.value),
            bidIncrement: parseFloat(form.bidIncrement.value),
            goLiveAt: form.goLiveAt.value ? new Date(form.goLiveAt.value) : null,
            durationMinutes: parseInt(form.durationMinutes.value),
            sellerId: parseInt(form.sellerId.value)
          };
          const res = await fetch('/api/auction/auction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          if (res.ok) {
            document.getElementById('addAuctionMsg').innerHTML = '<span class="success">Auction added!</span>';
            form.reset();
            await fetchAuctionsAndRender(true); // select the new auction and show timer
          } else {
            const err = await res.json();
            document.getElementById('addAuctionMsg').innerHTML = '<span class="error">' + (err.error || 'Failed to add auction') + '</span>';
          }
        };

        // Poll for new auctions every 5s
        setInterval(() => fetchAuctionsAndRender(), 5000);

        fetchAuctionsAndRender();
      </script>
    </body>
    </html>
  `);
});

// Add this route for debugging Redis keys and values
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