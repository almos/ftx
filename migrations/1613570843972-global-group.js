const mongoose = require('mongoose');
require('../models');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();

const Group = mongoose.model('Group');

const _ = require('lodash');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  await mongoConnect;
  await Group.insertMany([{ title: 'FTX wide', type: 'ft-global', private: false }]);
  await Group.insertMany([{ title: 'Organization wide', type: 'org-global', private: false }]);
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  // Write migration here
}

module.exports = { up, down };
