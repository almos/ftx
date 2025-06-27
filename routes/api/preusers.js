const router = require('express').Router();

const { body, check, query, param } = require('express-validator');
const authn = require('../auth/authn');
const authz = require('../auth/authz');
const preUserService = require('../../services/preuser');
const errors = require('../../services/error');
const validate = require('../validate');
const acl = require('../../config/security').permissions;
const objects = require('../../config/security').objects;
const logger = require('../../services/logger').instance;
const roles = require('../../config/security').userRoles;
const _ = require('lodash');
const baseHandler = require('./base');
const commonValidation = require('./validation');
const { requestRateLimiter } = require('../../config/beans/rate-limiter');
const { parseBool } = require('../../utils/typeutils');
const multer = require('multer');
const config = require('../../config');
const upload = multer({ dest: config.videoTempUploadDir });

/**
 * Validation rules
 */
const preUserValidation = {
  id: body('id').isAlphanumeric(),
  email: body('userData.email').isEmail(),
  anyRole: body('userData.role').isIn(_.values(roles)),
  inviteCodeSent: body('inviteCodeSent').isBoolean(),
  preUserIds: body('preUserIds').isArray().notEmpty(),
};

/**
 * Creates new pre-user - Admin endpoint
 */
router.put(
  '/',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.PREUSER),

    // request validation rules
    preUserValidation.email,
    preUserValidation.anyRole.optional(),
    query('notify').isBoolean().optional(),
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    logger.info(`Got request to create new pre-user by ${currentUser.email}`);

    let preUserEmail = req.body.userData.email.toLowerCase(),
      sendInvite = parseBool(req.query.notify);

    preUserService
      .createPreUser(currentUser, req.body, sendInvite)
      .then(async (preUser) => {
        logger.info(`Pre-user ${preUserEmail} has been created`);
        return res.json({ payload: preUser.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Pre-user ${preUserEmail} creation has failed`, next);
      });
  },
);

/**
 * Public pre-user search with pagination - Admin endpoint
 */
router.get(
  '/search',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.PREUSER),

    query('q').isString().optional(),
    query('email').isString().optional(),
    query('role').isString().optional(),
    query('name').isString().optional(),
    query('surname').isString().optional(),
    query('inviteCodeSent').isBoolean().optional(),
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    validate.request,
  ],
  function (req, res, next) {
    searchPreUser(req, res, next);
  },
);

function searchPreUser(req, res, next) {
  let currentUser = req.locals.user_object,
    paging = baseHandler.processPage(req),
    queryString = req.query.q,
    email = req.query.email,
    role = req.query.role,
    name = req.query.name,
    surname = req.query.surname,
    inviteCodeSent = req.query.inviteCodeSent
      ? baseHandler.parseBool(req.query.inviteCodeSent)
      : undefined;

  logger.info(`Got request to search for pre-users by ${currentUser.email}`);

  preUserService
    .search(queryString, email, role, name, surname, inviteCodeSent, paging.skip, paging.pageSize)
    .then((foundPreUsers) => {
      let objects = _.map(foundPreUsers.objects, function (item) {
        return item.filterOut(currentUser);
      });

      foundPreUsers.paging.pageSize = paging.pageSize;
      return res.json({ payload: objects, paging: foundPreUsers.paging });
    })
    .catch((error) => {
      baseHandler.handleError(error, `Unable to handle pre-user search`, next);
    });
}

/**
 * User pre-registration
 */
router.get(
  '/register',
  [
    // request rate limiter
    requestRateLimiter,

    //TODO: add test
    query('code').isString(),

    validate.request,
  ],
  function (req, res, next) {
    let inviteCode = req.query.code.toLowerCase();
    preUserService
      .findByInviteCode(inviteCode)
      .then((preUser) => {
        return res.json({ payload: { preUserId: preUser.id, firstName: preUser.userData.name } });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle user pre-registration`, next);
      });
  },
);

