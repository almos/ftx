const mongoose = require('mongoose');
require('../models');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();

const Group = mongoose.model('Group');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  await mongoConnect;
  await Group.update({}, { $set: { limitReviewers: false } }, { multi: true }).then(() => {});
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  // Write migration here
}

module.exports = { up, down };
