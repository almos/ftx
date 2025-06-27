const mongoose = require('mongoose');
const Video = mongoose.model('Video');
const VideoViewMark = mongoose.model('VideoViewMark');
const agenda = require('../config/beans/agenda');
const errors = require('./error');
const logger = require('./logger').instance;
const _ = require('lodash');
const genericDal = require('./dal/generic');
const commonDal = require('../models/common');
const signupQuestionService = require('./signup-question');
const reviewCategoryService = require('./review-category');

/**
 * Finds video in database by internal ID
 */
function findById(id) {
  return genericDal.findOne(Video, { _id: id });
}

/**
 * Generic video search implementation in database
 */
function findManyPaginatedImpl(searchCriteria, skip, limit, populate) {
  return genericDal.findAllPaginated(Video, searchCriteria, skip, limit, null, null, populate);
}

/**
 * Generic video search implementation in database
 */
function findManyImpl(searchCriteria, skip, limit) {
  return genericDal.findAll(Video, searchCriteria, skip, limit);
}

/**
 * Creates video entry in the database upon successful
 * upload to a local node
 */
function createVideo(localFilePath, userId) {
  return new Promise((resolve, reject) => {
    genericDal
      .createOne(Video, {
        localVideoPath: localFilePath,
      })
      .then((resultObject) => {
        // scheduling file upload to a remote storage
        agenda.run(agenda.jobs.VIDEO_UPLOAD, resultObject);
        resolve(resultObject);
      })
      .catch((error) => {
        logger.error(`Video with local path ${localFilePath} creation failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

/**
 *  Check if metadata.evaluationCriterias are valid while video updating
 */
function isEvaluationCriteriesValid(criteries) {
  return new Promise((resolve, reject) => {
    if (!criteries.length) {
      resolve(true);
    }

    reviewCategoryService
      .findAllAliases()
      .then((aliases) => {
        resolve(criteries.every((alias) => aliases.includes(alias)));
      })
      .catch((error) => {
        reject(error);
      });
  });
}

/**
 *  Check if metadata.stages are valid while video updating
 */
function isStagesValid(stages, key = 'myStage') {
  return new Promise((resolve, reject) => {
    if (!stages.length) {
      resolve(true);
    }

    signupQuestionService
      .findAnswerValuesByKey(key)
      .then((values) => {
        resolve(stages.every((value) => values.includes(value)));
      })
      .catch((error) => {
        reject(error);
      });
  });
}

/**
 * Updates video entry
 */
function updateVideo(videoId, updateFields, updatorRole) {
  return updateVideoImpl(videoId, updateFields, updatorRole);
}

/**
 * Puts a like to a video
 */
function likeVideo(videoId, userId) {
  return updateVideoImpl(videoId, {
    $addToSet: { likes: userId },
  });
}

/**
 * Removes a like from a video
 */
function dislikeVideo(videoId, userId) {
  return updateVideoImpl(videoId, {
    $pull: { likes: userId },
  });
}

/**
 * Search for videos
 * @param queryString
 * @param tags
 */
function search(queryString, author, tags, skip, limit) {
  let criteria = [],
    populate = {
      path: 'authors',
      select: 'name surname id',
    };

  if (queryString) {
    criteria.push({
      $or: [
        { $text: { $search: queryString } },
        { title: { $regex: queryString, $options: 'i' } },
        { description: { $regex: queryString, $options: 'i' } },
        { tags: { $in: commonDal.processTags(_.split(queryString, ' ')) } },
      ],
    });
  }

  if (author) {
    criteria.push({ authors: { $in: [author] } });
  }

  if (tags) {
    criteria.push({ tags: { $in: commonDal.processTags(tags) } });
  }

  if (criteria.length) {
    return findManyPaginatedImpl({ $and: criteria }, skip, limit, populate);
  } else {
    return findManyPaginatedImpl({}, skip, limit, populate);
  }
}

function updateVideoImpl(videoId, updateFields, updatorRole) {
  return genericDal.updateOne(Video, videoId, updateFields, updatorRole);
}

function findUnhandledVideos() {
  let brightcoveCacheEvictTime = new Date(Date.now() - (60 * 60 * 5 * 1000 + 30 * 60 * 1000));
  return findManyImpl({
    $and: [
      { 'brightcove.ingestId': { $ne: null } },
      {
        $or: [
          { video: null },
          { video: { $ne: null }, 'video.updateDate': null },
          { video: { $ne: null }, 'video.updateDate': { $lte: brightcoveCacheEvictTime } },
        ],
      },
    ],
  });
}

function setViewMark(videoId, userId, viewMark, updatorRole) {
  return genericDal.upsertOne(VideoViewMark, { userId: userId, videoId: videoId }, viewMark);
}

function getViewMark(videoId, userId) {
  return genericDal.findOne(VideoViewMark, { userId: userId, videoId: videoId });
}

module.exports = {
  findById: findById,
  createVideo: createVideo,
  updateVideo: updateVideo,
  setViewMark: setViewMark,
  getViewMark: getViewMark,
  likeVideo: likeVideo,
  dislikeVideo: dislikeVideo,
  search: search,
  findMany: findManyImpl,
  findUnhandledVideos: findUnhandledVideos,
  isEvaluationCriteriesValid: isEvaluationCriteriesValid,
  isStagesValid: isStagesValid,
};
