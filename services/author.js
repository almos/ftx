/**
 * This module is responsible for providing high-level functions to manage Authors
 */

const mongoose = require('mongoose');
const Author = mongoose.model('Author');
const _ = require('lodash');
const genericDal = require('./dal/generic');
const googleCloudStorageService = require('./cloud-storage');
const errors = require('./error');
const logger = require('./logger').instance;
const fs = require('fs');

/**
 * Creates an author
 */
function createAuthor(authorObject, creatorRole) {
  return genericDal.createOne(Author, authorObject, creatorRole);
}

/**
 * Finds author in database by internal ID
 */
function findById(id) {
  return genericDal.findOne(Author, { _id: id });
}

/**
 * Generic author search implementation in database
 */
function findManyImpl(searchCriteria, skip, limit) {
  return genericDal.findAllPaginated(Author, searchCriteria, skip, limit);
}

/**
 * Updates existing author
 */
function updateAuthor(authorId, updatedAuthor, updatorRole) {
  return genericDal.updateOne(Author, authorId, updatedAuthor, updatorRole);
}

/**
 * Search for authors
 */
function search(queryString, skip, limit) {
  let criteria = [];

  if (queryString) {
    criteria.push({
      $or: [
        { $text: { $search: queryString } },
        { name: { $regex: queryString, $options: 'i' } },
        { surname: { $regex: queryString, $options: 'i' } },
        { title: { $regex: queryString, $options: 'i' } },
        { description: { $regex: queryString, $options: 'i' } },
      ],
    });
  }

  if (criteria.length) {
    return findManyImpl({ $or: criteria }, skip, limit);
  } else {
    return findManyImpl({}, skip, limit);
  }
}

function addAvatar(authorId, file, updatorRole) {
  return new Promise((resolve, reject) => {
    googleCloudStorageService
      .uploadToBucket(file)
      .then((urloadUrl) => updateAuthor(authorId, { avatarUrl: urloadUrl }, updatorRole))
      .then((updatedAuthor) => {
        // removing local file
        fs.unlinkSync(file.path);

        resolve(updatedAuthor);
      })
      .catch((error) => {
        logger.error(`Author avatar update ${authorId} failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

function removeAvatar(authorId, updatorRole) {
  return new Promise((resolve, reject) => {
    findById(authorId)
      .then((author) => googleCloudStorageService.removeFromBucket(author.avatarUrl))
      .then(() => updateAuthor(authorId, { avatarUrl: null }, updatorRole))
      .then((updatedAuthor) => resolve(updatedAuthor))
      .catch((error) => {
        logger.error(`Author avatar removal ${authorId} has failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

module.exports = {
  createAuthor: createAuthor,
  updateAuthor: updateAuthor,
  findById: findById,
  search: search,
  addAvatar: addAvatar,
  removeAvatar: removeAvatar,
};
