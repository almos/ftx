const mongoose = require('mongoose');
require('../models');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();

const Pitch = mongoose.model('Pitch');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  await mongoConnect;
  await Pitch.update(
    { video: { $ne: null } },
    { $set: { reviewed: true } },
    { multi: true },
  ).then(() => {});
  await Pitch.update(
    { 'brightcove.ingestId': null },
    { $set: { reviewed: false } },
    { multi: true },
  ).then(() => {});
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {}

module.exports = { up, down };
