const mongoose = require('mongoose');
const Bookmark = mongoose.model('Bookmark');
const roles = require('../config/security').userRolesList;
const objects = require('../config/security').objects;
const bookmarkModels = require('../config/bookmark').bookmarkModels;
const _ = require('lodash');
const errors = require('./error');
const genericDal = require('./dal/generic');

function buildBookmarkObject(user, type, objectId) {
  return {
    userId: user.id,
    bookmarkedObjectId: objectId,
    type: type,
    onModel: mapBookmarkModel(type),
  };
}

function mapBookmarkModel(type) {
  if (roles.includes(type)) {
    return bookmarkModels.USER;
  }
  switch (type) {
    case objects.PITCH:
      return bookmarkModels.PITCH;
  }

  throw new errors.InvalidArgumentError(`Unsupported type: ${type}`);
}

/**
 * Creates a bookmark
 */
function createBookmark(user, type, objectId) {
  return genericDal
    .findOne(mongoose.model(mapBookmarkModel(type)), { _id: objectId })
    .then((result) => {
      return genericDal.createOne(Bookmark, buildBookmarkObject(user, type, objectId), user.role);
    });
}

/**
 * Finds a bookmark in database by an internal ID
 */
function findById(id) {
  return genericDal.findOne(Bookmark, { _id: id });
}

/**
 * Deletes a bookmark in database by an internal ID
 */
function deleteBookmark(id) {
  return genericDal.deleteOne(Bookmark, id);
}

/**
 * Generic bookmark search implementation in database
 */
function findManyOwn(userId, type, skip, limit) {
  return genericDal.findAllPaginated(
    Bookmark,
    type ? { userId: userId, type: type } : { userId: userId },
    skip,
    limit,
    undefined,
    undefined,
    ['bookmarkedObjectId'],
  );
}

function findCountById(picthId) {
  return genericDal.count(Bookmark, { bookmarkedObjectId: mongoose.Types.ObjectId(picthId) });
}

module.exports = {
  createBookmark: createBookmark,
  findById: findById,
  deleteBookmark: deleteBookmark,
  findManyOwn: findManyOwn,
  findCountById: findCountById,
};
