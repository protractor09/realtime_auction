const { Redis } = require('@upstash/redis')

const client = new Redis({
  url: 'https://loving-eel-47996.upstash.io',
  token: 'Abt8AAIncDFlMDU4ODVkYTgzNDg0NWZmODJjM2UzOWU4MjMzNDM1YXAxNDc5OTY',
})

module.exports = { client };

// client.on('error', err => console.log('Redis Client Error', err));


async function connectRedis() {
    try {
        await client.connect();
    }catch (err) {
        console.error('Error connecting to Redis:', err);
    }
}

 module.exports = {client};

