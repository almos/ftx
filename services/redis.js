const redisBean = require('../config/beans/redis');

const logger = require('../services/logger').instance;
const config = require('../config');
const crypto = require('crypto');
const moment = require('moment');

function md5(payload) {
  return crypto.createHash('md5').update(payload).digest('hex');
}

function cacheAuthToken(fbRawToken, fbDecodedToken) {
  return new Promise((resolve, reject) => {
    if (fbDecodedToken.__cached) {
      resolve();
      return;
    }

    // no op if redis is not available
    if (!redisBean.client) {
      resolve();
      return;
    }

    let key = md5(fbRawToken),
      now = moment().unix(),
      exp = fbDecodedToken.exp,
      ttl = exp - now;

    // no op if token is expired
    if (now >= exp) {
      resolve();
      return;
    }

    redisBean.client.setex(key, ttl, JSON.stringify(fbDecodedToken), function (err, res) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function getCachedToken(fbRawToken) {
  return new Promise((resolve, reject) => {
    if (!redisBean.client) {
      resolve(null);
      return;
    }

    let key = md5(fbRawToken);
    redisBean.client.get(key, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data ? Object.assign(JSON.parse(data), { __cached: true }) : null);
      }
    });
  });
}

module.exports = {
  cacheAuthToken: cacheAuthToken,
  getCachedToken: getCachedToken,
};
