const RateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const config = require('../index');
const redis = require('./redis');

/**
 *  Request rate limiter
 */
let requestRateLimiter = null;

if (config.isRedisEnabled()) {
  requestRateLimiter = new RateLimit({
    store: new RedisStore({
      client: redis.client,
    }),
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many requests',
    statusCode: 429,
  });
} else {
  requestRateLimiter = RateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many requests',
    statusCode: 429,
  });
}

module.exports = {
  requestRateLimiter: requestRateLimiter,
};
