const mongoose = require('mongoose');
const CommunityFeedPost = mongoose.model('CommunityFeedPost');
const _ = require('lodash');
const logger = require('./logger').instance;
const errors = require('./error');
const googleCloudStorageService = require('./cloud-storage');
const genericDal = require('./dal/generic');
const fs = require('fs');
const { userRoles } = require('../config/security');

function createCommunityFeedPost(user, requestBody) {
  return new Promise((resolve, reject) => {
    genericDal
      .createOne(CommunityFeedPost, { createdBy: user.id, ...requestBody }, user.role)
      .then((result) => {
        return resolve(result);
      })
      .catch((error) => {
        logger.error(`updateCommunityFeed failed: ${error.message}`);
        reject(error);
      });
  });
}

function searchCommunityFeedPost(user, pagingObject) {
  return searchCommunityFeedPostAll(user, pagingObject);
}

function findById(communityPostId) {
  return genericDal.findOne(CommunityFeedPost, { _id: mongoose.Types.ObjectId(communityPostId) });
}

function updateCommunityFeedPost(user, communityPostId, requestBody) {
  return new Promise((resolve, reject) => {
    genericDal
      .updateOne(CommunityFeedPost, communityPostId, requestBody, user.role)
      .then((result) => {
        return resolve(result);
      })
      .catch((error) => {
        logger.error(`updateCommunityFeed failed: ${error.message}`);
        reject(error);
      });
  });
}

function deleteCommunityFeedPost(user, communityPostId) {
  let deleteStatus = { deleted: true };
  return genericDal.updateOne(CommunityFeedPost, communityPostId, deleteStatus, user.role);
}

module.exports = {
  createCommunityFeedPost: createCommunityFeedPost,
  searchCommunityFeedPost: searchCommunityFeedPost,
  findById: findById,
  updateCommunityFeedPost: updateCommunityFeedPost,
  uploadCoverImage: uploadCoverImage,
  deleteCommunityFeedPost: deleteCommunityFeedPost,
};

// Private method zone

function searchCommunityFeedPostAll(user, pagingObject) {
  let { page, pageSize, skip } = pagingObject;
  let { role } = user;
  let searchCriteria = {};

  searchCriteria = role === userRoles.ADMIN ? {} : { deleted: false };

  let sortingOptions = { createdAt: -1 };

  return genericDal.findAllPaginated(
    CommunityFeedPost,
    searchCriteria,
    skip,
    pageSize,
    sortingOptions,
  );
}

function uploadCoverImage(user, communityPostId, file) {
  return new Promise((resolve, reject) => {
    googleCloudStorageService
      .uploadToBucket(file)
      .then((coverImageUrl) => {
        return genericDal.updateOne(
          CommunityFeedPost,
          communityPostId,
          { coverImageUrl },
          user.role,
        );
      })
      .then((communityFeedPost) => {
        return resolve(communityFeedPost);
      })
      .finally(() => {
        fs.unlinkSync(file.path);
      })
      .catch((error) => {
        logger.error(
          `Upload for community post cover image failed for post id ${communityPostId}: ${error.message}`,
        );
        return reject(new errors.InternalServerError(error.message));
      });
  });
}
