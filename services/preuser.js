const mongoose = require('mongoose');
const PreUser = mongoose.model('PreUser');
const _ = require('lodash');
const logger = require('./logger').instance;
const errors = require('./error');
const genericDal = require('./dal/generic');
const base = require('./base');
const agenda = require('../config/beans/agenda');
const config = require('../config/index');
const { parseBool } = require('../utils/typeutils');
const { readFile } = require('../utils/fileutils');
const Mustache = require('mustache');
const { getApiUrl } = require('../config');
const soundex = require('soundex-code');
const fileService = require('../services/file');

/**
 * Finds pre-user in database by e-mail address
 */
function findByEmail(email) {
  return findImpl({ 'userData.email': email });
}

/**
 * Finds pre-user in database by internal ID
 */
function findById(preUserId) {
  return findImpl({ _id: mongoose.Types.ObjectId(preUserId) });
}

/**
 * Finds pre-user in database by invite code ID
 */
function findByInviteCode(code) {
  return findImpl({ inviteCode: code });
}

/**
 * Generic pre-user search implementation in database
 */
function findImpl(searchCriteria) {
  return genericDal.findOne(PreUser, searchCriteria, undefined, ['organization', 'groups']);
}

/**
 * Updates single pre-user entry by internal ID in database.
 * Returns updated document
 */
function updatePreUser(currentUser, preUserId, userData) {
  return updatePreUserImpl(currentUser, preUserId, userData);
}

/**
 * Generic user update implementation in database
 */
function updatePreUserImpl(currentUser, preUserId, updateFields) {
  return genericDal.updateOne(PreUser, preUserId, updateFields, currentUser.role);
}

/**
 * Delete single pre-user entry by internal ID in database.
 * Returns deleted document
 */
function deletePreUser(preUserId) {
  return genericDal.deleteOne(PreUser, preUserId);
}

/**
 * Search for pre-users
 * @param queryString - string to search across title, description and tags
 * @param email - pre-user email
 * @param role - pre-user role
 * @param name - pre-user name
 * @param surname - pre-user surname
 * @param inviteCodeSent flag that shows is invitation code has already been sent
 * @param skip how many results from the top to skip (used for paging)
 * @param limit number of results to show (used for paging)
 */
function search(queryString, email, role, name, surname, inviteCodeSent, skip, limit) {
  let criteria = [],
    populate = undefined,
    projection = undefined;

  if (queryString) {
    criteria.push({
      $or: [
        { $text: { $search: queryString } },
        { 'userData.name': { $regex: queryString, $options: 'i' } },
      ],
      $or: [
        { $text: { $search: queryString } },
        { 'userData.surname': { $regex: queryString, $options: 'i' } },
      ],
      $or: [
        { $text: { $search: queryString } },
        { 'userData.email': { $regex: queryString, $options: 'i' } },
      ],
    });
  }

  if (email) {
    criteria.push({ 'userData.email': { $regex: email, $options: 'i' } });
  }

  if (role) {
    criteria.push({ 'userData.role': role });
  }

  if (name) {
    criteria.push({ 'userData.name': { $regex: name, $options: 'i' } });
  }

  if (surname) {
    criteria.push({ 'userData.surname': { $regex: surname, $options: 'i' } });
  }

  if (inviteCodeSent != undefined) {
    criteria.push({ inviteCodeSent: inviteCodeSent });
  }

  return genericDal.findAllPaginated(
    PreUser,
    criteria.length ? { $and: criteria } : {},
    skip,
    limit,
    { createdAt: -1 },
    projection,
    populate,
  );
}

/**
 * Generates invite code
 * @param email
 * @returns {string}
 */
function generateInviteCode(email) {
  // We need to generate a compact code that user can easily type in the app
  // at the same time we should make it unique. For this purpose we compose it of 2 parts
  // soundex taken from the email limited to 4 characters and 4 random alphanumerics
  let emailPrefix = email.slice(0, email.indexOf('@')),
    soundexHash = soundex(emailPrefix, 4).toLowerCase(),
    code = base.generateRandomAlphanumeric()[0].toLowerCase();

  return `${soundexHash}-${code}`;
}

