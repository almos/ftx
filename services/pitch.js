const mongoose = require('mongoose');
const dataAcl = require('../models/acl');
const acl = require('../models/acl');
const agenda = require('../config/beans/agenda');
const Pitch = mongoose.model('Pitch');
const PitchReviewQueue = mongoose.model('PitchReviewQueue');
const PitchReviewSchema = mongoose.model('PitchReview');
const GroupSchema = mongoose.model('Group');
const businessIdeaService = require('./business-idea');
const groupService = require('./group');
const errors = require('./error');
const logger = require('./logger').instance;
const _ = require('lodash');
const genericDal = require('./dal/generic');
const commonDal = require('../models/common');
const baseService = require('./base');
const fileUtils = require('../utils/fileutils');
const eventbus = require('./eventbus');
const events = eventbus.events;
const googleCloudStorageService = require('./cloud-storage');
const bookmarkService = require('./bookmark');
const fs = require('fs');
const {
  NotificationBuilder,
  createNotificationWithConfirmation,
  checkActionNotificationNotExist,
} = require('./notification');
const { notificationTypes, actionResponses } = require('../config/notification');
const { userRoles } = require('../config/security');
function getPitchModel(user, visibilityGroups) {
  let groups = visibilityGroups ? visibilityGroups : [];

  if (user.getActiveTenant() === 'root') return Pitch;
  if (user.role === 'admin') return Pitch.byTenant(user.getActiveTenant());
  return Pitch.byTenant(user.getActiveTenant(), groups);
}

/**
 * Finds pitch in database by internal ID
 */
function findById(user, id) {
  return findOneImpl(user, { _id: id });
}

function updatePitch(user, pitchId, updateFields) {
  // if user is not sending any visibility groups, we detect them
  // from the existing organization configuration
  let groups = Array.isArray(updateFields.visibilityGroups)
    ? updateFields.visibilityGroups
    : user.getDefaultGroups();

  let visibilityGroups = baseService.validateVisibilityGroups(user, groups);

  return genericDal.updateOne(
    getPitchModel(user, groups),
    pitchId,
    updateFields,
    user.role,
    user.id,
    pitchSaveCallback,
  );
}

function pitchSaveCallback(cbPitch, cbUpdateFields) {
  let avgRate = undefined,
    curatedRate = undefined;

  let targetObject = cbUpdateFields.$set ? cbUpdateFields.$set : cbUpdateFields;

  if (targetObject) {
    avgRate = targetObject.avgRate
      ? commonDal.parseInteger(targetObject.avgRate)
      : commonDal.parseInteger(cbPitch.avgRate);
    curatedRate = commonDal.parseInteger(targetObject.curatedRate);
    targetObject.totalRate = avgRate + curatedRate;
  }
}

function updatePitches(pitchId, updateFields, updatorRole) {
  return updatePitchByFilter({ _id: pitchId }, updateFields, updatorRole);
}

function updatePitchByFilter(filter, updateFields, updatorRole) {
  return genericDal.updateMulti(Pitch, filter, updateFields, updatorRole);
}

/**
 * Finds pitch reviews by a given pitch ID
 */
function findPitchWithReviewsById(user, id, sub) {
  return findOneImpl(user, { _id: id }, '+reviews', sub ? ['reviews.userId'] : undefined).then(
    (pitch) => {
      return attachFilters(pitch);
    },
  );
}

/**
 * Finds pitch review by a given pitch ID / review ID
 */
function findReviewById(user, pitchId, reviewId) {
  return findPitchWithReviewsById(user, pitchId).then((pitch) => {
    return _.find(pitch.reviews, { id: reviewId });
  });
}

/**
 * Generic pitch search implementation in database
 */
function findOneImpl(user, searchCriteria, projection, poppulate) {
  return genericDal.findOne(
    getPitchModel(user, baseService.getUserVisibilityGroups(user)),
    searchCriteria,
    projection,
    poppulate,
  );
}

/**
 * Creates a pitch
 */
