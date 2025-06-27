const mongoose = require('mongoose');
require('../models');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();

const Pitch = mongoose.model('Pitch');
const BusinessIdea = mongoose.model('BusinessIdea');

const _ = require('lodash');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  await mongoConnect;
  await Pitch.updateMany({ visible_tenants: null }, { visible_tenants: ['global'] });
  await BusinessIdea.updateMany({ visible_tenants: null }, { visible_tenants: ['global'] });
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  // Write migration here
}

module.exports = { up, down };
