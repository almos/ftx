const mongoose = require('mongoose');
const User = mongoose.model('User');
const UserFeedback = mongoose.model('UserFeedback');
const OrganizationMappings = mongoose.model('OrganizationMappings');
const GroupMappings = mongoose.model('GroupMappings');
const dataAcl = require('../models/acl');
const _ = require('lodash');
const logger = require('./logger').instance;
const errors = require('./error');
const googleCloudStorageService = require('./cloud-storage');
const genericDal = require('./dal/generic');
const eventbus = require('./eventbus');
const events = eventbus.events;
const fs = require('fs');
const commonDal = require('../models/common');
const {
  notificationTypes,
  notificationStatus,
  actionResponses,
} = require('../config/notification');
const {
  NotificationBuilder,
  createNotificationWithConfirmation,
  checkActionNotificationNotExist,
} = require('./notification');
const { userRoles } = require('../config/security');
const base = require('./base');
const fileService = require('./file');
const firebaseService = require('./firebase');
const Mustache = require('mustache');
const agenda = require('../config/beans/agenda');
const { getApiUrl } = require('../config');
const { readFile } = require('../utils/fileutils');

/**
 * Finds user in database by e-mail address
 */
function findByEmail(email) {
  return findImpl({ email: email });
}

/**
 * Finds user in database by internal ID
 */
function findById(id) {
  return findImpl({ _id: mongoose.Types.ObjectId(id) });
}

/**
 * Generic user search implementation in database
 */
function findImpl(searchCriteria) {
  return genericDal.findOne(User, searchCriteria, undefined, ['organization', 'groups']);
}

/**
 * Generic user search implementation in database to fetch mentors
 */
function findUserMentors(searchCriteria) {
  return genericDal.findOne(User, searchCriteria, undefined, ['mentors']);
}

/**
 * Generic user search implementation in database to fetch investors
 */
function findUserInvestors(searchCriteria) {
  return genericDal.findOne(User, searchCriteria, undefined, ['investors']);
}

/**
 * Updates single user entry by internal ID in database.
 * Returns updated document
 */
function updateUser(uid, userData, updatorRole) {
  return updateUserImpl(uid, userData, updatorRole);
}

/**
 * Updates single user entry by internal ID in database with a filter
 * Returns updated document
 */
function updateUserWithFilter(uid, filter, userData, updatorRole) {
  return updateUserWithFilterImpl(uid, filter, userData, updatorRole);
}

/**
 * Marks user as removed in database
 */
function deleteUser(uid) {
  return updateUserImpl(uid, { deleted: true });
}

/**
 * Generic user update implementation in database
 */
function updateUserImpl(uid, updateFields, updatorRole) {
  return genericDal.updateOne(User, uid, updateFields, updatorRole);
}

/**
 * Generic user update implementation in database with filter
 */
function updateUserWithFilterImpl(uid, filter, updateFields, updatorRole) {
  return genericDal.updateOneWithFilter(User, uid, filter, updateFields, updatorRole);
}

function findOrganizationMapping(userData) {
  return genericDal
    .findAll(OrganizationMappings, { email: userData.email }, null, null, ['organization'])
    .then((mappings) => {
      return mappings.length ? mappings[0].organization : null;
    });
}

function findGroupMapping(userData) {
  return genericDal.findAll(GroupMappings, { email: userData.email }).then((mappings) => {
    return mappings.length
      ? _.map(mappings, function (item) {
          return item.group;
        })
      : [];
  });
}

/**
 * Generic user search implementation in database
 */
function findManyImpl(searchCriteria, skip, limit) {
  return genericDal.findAll(User, searchCriteria, skip, limit);
}

/**
 * Search for users
 */
