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
  await Pitch.find({}, '+reviews').then((pitches) => {
    pitches.forEach((pitch) => {
      let pitchReviewCount = pitch.reviews ? pitch.reviews.length : 0;
      Pitch.update({ _id: pitch.id }, { $set: { reviewsCount: pitchReviewCount } }).then(() => {});
    });
  });
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {}

module.exports = { up, down };
