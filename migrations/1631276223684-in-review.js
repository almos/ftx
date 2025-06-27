const mongoose = require('mongoose');
require('../models');
const _ = require('lodash');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();
let Pitch = mongoose.model('Pitch');
let PitchReviewQueue = mongoose.model('PitchReviewQueue');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  // Write migration here
  try {
    await mongoConnect;
    const pitches = await PitchReviewQueue.find();
    _.forEach(pitches, async (item) => {
      await Pitch.updateOne({ _id: item.pitchId }, { inReview: true });
    });
  } catch (error) {
    console.log('error in review migration', error.message, error.stack);
    throw error;
  }
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {}

module.exports = { up, down };
