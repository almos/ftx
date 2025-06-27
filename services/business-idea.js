const mongoose = require('mongoose');
const dataAcl = require('../models/acl');
const BusinessIdea = mongoose.model('BusinessIdea');
const acl = require('../models/acl');
const errors = require('./error');
const logger = require('./logger').instance;
const _ = require('lodash');
const googleCloudStorageService = require('./cloud-storage');
const genericDal = require('./dal/generic');
const commonDal = require('../models/common');
const baseService = require('./base');
const eventbus = require('./eventbus');
const events = eventbus.events;
const systemConfigService = require('./system-config');
const fs = require('fs');

function getBusinessIdeaModel(user, visibilityGroups) {
  let groups = visibilityGroups ? visibilityGroups : [];

  if (user.getActiveTenant() === 'root') return BusinessIdea;
  if (user.role === 'admin') return BusinessIdea.byTenant(user.getActiveTenant());
  return BusinessIdea.byTenant(user.getActiveTenant(), groups);
}

/**
 *  Check if business-idea stage is valid while it creation/updating
 */
function isStageValid(value, key = 'stage') {
  return new Promise((resolve, reject) => {
    if (!value.length) {
      resolve(true);
      return;
    }

    systemConfigService
      .validateField(key, value)
      .then(() => {
        resolve(true);
      })
      .catch(() => {
        resolve(false);
      });
  });
}

/**
 * Creates a business idea
 */
function createIdea(user, idea, file) {
  // if user is not sending any visibility groups, we detect them
  // from the existing organization configuration
  let groups = Array.isArray(idea.visibilityGroups)
    ? idea.visibilityGroups
    : user.getDefaultGroups();

  let visibilityGroups = baseService.validateVisibilityGroups(user, groups);
  return genericDal
    .createOne(getBusinessIdeaModel(user, visibilityGroups), {
      userId: user.id,
      ...idea,
    })
    .then((result) => {
      // sending a event bus message upon a business idea creation
      eventbus.instance.emit(events.BUSINESS_IDEA_CREATE, null, {
        org: user.organization ? user.organization.tenantAlias : null,
      });
      return result;
    })
    .then((result) => {
      if (file) {
        return uploadBusinessLogo(user, result, file);
      }
      return result;
    });
}

