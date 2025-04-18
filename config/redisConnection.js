// config/redis.js
const Redis = require('ioredis');

console.log("🔍 REDIS_URL:", process.env.REDIS_URL);

const connection = new Redis("redis://cronmicroservice-imqdd1.serverless.usw2.cache.amazonaws.com:6379", {
  maxRetriesPerRequest: null, // 🔥 Required by BullMQ
  tls: {}, // ✅ Enable TLS for ElastiCache Serverless
});

module.exports = connection;