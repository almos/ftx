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

  // calculating average rating of the pitches
  await Pitch.find({}, '+reviews').then((pitches) => {
    pitches.forEach((pitch) => {
      _.forEach(pitch.reviews, function (value) {
        let avgRate = _.meanBy(value.rate, function (o) {
          return o.reviewRating;
        });
        let avgRateRounded = parseFloat(_.round(avgRate, 2).toFixed(2));

        let updateFields = {};
        updateFields[`reviews.${value.__index}.avgRate`] = avgRateRounded;

        Pitch.update({ _id: pitch.id }, { $set: updateFields }).then(() => {});
      });
    });
  });

  // calculating average rating of business ideas
  let ideaIds = [];
  await BusinessIdea.find({}).then((ideas) => {
    ideas.forEach((idea) => {
      ideaIds.push(idea._id);
    });
  });

  for (i = 0; i < ideaIds.length; i++) {
    let businessIdeaId = ideaIds[i];
    await Pitch.find({ businessIdeaId: businessIdeaId, active: true }, '+reviews').then(
      (pitches) => {
        let avgRates = [];
        _.forEach(pitches, function (p) {
          let avgRate = _.meanBy(p.reviews, function (r) {
            return r.avgRate;
          });

          if (avgRate) avgRates.push(avgRate);
        });

        let avgIdeaRate = _.mean(avgRates);
        let avgIdeaRateRounded = parseFloat(_.round(avgIdeaRate, 2).toFixed(2));

        // business idea may not have reviews yet
        if (!avgIdeaRateRounded) return;

        BusinessIdea.update(
          { _id: businessIdeaId },
          { $set: { latestAvgPitchRating: avgIdeaRateRounded } },
        ).then(() => {});
      },
    );
  }
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  // Write migration here
}

module.exports = { up, down };
