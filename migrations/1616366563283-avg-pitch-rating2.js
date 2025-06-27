const mongoose = require('mongoose');
require('../models');
/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();

const Pitch = mongoose.model('Pitch');
const _ = require('lodash');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  await mongoConnect;

  let r = {};

  // calculating average rating of the pitches
  await Pitch.find({}, '+reviews').then((pitches) => {
    pitches.forEach((pitch) => {
      let avgRateRaw = _.meanBy(pitch.reviews, function (o) {
        return o.avgRate;
      });

      let avgRate = isNaN(avgRateRaw) ? 0.0 : avgRateRaw;
      let avgRateRounded = parseFloat(_.round(avgRate, 2).toFixed(2));

      r[pitch.id] = avgRateRounded;
    });
  });

  for (const [key, value] of Object.entries(r)) {
    console.log(key, value);
    await Pitch.updateOne({ _id: key }, { $set: { avgRate: value } });
  }
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  // Write migration here
}

module.exports = { up, down };
