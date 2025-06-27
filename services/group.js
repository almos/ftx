const mongoose = require('mongoose');
const Group = mongoose.model('Group');
const _ = require('lodash');
const genericDal = require('./dal/generic');
const commonDal = require('../models/common');
const typeUtils = require('../utils/typeutils');
const logger = require('./logger').instance;
const userService = require('./user');

/**
 * Creates a group
 */
function createGroup(groupObject, creatorRole) {
  return genericDal.createOne(Group, groupObject, creatorRole);
}

/**
 * Creates a Pair
 */
function createPair(userId, otherUserId) {
  const groupObject = {
    title: `${userId}:${otherUserId}`,
    owner: userId,
    reviewers: [otherUserId],
    private: true,
    type: 'pair',
  };

  return genericDal.createOne(Group, groupObject).then((result) => {
    userService.addToGroup(userId, result.id).then(() => {
      return result;
    });
  });
}

/**
 * Finds a pair in database
 */
function findPair(userId, otherUserId) {
  return genericDal.findOne(Group, { title: `${userId}:${otherUserId}` }, null, [
    'organization',
    'owner',
  ]);
}

/**
 * Finds a group in database by an internal ID
 */
function findById(id) {
  return genericDal.findOne(Group, { _id: id }, null, ['organization', 'owner']);
}

/**
 * Finds a global group
 */
function findGlobal() {
  return genericDal.findAll(Group, { $or: [{ type: 'ft-global' }, { type: 'org-global' }] });
}

/**
 * Updates existing group
 */
function updateGroup(groupId, updatedGroup, updatorRole) {
  return genericDal.updateOne(Group, groupId, updatedGroup, updatorRole);
}

/**
 * Generic group search implementation in database
 */
function findManyImpl(searchCriteria, skip, limit) {
  return genericDal.findAll(Group, searchCriteria, skip, limit);
}

/**
 * Check if user is limited to leave review for pitch by group limit reviewers
 */
function isUserInLimitReviewers(user, pitch) {
  try {
    for (let rawGroupId of pitch.visibleGroups) {
      let userGroup =
        _.find(user.groups, { id: rawGroupId.toString() }) ||
        _.find(user.globalGroups, { id: rawGroupId.toString() });

      if (!userGroup) continue;

      //if group limitReviewers is false, user can leave review
      if (!userGroup.limitReviewers) return true;

      if (userGroup.reviewers && userGroup.reviewers.length) {
        return true;
      }
    }
  } catch (error) {
    logger.error(
      `Unable to find user: ${user.id}, in group: ${typeUtils.bufferToString(
        group.id,
      )}, reviewers list, ${error.message}`,
    );
    throw error;
  }

  return false;
}

/**
 * Search for groups
 */
function search(queryString, organization, privateOnly, limitReviewers, skip, limit, sub) {
  let criteria = [],
    populate = undefined,
    projection = undefined;

  if (queryString) {
    criteria.push({
      $or: [{ $text: { $search: queryString } }, { title: { $regex: queryString, $options: 'i' } }],
    });
  }

  if (organization) {
    criteria.push({ organization: organization });
  }

  if (privateOnly) {
    criteria.push({ private: privateOnly });
  }

  if (limitReviewers) {
    criteria.push({ limitReviewers: limitReviewers });
  }

  if (sub) {
    populate = ['organization', 'owner', 'reviewers'];
  }

  return genericDal.findAllPaginated(
    Group,
    criteria.length ? { $and: criteria } : {},
    skip,
    limit,
    null,
    projection,
    populate,
  );
}

/**
 * Search all for groups
 */
function searchAll(title, type, skip, limit) {
  let criteria = [],
    sortingOption = { title: 1, type: 1 };

  if (title) {
    criteria.push({
      $or: [{ $text: { $search: title } }, { title: { $regex: title, $options: 'i' } }],
    });
  }

  if (type) {
    criteria.push({ type: { $regex: type, $options: 'i' } });
  }

  return genericDal.findAllPaginated(
    Group,
    criteria.length ? { $and: criteria } : {},
    skip,
    limit,
    sortingOption,
    null,
    null,
  );
}

module.exports = {
  createGroup: createGroup,
  createPair: createPair,
  findPair: findPair,
  findGlobal: findGlobal,
  updateGroup: updateGroup,
  findById: findById,
  search: search,
  searchAll: searchAll,
  findMany: findManyImpl,
  isUserInLimitReviewers: isUserInLimitReviewers,
};
