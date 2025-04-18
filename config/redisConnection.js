// config/redis.js
const Redis = require('ioredis');

console.log("process.env.REDIS_URLprocess.env.REDIS_URL", process.env.REDIS_URL);
const connection = new Redis("rediss://cronmicroservice-imqdd1.serverless.usw2.cache.amazonaws.com:6379", {
  maxRetriesPerRequest: null, // 🔥 Required by BullMQ
});

module.exports = connection;