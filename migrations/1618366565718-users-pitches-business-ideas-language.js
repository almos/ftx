const mongoose = require('mongoose');
require('../models');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();

const User = mongoose.model('User');
const Pitch = mongoose.model('Pitch');
const BusinessIdea = mongoose.model('BusinessIdea');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  await mongoConnect;
  await User.update({}, { $set: { language: 'en' } }, { multi: true }).then(() => {});
  await Pitch.update({}, { $set: { language: 'en' } }, { multi: true }).then(() => {});
  await BusinessIdea.update({}, { $set: { language: 'en' } }, { multi: true }).then(() => {});
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  // Write migration here
}

module.exports = { up, down };