function uploadBusinessLogo(user, idea, file) {
  return new Promise((resolve, reject) => {
    googleCloudStorageService
      .uploadToBucket(file)
      .then((uploadUrl) => updateIdea(user, idea.id, { logo: uploadUrl }))
      .then((updatedIdea) => {
        resolve(updatedIdea);
      })
      .catch((error) => {
        logger.error(`Logo update for ${idea.id} failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      })
      .finally(() => {
        fs.unlinkSync(file.path);
      });
  });
}

function validateIdeaOwnership(user, businessIdeaId) {
  return new Promise((resolve, reject) => {
    findById(user, businessIdeaId)
      .then((businessIdea) => {
        if (businessIdea.userId != user.id) {
          reject(new errors.PermissionAccessViolation());
        } else {
          resolve(businessIdea);
        }
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function findManyPaginatedImpl(user, searchCriteria, skip, limit, sortingOptions, projection, sub) {
  let populate = [];
  if (sub) {
    populate.push({ path: 'userId', select: '-signupQuestions' });
  }
  return genericDal.findAllPaginated(
    getBusinessIdeaModel(user, baseService.getUserVisibilityGroups(user)),
    searchCriteria,
    skip,
    limit,
    sortingOptions,
    projection,
    populate,
  );
}

/**
 * Updates existing business idea
 */
function updateIdea(user, businessIdeaId, updateFields) {
  return new Promise((resolve, reject) => {
    validateIdeaOwnership(user, businessIdeaId)
      .then(() => updateIdeaImpl(user, businessIdeaId, updateFields))
      .then((record) => resolve(record))
      .catch((error) => {
        logger.error(`Business idea update failed: ${error.message}`);
        reject(new errors.DatabaseError(error));
      });
  });
}

/**
 * Finds business idea in database by internal ID
 */
function findById(user, id) {
  return findOneImpl(user, { _id: id });
}

/**
 * Generic business idea search implementation in database
 */
function findOneImpl(user, searchCriteria) {
  return genericDal.findOne(
    getBusinessIdeaModel(user, baseService.getUserVisibilityGroups(user)),
    searchCriteria,
  );
}

/**
 * Finds all business ideas
 */
function findAllByUser(user) {
  return genericDal.findAll(getBusinessIdeaModel(user, baseService.getUserVisibilityGroups(user)), {
    userId: user.id,
  });
}

function updatePitchRate(user, businessIdeaId, avgPitchRate) {
  return new Promise((resolve, reject) => {
    findById(user, businessIdeaId)
      .then((businessIdea) => {
        // we may want to set null here when new pitch is submitted
        if (!avgPitchRate) return null;

        // in case we reset avgPitchRate each time new pitch is submitted
        // business' idea average rate will always correspond to an average of the latest
        // active pitch
        let existingAvgRating = businessIdea.latestAvgPitchRating;
        return existingAvgRating
          ? _.round((existingAvgRating + avgPitchRate) / 2, 2).toFixed(2)
          : avgPitchRate;
      })
      .then((newBusinessIdeaRating) => {
        let updateFields = newBusinessIdeaRating
          ? { latestAvgPitchRating: newBusinessIdeaRating }
          : { $unset: { latestAvgPitchRating: 1 } };
        resolve(updateIdeaImpl(user, businessIdeaId, updateFields));
      })
      .catch((error) => {
        logger.error(`Failed updating business idea ${businessIdeaId} rating: ${error.message}`);
        reject(new errors.DatabaseError(error));
      });
  });
}

function updateIdeaImpl(user, businessIdeaId, updateFields) {
  // if user is not sending any visibility groups, we detect them
  // from the existing organization configuration
  let visibilityGroups = Array.isArray(updateFields.visibilityGroups)
    ? updateFields.visibilityGroups
    : baseService.getUserVisibilityGroups(user);

  return genericDal.updateOne(
    getBusinessIdeaModel(user, visibilityGroups),
    businessIdeaId,
    updateFields,
    user.role,
  );
}

function incrementAndGetPitchCount(user, businessIdeaId) {
  return updateIdeaImpl(user, businessIdeaId, { $inc: { pitchCount: 1 } });
}

function decrementAndGetPitchCount(user, businessIdeaId) {
  return updateIdeaImpl(user, businessIdeaId, { $inc: { pitchCount: -1 } });
}

/**
 * Search for business ideas
 * @param user object that points to User which is performing the search
 * @param queryString string to search across title, description and tags
 * @param skip how many results from the top to skip (used for paging)
 * @param limit number of results to show (used for paging)
 * @param sub flag that expands pitch nested objects
 * @param languages search pitches with pointed languages
 * @param excludeUserId user ID to exclude from search
 * @param groups user groups to filter result by
 * @returns {Promise<Macie2.BucketCountByEffectivePermission.unknown>}
 */
function search(user, queryString, skip, limit, sub, languages, excludeUserId, groups) {
  let criteria = [],
    projection = undefined,
    baseCriteria = { title: { $exists: true } };

  if (queryString) {
    criteria.push({
      $or: [
        { $text: { $search: queryString } },
        { title: { $regex: queryString, $options: 'i' } },
        { description: { $regex: queryString, $options: 'i' } },
      ],
    });
  }

  if (languages) {
    criteria.push({ language: { $in: commonDal.processTags(languages) } });
  }

  if (excludeUserId) {
    criteria.push({ userId: { $ne: excludeUserId } });
  }

  if (groups) {
    criteria.push({ visibleGroups: { $in: commonDal.processTags(groups) } });
  }

  let sortingOptions = { updatedAt: -1 };

  if (criteria.length) {
    // sending a event bus message upon a pitch search
    eventbus.instance.emit(events.BUSINESS_IDEA_SEARCH, null, {
      org: user.organization ? user.organization.tenantAlias : null,
    });
  }

  return new Promise((resolve, reject) => {
    findManyPaginatedImpl(
      user,
      criteria.length ? { $and: _.merge([baseCriteria], criteria) } : { $and: [baseCriteria] },
      skip,
      limit,
      sortingOptions,
      projection,
      sub,
    )
      .then((foundBusinessIdeas) => {
        resolve(foundBusinessIdeas);
      })
      .catch((error) => {
        logger.error(`Pitch search has been failed: ${error.message}`);
        reject(error);
      });
  });
}

function uploadLogo(user, businessId, file) {
  return new Promise((resolve, reject) => {
    googleCloudStorageService
      .uploadToBucket(file)
      .then((logoUrl) => {
        return genericDal.updateOne(BusinessIdea, businessId, { logo: logoUrl }, user.role);
      })
      .then((businessIdea) => {
        return resolve(businessIdea);
      })
      .finally(() => {
        fs.unlinkSync(file.path);
      })
      .catch((error) => {
        logger.error(`Upload logo failed: ${error.message}`);
        return reject(new errors.InternalServerError(error));
      });
  });
}

function deleteIdea(ideaId) {
  return genericDal.deleteOne(BusinessIdea, ideaId);
}

module.exports = {
  createIdea: createIdea,
  updateIdea: updateIdea,
  uploadLogo: uploadLogo,
  incrementAndGetPitchCount: incrementAndGetPitchCount,
  decrementAndGetPitchCount: decrementAndGetPitchCount,
  findById: findById,
  findAllByUser: findAllByUser,
  validateIdeaOwnership: validateIdeaOwnership,
  updatePitchRate: updatePitchRate,
  isStageValid: isStageValid,
  search: search,
  deleteIdea: deleteIdea,
};