function search(
  user,
  queryString,
  email,
  name,
  surname,
  orgName,
  orgId,
  role,
  userId,
  groupName,
  groupId,
  languages,
  skip,
  limit,
  sub,
) {
  let pipeline = [],
    lookups = {},
    match = {};

  if (queryString) {
    pipeline.push({
      $match: {
        $or: [
          { $text: { $search: queryString } },
          { email: { $regex: queryString, $options: 'i' } },
          { name: { $regex: queryString, $options: 'i' } },
          { surname: { $regex: queryString, $options: 'i' } },
        ],
      },
    });
  }

  if (orgId) {
    pipeline.push({
      $match: { organization: mongoose.Types.ObjectId(orgId) },
    });
  }

  if (groupId) {
    pipeline.push({
      $match: { groups: { $in: [mongoose.Types.ObjectId(groupId)] } },
    });
  }

  if (languages) {
    pipeline.push({
      $match: { language: { $in: commonDal.processTags(languages) } },
    });
  }

  let orgField = sub ? 'organization' : '__lookup_organization',
    groupsField = sub ? 'groups' : '__lookup_groups';

  if (sub) {
    pipeline.push({
      $lookup: {
        from: 'organizations',
        localField: 'organization',
        as: orgField,
        foreignField: '_id',
      },
    });

    pipeline.push({ $unwind: { path: `\$${orgField}`, preserveNullAndEmptyArrays: true } });

    pipeline.push({
      $lookup: {
        from: 'groups',
        localField: 'groups',
        as: groupsField,
        foreignField: '_id',
      },
    });

    lookups['organization'] = orgField;
    lookups['groups'] = groupsField;
  }

  if (orgName) {
    let orgFilter = {};
    orgFilter[`${orgField}.title`] = { $regex: orgName, $options: 'i' };
    pipeline.push({ $match: orgFilter });
  }

  if (groupName) {
    let groupFilter = {};
    groupFilter[`${groupsField}.title`] = { $regex: groupName, $options: 'i' };
    pipeline.push({ $match: groupFilter });
  }

  if (email) {
    pipeline.push({
      $match: { email: { $regex: email, $options: 'i' } },
    });
  }

  if (name) {
    pipeline.push({
      $match: { name: { $regex: name, $options: 'i' } },
    });
  }

  if (surname) {
    pipeline.push({
      $match: { surname: { $regex: surname, $options: 'i' } },
    });
  }

  if (role) {
    pipeline.push({
      $match: { role: { $regex: role, $options: 'i' } },
    });
  }

  if (userId) {
    pipeline.push({
      $match: { _id: mongoose.Types.ObjectId(userId) },
    });
  }

  if (user.role !== userRoles.ADMIN) {
    pipeline.push({ $match: { role: { $ne: userRoles.ADMIN } } });
    pipeline.push({
      $project: { id: 1, name: 1, surname: 1, role: 1, avatarUrl: 1, displayJobTitle: 1 },
    });
  }

  return genericDal.aggregatePaginated(User, pipeline, skip, limit, null, lookups);
}

/**
 * Creates user entry in database
 */
