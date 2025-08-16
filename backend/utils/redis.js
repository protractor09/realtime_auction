const {createClient} = require('redis')

const client = createClient({
    username: 'default',
    password: 'HpKaWExXH0I4XL2YJ7Bfws99kfwqJftf',
    socket: {
        host: 'redis-19102.crce179.ap-south-1-1.ec2.redns.redis-cloud.com',
        port: 19102
    }
});


client.on('error', err => console.log('Redis Client Error', err));


async function connectRedis() {
    try {
        await client.connect();
    }catch (err) {
        console.error('Error connecting to Redis:', err);
    }
}

 module.exports = {client};

