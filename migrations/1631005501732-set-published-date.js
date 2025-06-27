const mongoose = require('mongoose');
require('../models');
const _ = require('lodash');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();
let Pitch = mongoose.model('Pitch');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  // Write migration here
  try {
    await mongoConnect;
    const pitches = await Pitch.find({ active: true, reviewed: true });
    _.forEach(pitches, async (pitch) => {
      await Pitch.updateOne({ _id: pitch.id }, { publishedDate: pitch.updatedAt });
    });
  } catch (error) {
    console.log('error publish date migration', error.message, error.stack);
    throw error;
  }
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {}

module.exports = { up, down };
