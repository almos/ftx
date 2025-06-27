const redis = require('redis');
const logger = require('../../services/logger').instance;
const config = require('../../config');

let redisClient;

if (config.isRedisEnabled()) {
  redisClient = redis.createClient(config.getRedisUri());

  redisClient.on('error', function (error) {
    logger.error(`Error while connecting to Redis. Error: ${error.message}`);
  });
}

module.exports = {
  client: redisClient,
};
