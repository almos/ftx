const config = require('../../config');
const logger = require('../../services/logger').instance;
const mongoose = require('mongoose');
require('../../models');

function connect() {
  setProperties(mongoose);
  let uri = config.mongo.getApiUri();

  return new Promise((resolve, reject) => {
    mongoose
      .connect(uri)
      .then(() => {
        logger.info(`Mongose connection has been established ${uri}`);
        resolve(mongoose);
      })
      .catch((error) => {
        logger.error(`Mongoose connection has failed. Error: ${error.message}`);
        reject(error);
      });
  });
}

function disconnect() {
  return new Promise((resolve, reject) => {
    mongoose
      .disconnect()
      .then(() => {
        logger.info('MongoDB disconnect has completed');
      })
      .catch((error) => {
        logger.error(`Error while disconnecting from MongoDB. Error: ${error.message}`);
      });
  });
}

function createConnection() {
  setProperties(mongoose);
  return mongoose.createConnection(config.mongo.getApiUri());
}

function setProperties(mongoose) {
  mongoose.set('debug', config.mongo.debug);
  mongoose.set('useFindAndModify', false);
  mongoose.set('useNewUrlParser', true);
}

/**
 * Connecting to MongoDB
 */
module.exports = {
  connect: connect,
  disconnect: disconnect,
  createConnection: createConnection,
};
