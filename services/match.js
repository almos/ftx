const mongoose = require('mongoose');
const Video = mongoose.model('Video');
const pitchService = require('../services/pitch');
const businessIdeaService = require('../services/business-idea');
const reviewCategoryService = require('./review-category');
const userService = require('../services/user');
const genericDal = require('./dal/generic');
const logger = require('./logger').instance;
const _ = require('lodash');

async function getReviewCategoriesValuesFromIds(bsonIds) {
  let result = [],
    ids = bsonIds.map((el) => el.toString()),
    reviewCategories = await reviewCategoryService.findAll();

  reviewCategories.forEach((el) => {
    if (ids.includes(el.id)) {
      result.push(el.alias);
    }
  });

  return result;
}

async function findVideoContent(user, pitch, businessIdea, reviewId, skip, limit) {
  let criteria,
    stages = [],
    matchArray = [],
    lowRatingReviewIds = [],
    sortingOptions = { updatedAt: -1 },
    review = _.find(pitch.reviews, { id: reviewId });

  if (user.signupQuestions?.length) {
    // get all stages from user signupQuestions
    user.signupQuestions
      .map((el) => el.answer)
      .flat()
      .forEach((el) => {
        stages.push(el);
      });
  }

  if (businessIdea.stage) {
    // check if we already have this stage in stages array
    if (!stages.includes(businessIdea.stage)) {
      stages.push(businessIdea.stage);
    }
  }

  if (stages.length) {
    matchArray.push({
      'metadata.stage': { $in: stages },
    });
  }
  // find review category id with low rating
  if (review.rate?.length) {
    review.rate.filter((el) => {
      if (el.reviewRating <= 3) {
        lowRatingReviewIds.push(el.reviewCategoryId);
      }
    });
  }

  if (lowRatingReviewIds.length) {
    // convert review categories ids to values
    let categoriesValues = await getReviewCategoriesValuesFromIds(lowRatingReviewIds);
    matchArray.push({
      'metadata.evaluationCriteria': { $in: categoriesValues },
    });
  }

  if (matchArray.length) {
    criteria = {
      $and: matchArray,
    };
  }

  return genericDal.findAllPaginated(Video, criteria, skip, limit, sortingOptions, {}, []);
}

function searchLearningContent(currentUser, pitchId, reviewId, skip, limit) {
  let businessIdea, pitch;

  return new Promise((resolve, reject) => {
    pitchService
      .findPitchWithReviewsById(currentUser, pitchId)
      .then((pitch_) => {
        pitch = pitch_;
        return pitch.businessIdeaId;
      })
      .then((businessIdeaId) => {
        return businessIdeaService.findById(currentUser, businessIdeaId);
      })
      .then((businessIdea_) => {
        businessIdea = businessIdea_;
        return businessIdea.userId;
      })
      .then((userId) => {
        return userService.findById(userId);
      })
      .then((user) => {
        resolve(findVideoContent(user, pitch, businessIdea, reviewId, skip, limit));
      })
      .catch((error) => {
        logger.error(`Fetching learning content filed: ${error.message}`, reject);
        reject(error);
      });
  });
}

module.exports = {
  searchLearningContent: searchLearningContent,
};