function createPitch(user, businessIdeaId, createFields) {
  let payload = createFields,
    userId = user.id,
    creatorRole = user.role;

  // if user is not sending any visibility groups, we detect them
  // from the existing organization configuration
  let groups = Array.isArray(createFields.visibilityGroups)
    ? createFields.visibilityGroups
    : user.getDefaultGroups();

  let visibilityGroups = baseService.validateVisibilityGroups(user, groups);

  if (creatorRole) {
    payload = dataAcl.filterIn(payload, Pitch, creatorRole);
  }

  payload.businessIdeaId = businessIdeaId;
  payload.userId = userId;

  return new Promise((resolve, reject) => {
    businessIdeaService
      .validateIdeaOwnership(user, businessIdeaId)
      .then(() => businessIdeaService.incrementAndGetPitchCount(user, businessIdeaId))
      .then((businessIdea) => {
        payload.version = businessIdea.pitchCount;
      })
      .then(() => {
        getPitchModel(user, visibilityGroups)
          .create(payload)
          .then((record) => attachFilters(record.toObject()))
          .then((resultObject) => {
            // sending a event bus message upon a pitch creation
            eventbus.instance.emit(events.PITCH_CREATE, null, {
              org: user.organization ? user.organization.tenantAlias : null,
            });
            return resultObject;
          })
          .then(async (result) => {
            resolve(result);
          })
          .catch((error) => {
            logger.error(`Pitch creation failed: ${error.message}`, reject);
            reject(new errors.DatabaseError(error));
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
}

/**
 * Deletes a pitch
 * @param user user that performed a request
 * @param pitchId pitch ID to remove
 * @returns {Promise<unknown>}
 */
function deletePitch(user, pitchId) {
  let pitch = null,
    userId = user.id,
    creatorRole = user.role;

  return new Promise((resolve, reject) => {
    findById(user, pitchId)
      .then((foundPitch) => {
        pitch = foundPitch;
        return foundPitch;
      })
      .then((pitch) => businessIdeaService.validateIdeaOwnership(user, pitch.businessIdeaId))
      .then((businessIdea) => {
        if (pitch.deleted) {
          reject(new errors.IllegalStateError('Pitch has been already removed'));
          return;
        }

        return businessIdeaService.decrementAndGetPitchCount(user, businessIdea.id);
      })
      .then(() => PitchReviewQueue.remove({ pitchId: pitchId }))
      .then(() => updatePitchImpl(user, pitchId, { deleted: true, active: false }), creatorRole)
      .then((resultObject) => resolve(resultObject))
      .catch((error) => {
        logger.error(`Pitch removal failed: ${error.message}`, reject);
        reject(new errors.DatabaseError(error));
      });
  });
}

function updatePitchImpl(user, pitchId, updateFields, updatorRole) {
  // if user is not sending any visibility groups, we detect them
  // from the existing organization configuration
  let visibilityGroups = Array.isArray(updateFields.visibilityGroups)
    ? updateFields.visibilityGroups
    : baseService.getUserVisibilityGroups(user);

  return genericDal.updateOne(
    getPitchModel(user, visibilityGroups),
    pitchId,
    updateFields,
    updatorRole,
    undefined,
    pitchSaveCallback,
  );
}

function validatePitchOwnership(user, pitchId, keepSource) {
  return new Promise((resolve, reject) => {
    getPitchModel(user, baseService.getUserVisibilityGroups(user))
      .findById(pitchId)
      .populate('businessIdeaId')
      .then((pitch) => {
        if (!pitch) {
          reject(new errors.EntityNotFoundError(Pitch.modelName));
        }

        let result = keepSource ? pitch : pitch.toObject();
        if (result.businessIdeaId.userId != user.id) {
          reject(new errors.PermissionAccessViolation());
        } else {
          resolve(result);
        }
      })
      .catch((error) => {
        logger.error(`Pitch validation failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

/**
 * Creates video entry in the database upon successful
 * upload to a local node
 */
function handleVideoUpload(user, pitchId, localFilePath) {
  return new Promise((resolve, reject) => {
    validatePitchOwnership(user, pitchId)
      .then((pitch) => updatePitchImpl(user, pitch.id, { localVideoPath: localFilePath }))
      .then((resultObject) => {
        // sending a event bus message upon a pitch video upload
        eventbus.instance.emit(events.PITCH_VIDEO_UPLOAD, null, {
          org: user.organization ? user.organization.tenantAlias : null,
          sizeMbytes: fileUtils.getFilesizeInMegaBytes(localFilePath),
        });

        // scheduling file upload to a remote storage
        agenda.run(agenda.jobs.PITCH_VIDEO_UPLOAD, resultObject);
        resolve(resultObject);
      })
      .catch((error) => {
        logger.error(
          `Pitch video with local path ${localFilePath} handling failed: ${error.message}`,
        );
        reject(new errors.InternalServerError(error));
      });
  });
}

/**
 * Updates the poster photo of the video upon successful upload of image
 */
function handlePosterPhotoUpload(user, pitchId, file) {
  return new Promise((resolve, reject) => {
    googleCloudStorageService
      .uploadToBucket(file)
      .then((uploadUrl) => updatePitch(user, pitchId, { posterImageUrl: uploadUrl }))
      .then((updatedUser) => {
        resolve(updatedUser);
      })
      .catch((error) => {
        logger.error(`Video poster update ${user.id} failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      })
      .finally(() => {
        // removing local file
        fs.unlinkSync(file.path);
      });
  });
}

/**
 * Marks specific pitch active within a related business idea
 */
function switchActivePitch(pitch) {
  let businessIdeaFilter = { businessIdeaId: pitch.businessIdeaId.id };
  return new Promise((resolve, reject) => {
    PitchReviewQueue.remove(businessIdeaFilter)
      .then(() => updatePitchByFilter(businessIdeaFilter, { active: false }))
      .then(() => updatePitches(pitch.id, { active: true }))
      .then(() => resolve())
      .catch((err) => reject(err));
  });
}

function passReview(user, pitchId) {
  let userId = user.id;
  return new Promise((resolve, reject) => {
    genericDal
      .count(PitchReviewQueue, { pitchId: pitchId })
      .then((count) => {
        if (!count) {
          throw new errors.IllegalStateError('Pitch is not in the review queue');
        }
      })
      .then(() => findById(user, pitchId))
      .then((pitch) => {
        return businessIdeaService.updatePitchRate(user, pitch.businessIdeaId, null);
      })
      .then((businessIdea) => {
        return PitchReviewQueue.remove({ businessIdeaId: businessIdea.id });
      })
      .then(() =>
        updatePitches(pitchId, {
          active: true,
          inReview: false,
          reviewed: true,
          rejected: false,
          rejectReason: null,
          reviewedBy: userId ? userId : null,
          publishedDate: new Date(),
        }),
      )
      .then(() => {
        // sending a event bus message upon a pitch approval
        eventbus.instance.emit(events.PITCH_APPROVE, null, {
          org: user.organization ? user.organization.tenantAlias : null,
          resolution: 'pass',
        });
      })
      .then(() => resolve())
      .catch((err) => reject(err));
  });
}

function failReview(user, pitchId, rejectReason) {
  let reviewedBy = user.id;
  return new Promise((resolve, reject) => {
    genericDal
      .count(PitchReviewQueue, { pitchId: pitchId })
      .then((count) => {
        if (!count) {
          throw new errors.IllegalStateError('Pitch is not in the review queue');
        }
      })
      .then(() =>
        updatePitches(pitchId, {
          inReview: false,
          reviewed: true,
          rejected: true,
          rejectReason: rejectReason,
          active: false,
          reviewedBy: reviewedBy ? reviewedBy : null,
        }),
      )
      .then(() => {
        // sending a event bus message upon a pitch approval
        eventbus.instance.emit(events.PITCH_APPROVE, null, {
          org: user.organization ? user.organization.tenantAlias : null,
          resolution: 'fail',
        });
      })
      .then(() => PitchReviewQueue.remove({ pitchId: pitchId }))
      .then(() => resolve())
      .catch((err) => reject(err));
  });
}

/**
 * Sends pitch to another user
 * @param pitchId
 * @param user
 * @param otherUserId
 * @returns {Promise<unknown>}
 */
function sendToUser(user, pitchId, otherUserId) {
  return new Promise((resolve, reject) => {
    validatePitchOwnership(user, pitchId)
      .then((pitch) => {
        if (!pitch.brightcove && !pitch.localVideoPath) {
          reject(new errors.IllegalStateError('Pitch has no video'));
          return;
        }
        return pitch;
      })
      .then(() => {
        return groupService
          .findPair(user.id, otherUserId)
          .then((result) => {
            if (result) {
              return result;
            }
          })
          .catch(() => {
            return groupService.createPair(user.id, otherUserId);
          });
      })
      .then((result) => {
        return updatePitchGroup(user, pitchId, [result.id]);
      })
      .then((result) => resolve(result));
  });
}

function updatePitchGroup(user, pitchId, visibilityGroups) {
  return genericDal.updateOne(
    Pitch,
    pitchId,
    { visibleGroups: visibilityGroups },
    user.role,
    user.id,
    pitchSaveCallback,
  );
}
/**
 * Submits pitch to a review queue
 * @param pitchId
 * @param user
 * @returns {Promise<unknown>}
 */
function submit(user, pitchId) {
  let makePitchQueueRequest = function (pitch) {
    return {
      pitchId: pitch.id,
      businessIdeaId: pitch.businessIdeaId.id,
      userId: user.id,
    };
  };

  return new Promise((resolve, reject) => {
    let pitchObject = null;
    validatePitchOwnership(user, pitchId)
      .then((pitch) => {
        if (pitch.rejected) {
          reject(new errors.IllegalStateError('Pitch has been already reviewed and rejected'));
          return;
        }

        if (pitch.reviewed) {
          reject(new errors.IllegalStateError('Pitch has been already reviewed'));
          return;
        }

        if (pitch.deleted) {
          reject(new errors.IllegalStateError('Cannot submit deleted pitch'));
          return;
        }

        if (!pitch.brightcove && !pitch.localVideoPath) {
          reject(new errors.IllegalStateError('Pitch has no video'));
          return;
        }

        return (pitchObject = pitch);
      })
      .then((pitch) =>
        genericDal.count(PitchReviewQueue, { pitchId: pitchId }).then((count) => {
          if (!count) return;
          throw new errors.IllegalStateError('Pitch has been already submitted');
        }),
      )
      .then(() => switchActivePitch(pitchObject))
      .then(() =>
        genericDal
          .createOne(PitchReviewQueue, makePitchQueueRequest(pitchObject))
          .then(async (resultObject) => {
            await updatePitch(user, pitchObject.id, { inReview: true }).catch(() => {});
            resolve(resultObject);
          }),
      )
      .catch((error) => {
        reject(error);
      });
  });
}

/**
 * Revokes a pitch from review queue (by the user who has created the pitch)
 * @param pitchId
 * @param user
 * @returns {Promise<unknown>}
 */
function revoke(user, pitchId) {
  return new Promise((resolve, reject) => {
    validatePitchOwnership(user, pitchId)
      .then((pitch) => updatePitchImpl(user, pitchId, { active: false }))
      .then((pitch) => {
        PitchReviewQueue.remove({ pitchId: pitchId })
          .then(() => resolve({}))
          .catch((error) => reject(new errors.DatabaseError(error)));
      })
      .catch((error) => {
        logger.error(`Pitch queue revocation has failed: ${error.message}`);
        reject(error);
      });
  });
}

function findManyPaginatedImpl(user, searchCriteria, skip, limit, sortingOptions, projection, sub) {
  let populate = [];
  if (sub) {
    populate.push({ path: 'businessIdeaId' });
    populate.push({ path: 'userId', select: '-signupQuestions' });
  }

  return genericDal.findAllPaginated(
    getPitchModel(user, baseService.getUserVisibilityGroups(user)),
    searchCriteria,
    skip,
    limit,
    sortingOptions,
    projection,
    populate,
  );
}

function findManyImpl(searchCriteria, skip, limit, sortingOptions, projection, sub) {
  return genericDal.findAll(Pitch, searchCriteria, skip, limit, sortingOptions, projection, sub);
}

/**
 * Finds pitches with videos not currently processed by brightcove or those that have media links expired
 * @returns {Promise<unknown>}
 */
function findWithUnhandledVideos() {
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

function findActiveUserPitches(user) {
  return genericDal.findAll(getPitchModel(user, baseService.getUserVisibilityGroups(user)), {
    userId: user.id,
    active: true,
  });
}

function findUserPitches(user) {
  return genericDal.findAll(getPitchModel(user, baseService.getUserVisibilityGroups(user)), {
    userId: user.id,
  });
}

function findUsersActivePitches(currentUser, user) {
  return genericDal.findAll(
    getPitchModel(currentUser, baseService.getUserVisibilityGroups(currentUser)),
    {
      userId: user.id,
      active: true,
    },
  );
}

function findByBusinessIdea(user, businessIdeaId) {
  return genericDal.findAll(getPitchModel(user, baseService.getUserVisibilityGroups(user)), {
    businessIdeaId: businessIdeaId,
    deleted: false,
  });
}

/**
 * Adding canReview flag to pitch, depends on group limit reviewers
 */
function addCanReviewFlag(user, pitches) {
  let pitchesWithFlag = [];

  for (let pitch of pitches.objects) {
    pitch.canReview = canUserReviewPitch(user, pitch);
    pitchesWithFlag.push(pitch);
  }
  pitches.objects = pitchesWithFlag;
  return pitches;
}

/**
 * Check if user isn't restricted to leave review, by groups limit reviewers
 */
function canUserReviewPitch(user, pitch) {
  try {
    return groupService.isUserInLimitReviewers(user, pitch);
  } catch (error) {
    logger.error(`Unable to add flag to pitch for user: ${user.id}. Error: ${error.message}`);
    throw error;
  }
}

/**
 * Check if user has review this pitch.
 */
function checkUserHasReviewedPitch(user, pitchId) {
  return new Promise((resolve, reject) => {
    findOneImpl(
      user,
      { _id: pitchId, 'reviews.userId': mongoose.Types.ObjectId(user.id) },
      '+reviews',
    )
      .then((pitch) => {
        return resolve(true);
      })
      .catch((error) => {
        if (error.code == 404) {
          return resolve(false);
        } else {
          logger.error(
            `Error checking for pitch review from user: ${user.id}. Error: ${error.message}`,
          );
          return reject(error);
        }
      });
  });
}

/**
 * Search for pitches
 * @param user object that points to User which is performing the search
 * @param queryString string to search across title, description and tags
 * @param tags tags to search
 * @param skip how many results from the top to skip (used for paging)
 * @param limit number of results to show (used for paging)
 * @param sub flag that expands pitch nested objects
 * @param curated flag that change result sort from avgRate to totalRate
 * @param languages search pitches with pointed languages
 * @param excludeUserId user ID to exclude from search
 * @param reviewExcludeUserId user ID to exclude if this user posted at least 1 review for the pitch
 * @param groups user groups to filter result by
 * @param sortOldToNew
 * @returns {Promise<Macie2.BucketCountByEffectivePermission.unknown>}
 */
function search(
  user,
  queryString,
  tags,
  skip,
  limit,
  sub,
  curated,
  languages,
  excludeUserId,
  reviewExcludeUserId,
  groups,
  sortOldToNew,
) {
  let criteria = [],
    projection =
      '+reviews -reviews.avgRate -reviews.rate -reviews.submitDate -reviews.feedback -reviews.reviewFeedback -reviews._id',
    baseCriteria = { active: true, deleted: false, reviewed: true },
    sortingOptions = { publishedDate: sortOldToNew ? 1 : -1 };

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

  if (tags) {
    criteria.push({ tags: { $in: commonDal.processTags(tags) } });
  }

  if (groups) {
    criteria.push({ visibleGroups: { $in: commonDal.processTags(groups) } });
  }

  if (languages) {
    criteria.push({ language: { $in: commonDal.processTags(languages) } });
  }

  if (excludeUserId) {
    criteria.push({ userId: { $ne: excludeUserId } });
  }

  if (reviewExcludeUserId) {
    criteria.push({ 'reviews.userId': { $ne: reviewExcludeUserId } });
  }

  if (!curated) {
    sortingOptions.avgRate = -1;
  } else {
    sortingOptions.totalRate = -1;
  }

  if (criteria.length) {
    // sending a event bus message upon a pitch search
    eventbus.instance.emit(events.PITCH_SEARCH, null, {
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
      .then((foundPithces) => {
        resolve(addCanReviewFlag(user, foundPithces));
      })
      .catch((error) => {
        logger.error(`Pitch search has been failed: ${error.message}`);
        reject(error);
      });
  });
}

/**
 * Search for all pitches - admin only
 */
function searchAll(
  user,
  title,
  userName,
  userSurname,
  userRole,
  userEmail,
  userId,
  businessIdeaTitle,
  businessIdeaId,
  languages,
  skip,
  limit,
  sub,
  curated,
) {
  let pipeline = [],
    lookups = {},
    userFilter = {},
    sortingOptions = { totalRate: -1, updatedAt: -1 };

  if (title) {
    pipeline.push({
      $match: {
        $or: [{ $text: { $search: title } }, { title: { $regex: title, $options: 'i' } }],
      },
    });
  }

  if (user.role !== userRoles.ADMIN) {
    pipeline.push({
      $match: { active: true, reviewed: true, rejected: false },
    });
  }

  if (userId) {
    pipeline.push({
      $match: { userId: mongoose.Types.ObjectId(userId) },
    });
  }

  if (businessIdeaId) {
    pipeline.push({
      $match: { businessIdeaId: mongoose.Types.ObjectId(businessIdeaId) },
    });
  }

  let userField = sub ? 'userId' : '__lookup_user',
    businessIdeaField = sub ? 'businessIdeaId' : '__lookup_businessidea';

  if (sub) {
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'userId',
        as: userField,
        foreignField: '_id',
      },
    });

    pipeline.push({ $unwind: { path: `\$${userField}`, preserveNullAndEmptyArrays: true } });

    pipeline.push({
      $lookup: {
        from: 'businessideas',
        localField: 'businessIdeaId',
        as: businessIdeaField,
        foreignField: '_id',
      },
    });

    pipeline.push({
      $unwind: { path: `\$${businessIdeaField}`, preserveNullAndEmptyArrays: true },
    });

    lookups['userId'] = userField;
    lookups['businessIdeaId'] = businessIdeaField;
  }

  if (businessIdeaTitle) {
    let businessIdeaFilter = {};
    businessIdeaFilter[`${businessIdeaField}.title`] = { $regex: businessIdeaTitle, $options: 'i' };
    pipeline.push({ $match: businessIdeaFilter });
    sortingOptions[`${businessIdeaField}.title`] = 1;
  }

  if (userName) {
    userFilter[`${userField}.name`] = { $regex: userName, $options: 'i' };
    sortingOptions[`${userField}.name`] = 1;
  }

  if (userSurname) {
    userFilter[`${userField}.surname`] = { $regex: userSurname, $options: 'i' };
    sortingOptions[`${userField}.surname`] = 1;
  }

  if (userRole) {
    userFilter[`${userField}.role`] = { $regex: userRole, $options: 'i' };
    sortingOptions[`${userField}.role`] = 1;
  }

  if (userEmail) {
    userFilter[`${userField}.email`] = { $regex: userEmail, $options: 'i' };
    sortingOptions[`${userField}.email`] = 1;
  }

  if (languages) {
    pipeline.push({
      $match: { language: { $in: commonDal.processTags(languages) } },
    });
  }

  if (!_.isEmpty(userFilter)) {
    pipeline.push({ $match: userFilter });
  }

  if (!curated) {
    sortingOptions = { avgRate: -1, updatedAt: -1 };
  }

  return genericDal.aggregatePaginated(Pitch, pipeline, skip, limit, sortingOptions, lookups);
}

function addReview(user, review, pitchId) {
  // upon adding a review we need to calculate average review score
  if (review.rate) {
    let avgRate = _.meanBy(review.rate, function (o) {
      return o.reviewRating;
    });
    review.avgRate = parseFloat(_.round(avgRate, 2).toFixed(2));
  }

  let resultObject = new PitchReviewSchema(review, { id: false }),
    pitchObject = undefined;

  return new Promise((resolve, reject) => {
    findById(user, pitchId)
      .then((pitch) => {
        // sending reviews to an inactive pitch is not allowed
        if (!pitch.active) {
          reject(new errors.IllegalStateError('Pitch is inactive'));
          return;
        }

        let canReview = canUserReviewPitch(user, pitch);
        if (!canReview) {
          reject(new errors.PermissionAccessViolation(`User is not in group reviewers list`));
          return;
        }

        pitchObject = pitch;
      })
      .then(() => checkUserHasReviewedPitch(user, pitchId))
      .then((isUserEverReviewed) => {
        if (isUserEverReviewed) {
          logger.error(`User id ${user.id} has reviewed this pitch: ${pitchId}`);
          return reject(new errors.IllegalStateError(`User has already reviewed this pitch.`));
        }

        return pitchObject;
      })
      .then((pitch) => {
        let existingAvgRating = pitch.avgRate,
          newAvgRating = pitch.avgRate;

        // we update rating only if pitch rating is available
        if (review.avgRate) {
          newAvgRating = existingAvgRating
            ? _.round((existingAvgRating + review.avgRate) / 2, 2).toFixed(2)
            : review.avgRate;
        }

        return updatePitchImpl(user, pitchId, {
          $set: { avgRate: newAvgRating },
          $push: { reviews: resultObject._doc },
          $inc: { reviewsCount: 1 },
        });
      })
      .then((pitch) =>
        businessIdeaService.updatePitchRate(user, pitch.businessIdeaId, review.avgRate),
      )
      .then(() => resolve(resultObject.toObject()))
      .catch((error) => {
        logger.error(`Pitch review add has failed: ${error.message}`);
        reject(error);
      });
  });
}

function hasUserLeftFeedbackForReview(userId, reviewId, pitch) {
  const review = _.find(pitch.reviews, { id: reviewId });
  return review.reviewFeedback.every((obj) => obj.userId !== userId);
}

function addReviewToPitchReview(user, rate, pitchId, reviewId) {
  let reviewFeedback;
  return new Promise((resolve, reject) => {
    findPitchWithReviewsById(user, pitchId, false)
      .then((pitch) => {
        const userId = user.id == pitch.userId ? null : user.id;
        reviewFeedback = {
          rate: rate,
          date: new Date(),
          userId: userId,
        };

        //check if user has already leaves review for pitch review
        if (!hasUserLeftFeedbackForReview(userId, reviewId, pitch)) {
          reject(new errors.ObjectAlreadyExists('review with this user id'));
          return;
        }

        return Pitch.updateOne(
          { _id: pitchId, 'reviews._id': reviewId },
          { $push: { 'reviews.$.reviewFeedback': reviewFeedback } },
        );
      })
      .then(() => {
        resolve(reviewFeedback);
      })
      .catch((error) => {
        logger.error(`Pitch add review for pitch review has failed: ${error.message}`);
        reject(error);
      });
  });
}

function updateReviewToPitchReview(user, rate, pitchId, reviewId) {
  let updateObj;
  return new Promise((resolve, reject) => {
    findPitchWithReviewsById(user, pitchId, false)
      .then((pitch) => {
        const userId = user.id == pitch.userId ? null : user.id;
        updateObj = {
          rate: rate,
          userId: userId,
          date: new Date(),
        };
        return Pitch.updateOne(
          { _id: pitchId, 'reviews._id': reviewId },
          {
            $set: {
              'reviews.$.reviewFeedback.$[user].rate': updateObj.rate,
              'reviews.$.reviewFeedback.$[user].date': updateObj.date,
            },
          },
          { arrayFilters: [{ 'user.userId': userId }] },
        );
      })
      .then(() => {
        resolve(updateObj);
      })
      .catch((error) => {
        logger.error(`Pitch add review for pitch review has failed: ${error.message}`);
        reject(error);
      });
  });
}

function findReviewsToPitchReview(user, pitchId, reviewId) {
  return new Promise((resolve, reject) => {
    findReviewById(user, pitchId, reviewId)
      .then((review) => {
        resolve(review.reviewFeedback);
      })
      .catch((error) => {
        logger.error(`Get review to pitch review add has failed: ${error.message}`);
        reject(error);
      });
  });
}

function attachFilters(pitchObject) {
  pitchObject.filterOut = function (user) {
    return acl.filterOut(pitchObject, Pitch, user);
  };
  return pitchObject;
}

function findUnapproved(user, skip, limit) {
  return genericDal.findAllPaginated(PitchReviewQueue, {}, skip, limit, null, null, [
    { path: 'pitchId' },
    { path: 'businessIdeaId' },
    { path: 'userId' },
  ]);
}

function findPitchMentorsOrInvestorsById(user, id) {
  return findOneImpl(user, { _id: id }, null, 'network').then((pitch) => {
    return attachFilters(pitch);
  });
}

function addPitchDeck(user, pitchId, file) {
  return new Promise((resolve, reject) => {
    googleCloudStorageService
      .uploadToBucket(file)
      .then((uploadUrl) => updatePitchImpl(user, pitchId, { pitchDeckUrl: uploadUrl }))
      .then((updatedPitch) => {
        resolve(updatedPitch);
      })
      .catch((error) => {
        logger.error(`Pitch deck update ${pitchId} failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      })
      .finally(() => {
        // removing local file
        fs.unlinkSync(file.path);
      });
  });
}

function removePitchDeck(user, pitchId, updatorRole) {
  return new Promise((resolve, reject) => {
    findById(user, pitchId)
      .then((pitch) => googleCloudStorageService.removeFromBucket(pitch.pitchDeckUrl))
      .then(() => updatePitch(user, pitchId, { pitchDeckUrl: null }))
      .then((updatedPitch) => resolve(updatedPitch))
      .catch((error) => {
        logger.error(`Pitch deck removal ${pitchId} has failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

function updatePitchStatusLikeNumber(user, pitchId) {
  return new Promise((resolve, reject) => {
    genericDal
      .updateOne(Pitch, pitchId, { $inc: { likes: 1 } }, user.role)
      .then((pitchUpdated) => {
        return resolve(pitchUpdated);
      })
      .catch((error) => {
        logger.error(`Update Pitch like number has failed: ${error.message}`);
        reject(error);
      });
  });
}

function updatePitchStatusUnlikeNumber(user, pitchId) {
  return new Promise((resolve, reject) => {
    findById(user, pitchId)
      .then((pitchResult) => {
        let { likes } = pitchResult;

        if (!likes) {
          return genericDal.updateOne(Pitch, pitchId, { likes: 0 }, user.role);
        } else {
          return genericDal.updateOne(Pitch, pitchId, { $inc: { likes: -1 } }, user.role);
        }
      })
      .then((pitchUpdated) => {
        return resolve(pitchUpdated);
      })
      .catch((error) => {
        logger.error(`Update Pitch like number has failed: ${error.message}`);
        reject(error);
      });
  });
}

function updatePitchStatusViewNumber(user, pitchId) {
  return new Promise((resolve, reject) => {
    genericDal
      .updateOne(Pitch, pitchId, { $inc: { views: 1 } }, user.role)
      .then((pitchUpdated) => {
        return resolve(pitchUpdated);
      })
      .catch((error) => {
        logger.error(`Update Pitch like number has failed: ${error.message}`);
        reject(error);
      });
  });
}

function findPitchBookmarkCount(user, pitchId) {
  return new Promise((resolve, reject) => {
    bookmarkService
      .findCountById(pitchId)
      .then((bookmarkPitchCount) => {
        return resolve({ bookmarkCount: bookmarkPitchCount });
      })
      .catch((error) => {
        logger.error(`Get bookmark count for pitch ${pitchId} has failed: ${error.message}`);
        reject(error);
      });
  });
}

function requestPitchDeck(user, pitchId) {
  return findById(user, pitchId).then((pitch) => {
    return checkActionNotificationNotExist(
      user,
      pitch.userId,
      notificationTypes.PITCH_DECK_REQUEST,
    ).then(() => {
      return createNotificationWithConfirmation(
        new NotificationBuilder()
          .setUsers(pitch.userId, user.id)
          .setType(notificationTypes.PITCH_DECK_REQUEST)
          .setReferenceObject(pitchId, 'Pitch')
          .setActionRequired(),
        new NotificationBuilder()
          .setUsers(user.id, pitch.userId)
          .setType(notificationTypes.PITCH_DECK_REQUEST_SENT)
          .setReferenceObject(pitchId, 'Pitch'),
      );
    });
  });
}

function processPitchDeckRequestResponse(user, notification, response, payload) {
  const responseNotification = new NotificationBuilder()
    .setUsers(notification.createdBy, user.id)
    .setReferenceObject(
      notification.referenceObject.reference,
      notification.referenceObject.referenceModel,
    );
  const confirmationNotification = new NotificationBuilder()
    .setUsers(user.id, notification.createdBy)
    .setReferenceObject(
      notification.referenceObject.reference,
      notification.referenceObject.referenceModel,
    );

  if (response === actionResponses.ACCEPTED) {
    return createNotificationWithConfirmation(
      responseNotification
        .setType(notificationTypes.PITCH_DECK_REQUEST_ACCEPTED)
        .setPayload(payload.value),
      confirmationNotification.setType(notificationTypes.PITCH_DECK_REQUEST_ACCEPTED_CONFIRMATION),
    );
  } else if (response === actionResponses.REJECTED) {
    return createNotificationWithConfirmation(
      responseNotification.setType(notificationTypes.PITCH_DECK_REQUEST_REJECTED),
      confirmationNotification.setType(notificationTypes.PITCH_DECK_REQUEST_REJECTED_CONFIRMATION),
    );
  }

  throw new errors.InvalidArgumentError(`Invalid response: ${response}`);
}

module.exports = {
  createPitch: createPitch,
  deletePitch: deletePitch,
  updatePitch: updatePitch,
  updatePitches: updatePitches,
  findById: findById,
  handleVideoUpload: handleVideoUpload,
  sendToUser: sendToUser,
  handlePosterPhotoUpload: handlePosterPhotoUpload,
  submit: submit,
  revoke: revoke,
  findActiveUserPitches: findActiveUserPitches,
  findUserPitches: findUserPitches,
  findUsersActivePitches: findUsersActivePitches,
  search: search,
  searchAll: searchAll,
  findByBusinessIdea: findByBusinessIdea,
  addReview: addReview,
  addReviewToPitchReview: addReviewToPitchReview,
  updateReviewToPitchReview: updateReviewToPitchReview,
  findReviewsToPitchReview: findReviewsToPitchReview,
  findPitchWithReviewsById: findPitchWithReviewsById,
  findPitchMentorsOrInvestorsById: findPitchMentorsOrInvestorsById,
  findReviewById: findReviewById,
  findWithUnhandledVideos: findWithUnhandledVideos,
  findUnapproved: findUnapproved,
  passReview: passReview,
  failReview: failReview,
  findMany: findManyImpl,
  addPitchDeck: addPitchDeck,
  removePitchDeck: removePitchDeck,
  updatePitchStatusLikeNumber: updatePitchStatusLikeNumber,
  updatePitchStatusUnlikeNumber: updatePitchStatusUnlikeNumber,
  updatePitchStatusViewNumber: updatePitchStatusViewNumber,
  findPitchBookmarkCount: findPitchBookmarkCount,
  requestPitchDeck: requestPitchDeck,
  processPitchDeckRequestResponse: processPitchDeckRequestResponse,
};