/**
 * import pre-users from csv file
 */
router.post(
  '/bulk-import',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_ANY, objects.PROFILE),

    // file upload interceptor
    upload.single('file'),

    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    logger.info(`Got request to import pre-users from ${currentUser.email}`);

    preUserService
      .importPreUsersFromCsv(currentUser, req.file.path)
      .then((result) => {
        logger.info(
          `All pre-users have been successfully imported requested by ${currentUser.email}`,
        );
        return res.json({ payload: result });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle import preusers from csv file: ${req.file}`,
          next,
        );
      });
  },
);

/**
 * Updates existing pre-user - Admin endpoint
 */
router.post(
  `/:preUserId`,
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_ANY, objects.PREUSER),

    // request validation rules
    preUserValidation.email.optional(),
    preUserValidation.anyRole.optional(),
    preUserValidation.inviteCodeSent.optional(),
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let preUserId = req.params.preUserId;

    logger.info(`Got request to update existing pre-user ${preUserId} by ${currentUser.email}`);
    preUserService
      .updatePreUser(currentUser, preUserId, req.body)
      .then((preUserObject) => {
        return res.json({ payload: preUserObject.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle pre-user ${preUserId} update request`,
          next,
        );
      });
  },
);

/**
 * Deletes existing pre-user
 */
router.delete(
  '/:preUserId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.DELETE_ANY, objects.PREUSER),
  ],
  function (req, res, next) {
    let preUserId = req.params.preUserId;
    logger.info(
      `Got request to remove existing pre-user ${preUserId} by ${req.locals.user_object.email}`,
    );

    preUserService
      .deletePreUser(preUserId)
      .then((dbRecord) => {
        logger.info(`Database pre-user ${dbRecord.userData.email} has been deleted`);
        return res.json({ payload: dbRecord });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Pre-user ${preUserId} deleting has failed`, next);
      });
  },
);

/**
 * Fetches existing pre-user by Id
 */
router.get(
  '/:preUserId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.PREUSER),
  ],
  function (req, res, next) {
    let preUserId = req.params.preUserId;
    logger.info(
      `Got request to retrieve existing pre-user ${preUserId} by ${req.locals.user_object.email}`,
    );

    preUserService
      .findById(preUserId)
      .then((preUser) => {
        return res.json({ payload: preUser });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Fetching pre-user ${preUserId} has been failed`, next);
      });
  },
);

/**
 * Send invite notification
 */
router.get(
  '/invite/:preUserId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.PREUSER),
  ],
  function (req, res, next) {
    let preUserId = req.params.preUserId;
    let currentUser = req.locals.user_object;
    logger.info(
      `Got request to send pre-user invite notification ${preUserId} by ${currentUser.email}`,
    );

    preUserService
      .findById(preUserId)
      .then((preUser) => preUserService.sendInviteNotification(preUser))
      .then((updatedPreUser) => {
        return res.json({ payload: { preUser: updatedPreUser } });
      })
      .catch((error) => {
        return res.json({
          error: {
            message: `Unable to send invite notification for preUser ${preUserId}, ${error}`,
          },
        });
      });
  },
);

/**
 * Send bulk invite notification
 */
//TODO: cover with tests, mock email service
router.post(
  `/invite/list`,
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.PREUSER),

    // request validation rules
    preUserValidation.preUserIds,
    validate.request,
  ],
  async (req, res, next) => {
    let currentUser = req.locals.user_object;
    let preUserIds = req.body.preUserIds;

    logger.info(`Got request to send invite notification to list of users by ${currentUser.email}`);

    preUserService
      .sendMultiInviteNotifications(currentUser, preUserIds)
      .then((sentList) => {
        return res.json({ payload: { sentList: sentList } });
      })
      .catch((error) => {
        return res.json({
          error: {
            message: `Unable to send invite notifications for preUsers ${preUserIds}. Error: ${error}`,
          },
        });
      });
  },
);

module.exports = router;