function createUser(firebaseId, userData) {
  let linkedOrganization = null,
    linkedGroups = null;

  return new Promise((resolve, reject) => {
    findByEmail(userData.email)
      .then((result) => {
        reject(new errors.ObjectAlreadyExists(userData.email));
      })
      .catch(() => {
        return findOrganizationMapping(userData)
          .then((org) => {
            linkedOrganization = org;
          })
          .then(() => findGroupMapping(userData))
          .then((groups) => {
            linkedGroups = groups;
          });
      })
      .then(() => {
        let fieldsToSet = {
          firebaseId: firebaseId,
          organization: linkedOrganization ? linkedOrganization.id : null,
          groups: linkedGroups,
        };

        return genericDal.createOne(User, _.merge(userData, fieldsToSet));
      })
      .then((record) => {
        // sending a event bus message upon a user register
        eventbus.instance.emit(events.USER_REGISTER, null, {
          org: linkedOrganization ? linkedOrganization.tenantAlias : null,
        });

        resolve(record);
      })
      .catch((error) => {
        logger.error(`Database user ${userData.email} creation failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

async function createFirebaseUser(email, password) {
  try {
    let fbRecord = await firebaseService.createUser(email, password);
    if (fbRecord.uid) {
      logger.info(
        `Firebase user ${email} has been created. Firebase reply: ${JSON.stringify(fbRecord)}`,
      );
      return fbRecord;
    }
  } catch (error) {
    throw new Error(`Firebase user ${email} creation filed: ${error.message}`);
  }
}

async function createDBUser(fbUID, user) {
  try {
    let DBUser = await createUser(fbUID, user);
    return DBUser;
  } catch (error) {
    // we were not able to create user in database
    // rolling back out firebase user
    logger.warn(`Removing partial Firebase state by removing user ${fbUID}`);
    await firebaseService.deleteUser(fbUID);
    throw new Error(error);
  }
}

/**
 * Creates new user or update existing
 * @param req request object
 * @param res response object
 */
async function createUserOrUpdateExisted(userObj, sendValidationEmailFlag = false) {
  let userEmail = userObj.email.toLowerCase(),
    userPassword = generatePassword('FTX', 4);
  try {
    let user = await findByEmail(userEmail);
    if (user.email) {
      let { email } = await updateUser(user.id, userObj);
      return {};
    }
  } catch (error) {
    if (error.name == 'EntityNotFoundError') {
      try {
        let fbRecord = await createFirebaseUser(userEmail, userPassword),
          { email } = await createDBUser(fbRecord.uid, userObj);

        if (sendValidationEmailFlag) {
          await sendVerifyEmail(userEmail);
          logger.info(`Validation email to ${userEmail} has been sent`);
        }

        return { email: email, password: userPassword };
      } catch (error) {
        throw new Error(`User creation filed ${error.message}`);
      }
    } else {
      throw new Error(`${error.message}`);
    }
  }
}

function generatePassword(passwordPrefix, passwordRandomPartLength) {
  return `${passwordPrefix}-${base.generateRandomAlphanumeric(passwordRandomPartLength)}`;
}

function sendVerifyEmail(userEmail) {
  return firebaseService.getEmailValidationLink(userEmail).then(async (verificationLink) => {
    const templatePath = './views/verifyEmail.html';
    const source = await readFile(templatePath);

    const html = Mustache.render(source, {
      verificationLink: verificationLink,
      ftLogoUrl: `${getApiUrl()}/images/ftLogoColour.png`,
    });

    let email = {
      html: html,
      subject: 'FTX email verification',
      recipient: userEmail,
    };
    agenda.run(agenda.jobs.EMAIL_SEND, email);
  });
}

function addAvatar(userId, file, updatorRole) {
  return new Promise((resolve, reject) => {
    googleCloudStorageService
      .uploadToBucket(file)
      .then((uploadUrl) => updateUser(userId, { avatarUrl: uploadUrl }, updatorRole))
      .then((updatedUser) => {
        // removing local file
        fs.unlinkSync(file.path);

        resolve(updatedUser);
      })
      .catch((error) => {
        logger.error(`User avatar update ${userId} failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

function removeAvatar(userId, updatorRole) {
  return new Promise((resolve, reject) => {
    findById(userId)
      .then((user) => googleCloudStorageService.removeFromBucket(user.avatarUrl))
      .then(() => updateUser(userId, { avatarUrl: null }, updatorRole))
      .then((updatedUser) => resolve(updatedUser))
      .catch((error) => {
        logger.error(`User avatar removal ${userId} has failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

const createProfileWorkExperienceItemPayload = (itemId, requestBody) => {
  return {
    $push: {
      workExperience: {
        _id: itemId,
        ...requestBody,
      },
    },
  };
};

const createProfileEducationItemPayload = (itemId, requestBody) => {
  return {
    $push: {
      education: {
        _id: itemId,
        ...requestBody,
      },
    },
  };
};

const workExperienceCrudConfig = {
  createFilter: (itemId) => {
    return { 'workExperience._id': itemId };
  },
  createInsertPayload: createProfileWorkExperienceItemPayload,
  createUpdatePayload: (payload) => {
    return { 'workExperience.$': payload };
  },
  createUpdateLogoPayload: (uploadUrl) => {
    return { 'workExperience.$.imageUrl': uploadUrl };
  },
};

const educationCrudConfig = {
  createFilter: (itemId) => {
    return { 'education._id': itemId };
  },
  createInsertPayload: createProfileEducationItemPayload,
  createUpdatePayload: (payload) => {
    return { 'education.$': payload };
  },
  createUpdateLogoPayload: (uploadUrl) => {
    return { 'education.$.imageUrl': uploadUrl };
  },
};

function addProfileItem(userId, itemType, itemId, request, file, updatorRole) {
  let createPayload;
  switch (itemType) {
    case 'workexperience':
      createPayload = createProfileWorkExperienceItemPayload;
      break;
    case 'education':
      createPayload = createProfileEducationItemPayload;
      break;
    default:
      const errorMessage = 'Item type error. Item type does not match any in defined set';
      logger.error(`Logo update for ${userId} failed: ${errorMessage}`);
      throw new errors.InvalidArgumentError(errorMessage);
  }

  return updateUser(userId, createPayload(itemId, request.body), updatorRole).then((result) => {
    return file ? updateProfileItemLogo(userId, itemType, itemId, file, updatorRole) : result;
  });
}

function updateProfileItem(userId, itemType, itemId, request, file, updatorRole) {
  let itemUpdateConfig;

  switch (itemType) {
    case 'workexperience':
      itemUpdateConfig = workExperienceCrudConfig;
      break;
    case 'education':
      itemUpdateConfig = educationCrudConfig;
      break;
    default:
      const errorMessage = 'Item type error. Item type does not match defined set';
      logger.error(`Item update for ${userId} failed: ${errorMessage}`);
      throw new errors.InvalidArgumentError(errorMessage);
  }

  return new Promise((resolve, reject) => {
    updateUserWithFilter(
      userId,
      itemUpdateConfig.createFilter(itemId),
      itemUpdateConfig.createUpdatePayload(request.body),
      updatorRole,
    )
      .then((result) => {
        if (file) {
          return updateProfileItemLogo(userId, itemType, itemId, file, updatorRole);
        }
        return result;
      })
      .then((updatedUser) => resolve(updatedUser))
      .catch((error) => {
        logger.error(`Item update for ${userId} failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

function updateProfileItemLogo(userId, itemType, itemId, file, updatorRole) {
  let logoUpdateConfig;

  switch (itemType) {
    case 'workexperience':
      logoUpdateConfig = workExperienceCrudConfig;
      break;
    case 'education':
      logoUpdateConfig = educationCrudConfig;
      break;
    default:
      const errorMessage = 'Image type error. Image type does not match defined set';
      logger.error(`Logo update for ${userId} failed: ${errorMessage}`);
      throw new errors.InvalidArgumentError(errorMessage);
  }

  return new Promise((resolve, reject) => {
    googleCloudStorageService
      .uploadToBucket(file)
      .then((uploadUrl) =>
        updateUserWithFilter(
          userId,
          logoUpdateConfig.createFilter(itemId),
          logoUpdateConfig.createUpdateLogoPayload(uploadUrl),
          updatorRole,
        ),
      )
      .then((updatedUser) => {
        fs.unlinkSync(file.path);
        resolve(updatedUser);
      })
      .catch((error) => {
        logger.error(`Logo update for ${userId} failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

function removeProfileItem(userId, itemType, itemId, updatorRole) {
  let itemDeleteRequest;

  switch (itemType) {
    case 'workexperience':
      itemDeleteRequest = { $pull: { workExperience: { _id: itemId } } };
      break;
    case 'education':
      itemDeleteRequest = { $pull: { education: { _id: itemId } } };
      break;
    default:
      const errorMessage = 'Item type error. Item type does not match defined set';
      logger.error(`Item update for ${userId} failed: ${errorMessage}`);
      throw new errors.InvalidArgumentError(errorMessage);
  }

  return updateUser(userId, itemDeleteRequest, updatorRole);
}

function insertUserAppFeedback(user, feedbackText) {
  let userId = user.id;

  let feedbackObject = {
    userId,
    feedbackText: feedbackText.trim(),
  };

  return genericDal.createOne(UserFeedback, feedbackObject, user.role);
}

function getAllUserAppFeedback(pagingObject) {
  let { page, pageSize, skip } = pagingObject;
  let searchCriteria = {};

  let sortingOptions = { createdAt: -1 };

  return genericDal.findAllPaginated(UserFeedback, searchCriteria, skip, pageSize, sortingOptions);
}

function addToGroup(userId, groupId) {
  return updateUser(userId, { $push: { groups: groupId } });
}

function createMeetingRequest(requesterUser, requesteeUserId) {
  return new Promise((resolve, reject) => {
    findById(requesteeUserId)
      .then((requesteeUser) => {
        validationRequesterAndRequesteeIsNotSame(requesterUser.id, requesteeUserId);
        return requesteeUser;
      })
      .then(() => {
        return checkActionNotificationNotExist(
          requesterUser,
          requesteeUserId,
          notificationTypes.MEETING_REQUEST,
        );
      })
      .then(() => {
        return createMeetingRequestNotifications(requesterUser, requesteeUserId);
      })
      .then((requesteeNotification) => {
        return resolve(requesteeNotification);
      })
      .catch((error) => {
        logger.error(`createMeetingRequest fail :`, error.message);
        return reject(error);
      });
  });
}

const processUserMeetingRequestResponse = (user, notification, actionResponse, payload) => {
  let requesterObj = new NotificationBuilder();
  requesterObj.setUsers(notification.createdBy, user.id);

  let requesteeObj = new NotificationBuilder();
  requesteeObj.setUsers(user.id, notification.createdBy);

  if (actionResponse === actionResponses.ACCEPTED) {
    if (!user.calendlyUrl) {
      let errorMessage = `You as userId ${user.id} do not have calendlyUrl data.`;
      logger.error(errorMessage);
      throw new errors.InvalidArgumentError(errorMessage);
    }
    requesterObj
      .setType(notificationTypes.MEETING_REQUEST_ACCEPTED)
      .setPayload(user.calendlyUrl)
      .sendPushNotification();
    requesteeObj.setType(notificationTypes.MEETING_REQUEST_ACCEPTED_CONFIRMATION);
  }

  if (actionResponse === actionResponses.REJECTED) {
    requesterObj.setType(notificationTypes.MEETING_REQUEST_REJECTED);
    requesteeObj.setType(notificationTypes.MEETING_REQUEST_REJECTED_CONFIRMATION);
  }

  return createNotificationWithConfirmation(requesterObj, requesteeObj);
};

function insertDevice(user, deviceObject) {
  return updateUser(user.id, { $push: { devices: deviceObject } }, user.role);
}

function refreshDevice(user, deviceObject) {
  const filter = {
    _id: user.id,
    'devices.fcmRegistrationToken': deviceObject.fcmRegistrationToken,
  };
  return findImpl(filter)
    .then(() => {
      return updateUserWithFilter(
        user.id,
        filter,
        { 'devices.$.timestamp': new Date() },
        user.role,
      );
    })
    .catch((error) => {
      if (error instanceof errors.EntityNotFoundError) {
        return insertDevice(user, deviceObject);
      }
      return Promise.reject(error);
    });
}

function deleteDevice(user, deviceToken) {
  return updateUser(
    user.id,
    { $pull: { devices: { fcmRegistrationToken: deviceToken } } },
    user.role,
  );
}

function createUserOrUpdateExistedImpl(userObj) {
  return createUserOrUpdateExisted(userObj);
}

function importUsersFromCsv(user, pathToFile) {
  return new Promise((resolve, reject) => {
    fileService
      .importItemsFromCsv(user, pathToFile, createUserOrUpdateExistedImpl)
      .then((results) => {
        resolve(results);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

module.exports = {
  findById: findById,
  findByEmail: findByEmail,
  createUser: createUser,
  updateUser: updateUser,
  deleteUser: deleteUser,
  search: search,
  addAvatar: addAvatar,
  addProfileItem: addProfileItem,
  updateProfileItem: updateProfileItem,
  removeProfileItem: removeProfileItem,
  removeAvatar: removeAvatar,
  findMany: findManyImpl,
  insertUserAppFeedback,
  getAllUserAppFeedback,
  addToGroup: addToGroup,
  createMeetingRequest,
  processUserMeetingRequestResponse,
  refreshDevice: refreshDevice,
  importUsersFromCsv: importUsersFromCsv,
  sendVerifyEmail: sendVerifyEmail,
  findUserInvestors,
  findUserMentors,
};

const validationRequesterAndRequesteeIsNotSame = (requesterUserId, requesteeUserId) => {
  if (requesterUserId == requesteeUserId) {
    let errorMessage = `User cannot create meeting request to yourself.`;
    logger.error('The validation Requester And Requestee is same people');
    throw new errors.InvalidArgumentError(errorMessage);
  }
};

const createMeetingRequestNotifications = (requesterUser, requesteeUserId) => {
  return new Promise((resolve, reject) => {
    let requesteeNotiObj = new NotificationBuilder();
    requesteeNotiObj
      .setUsers(requesteeUserId, requesterUser.id)
      .setType(notificationTypes.MEETING_REQUEST)
      .setActionRequired()
      .sendPushNotification();

    let requesterNotiObj = new NotificationBuilder();
    requesterNotiObj
      .setUsers(requesterUser.id, requesteeUserId)
      .setType(notificationTypes.MEETING_REQUEST_SENT);

    createNotificationWithConfirmation(requesteeNotiObj, requesterNotiObj)
      .then((requesteeNotification) => {
        return resolve(requesteeNotification);
      })
      .catch((error) => {
        logger.error('createMeetingRequestNotifications', 'error', error.message);
        return reject(error);
      });
  });
};