/**
 * Creates pre-user entry in database
 */
function createPreUser(currentUser, preUser, sendInvite) {
  let preUserEmail = preUser.userData.email;

  return new Promise((resolve, reject) => {
    findByEmail(preUserEmail)
      .then((result) => {
        reject(new errors.ObjectAlreadyExists(preUserEmail));
      })
      .catch(async () => {
        let inviteCode = { inviteCode: generateInviteCode(preUserEmail) },
          preUserData = _.merge(preUser, inviteCode);

        let preUserPersisted = await genericDal.createOne(PreUser, preUserData);
        if (sendInvite) {
          preUserPersisted = await sendInviteNotification(currentUser, preUserPersisted.id);
        }

        resolve(preUserPersisted);
      })
      .catch((error) => {
        logger.error(`Database pre-user ${preUserEmail} creation failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

/**
 * Creates pre-user entry in database or update if user with such email is already exists
 */
async function createPreUserOrUpdateExisted(preUser) {
  return new Promise((resolve, reject) => {
    let preUserEmail = preUser.userData.email,
      inviteCode = { inviteCode: generateInviteCode(preUserEmail) };
    findByEmail(preUserEmail)
      .then((existedPreUser) => {
        return genericDal.updateOne(PreUser, existedPreUser.id, _.merge(existedPreUser, preUser));
      })
      .catch(() => {
        return genericDal.createOne(PreUser, _.merge(preUser, inviteCode));
      })
      .then((record) => {
        resolve();
      })
      .catch((error) => {
        logger.error(`Database pre-user ${preUserEmail} creation failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

/**
 * Send invite code notification to user email
 */
function sendInviteNotification(currentUser, preUserId) {
  return new Promise((resolve, reject) => {
    updatePreUser(currentUser, preUserId, { inviteCodeSent: true, inviteCodeSentDt: Date.now() })
      .then(async (preUser) => {
        const templatePath = './views/preuserInvite.html';
        const source = await readFile(templatePath);

        const html = Mustache.render(source, {
          inviteCode: preUser.inviteCode,
          name: preUser.userData.name,
          ftLogoUrl: `${getApiUrl()}/images/ftLogoColour.png`,
        });
        let email = {
          html: html,
          subject: 'FTX invitation',
          recipient: preUser.userData.email,
        };

        agenda.run(agenda.jobs.EMAIL_SEND, email);
        resolve(preUser);
      })
      .catch((error) => {
        logger.error(`Database pre-user ${preUserId} creation failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

async function sendMultiInviteNotifications(currentUser, preUserIds) {
  // pre-user list of successfully sent notification
  let sentList = [];

  for (let preUserId of preUserIds) {
    try {
      await sendInviteNotification(currentUser, preUserId);
      sentList.push(preUserId);
    } catch (error) {
      logger.error(`Database pre-user ${preUserId} creation failed: ${error.message}`);
    }
  }

  return sentList;
}

function createPreUserOrUpdateExistedImpl(preUserObj) {
  return createPreUserOrUpdateExisted({ userData: preUserObj });
}

function importPreUsersFromCsv(user, pathToFile) {
  return new Promise((resolve, reject) => {
    fileService
      .importItemsFromCsv(user, pathToFile, createPreUserOrUpdateExistedImpl)
      .then((results) => {
        resolve(results);
      })
      .catch((error) => {
        reject(error);
      });
  });
}

module.exports = {
  search: search,
  findById: findById,
  findByEmail: findByEmail,
  findByInviteCode: findByInviteCode,
  createPreUser: createPreUser,
  updatePreUser: updatePreUser,
  deletePreUser: deletePreUser,
  sendInviteNotification: sendInviteNotification,
  sendMultiInviteNotifications: sendMultiInviteNotifications,
  importPreUsersFromCsv: importPreUsersFromCsv,
};
