const Agenda = require('agenda');
const config = require('../../config');
const logger = require('../../services/logger').instance;

const jobs = {
  VIDEO_UPLOAD: 'videoUpload',
  PITCH_VIDEO_UPLOAD: 'pitchVideoUpload',
  EMAIL_SEND: 'emailSend',
  BRIGHTCOVE_WAIT_PROCESSED: 'brightcoveWaitProcessed',
  METRICS_COLLECT: 'metricsCollect',
};

/**
 * Connecting to MongoDB
 */
// let mongooseConnection = require('./mongoose').createConnection();
// let agenda = new Agenda().mongo(mongooseConnection, config.scheduler.collection);

let agenda = new Agenda({
  db: {
    address: config.mongo.getJobUri(),
    collection: config.scheduler.collection,
    options: { ssl: false, useNewUrlParser: true, useUnifiedTopology: true },
  },
});

async function connect() {
  return agenda;
}

function waitStart() {
  // Wait for agenda to connect. Should never fail since connection failures
  // should happen in the `await MongoClient.connect()` call.
  new Promise((resolve) => agenda.once('ready', resolve)).then(() => {
    logger.info('Agenda scheduling subsystem is ready');
  });

  return Promise.resolve();
}

function run(name, payload) {
  agenda.now(name, payload);
}

function define(name, callback) {
  agenda.define(name, callback);
}

function start() {
  agenda.start();
}

function every(when, id) {
  agenda.every(when, id);
}

module.exports = {
  jobs: jobs,
  connect: connect,
  waitStart: waitStart,
  run: run,
  define: define,
  start: start,
  every: every,
};
