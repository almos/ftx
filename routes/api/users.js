const router = require('express').Router();

const { body, check, query, param } = require('express-validator');
const authn = require('../auth/authn');
const authz = require('../auth/authz');
const firebaseService = require('../../services/firebase');
const userService = require('../../services/user');
const validate = require('../validate');
const acl = require('../../config/security').permissions;
const logger = require('../../services/logger').instance;
const roles = require('../../config/security').userRoles;
const objects = require('../../config/security').objects;
const _ = require('lodash');
const baseHandler = require('./base');
const multer = require('multer');
const config = require('../../config');
const upload = multer({ dest: config.videoTempUploadDir });
const commonValidation = require('./validation');
const mongoose = require('mongoose');
const languagesCodeList = require('../../services/language').getLanguagesCodeList;
const preUserService = require('../../services/preuser');
const pitchService = require('../../services/pitch');
const errors = require('../../services/error');
const userConnectionService = require('../../services/user-connection');
const emailService = require('../../services/email');

/**
 * Validation rules
 */
const userValidation = {
  id: body('id').isAlphanumeric(),
  email: body('email').isEmail(),
  language: body('language').isIn(languagesCodeList()),
  unprivilegedRole: body('role').isIn([roles.FOUNDER, roles.INVESTOR]),
  anyRole: body('role').isIn(_.values(roles)),
  password: body('password').isLength({ min: 6 }),
  startDate: body('startDate').isISO8601(),
  endDate: body('endDate').isISO8601(),
  feedbackText: body('feedback').trim().notEmpty(),
  fcmRegistrationToken: body('fcmRegistrationToken').trim().notEmpty(),
  deviceOs: body('deviceOs').trim().notEmpty(),
};

router.put(
  '/profile/bycode/:code',
  [
    // no acl checks, this is a public

    userValidation.password,
    userValidation.language.optional(),
    validate.request,
  ],
  async function (req, res, next) {
    let code = req.params.code;

    logger.info(`Got request to register pre-user with code ${code}`);

    try {
      let preuser = await preUserService.findByInviteCode(code);
      req.body = Object.assign(req.body, preuser.userData);
      createUser(req, res, next);
    } catch (error) {
      baseHandler.handleError(error, `Pre-user registration with code: ${code} has failed`, next);
    }
  },
);

/**
 * Retrieves profile for the active user (according to Firebase token supplied)
 */
router.put(
  '/profile/me',
  [
    // no acl checks, this is a public

    userValidation.email,
    userValidation.password,
    userValidation.language.optional(),
    userValidation.unprivilegedRole,
    validate.request,
  ],
  function (req, res, next) {
    logger.info(`Got request to create user self profile ${JSON.stringify(req.body)}`);
    createUser(req, res, next);
  },
);

/**
 * Updates own user profile
 */
router.post(
  '/profile/me',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PROFILE),

    // request validation rules
    userValidation.email.optional(),
    userValidation.language.optional(),
    validate.request,
  ],
  function (req, res, next) {
    let user = req.locals.user_object;
    let userId = user.id;

    logger.info(`Got request to update self profile ${userId} by ${user.email}`);
    updateUser(user, req.body, user.role, res, next).then();
  },
);

/**
 * Retrieves profile for the active user (according to Firebase token supplied)
 */
router.get(
  '/profile/me',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_OWN, objects.PROFILE),
  ],
  function (req, res, next) {
    logger.info(`Got request to get user self profile ${req.locals.user_object.email}`);
    return res.json({ payload: req.locals.user_object });
  },
);

/**
 * Creates new item in profile
 */
router.put(
  '/profile/me/item/:itemType',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PROFILE),

    // file upload interceptor
    upload.single('image'),
    userValidation.startDate.optional(),
    userValidation.endDate.optional(),
    commonValidation.fileUploadValidation.imageFileNotRequired,
    validate.request,
  ],
  function (req, res, next) {
    const itemType = req.params.itemType;
    const currentUser = req.locals.user_object;
    logger.info(
      `Got request to create new profile item ${JSON.stringify(req.body)} by ${
        req.locals.user_object.email
      }`,
    );

    const itemId = mongoose.Types.ObjectId();

    userService
      .addProfileItem(currentUser.id, itemType, itemId, req, req.file, currentUser.role)
      .then((userProfile) => {
        return res.json({ payload: userProfile });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle profile creation ${req.file.filename}`,
          next,
        );
      });
  },
);

/**
 * Updates item in profile
 */
router.post(
  '/profile/me/item/:itemType',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PROFILE),

    // file upload interceptor
    upload.single('image'),
    userValidation.startDate,
    userValidation.endDate.optional(),
    commonValidation.fileUploadValidation.imageFileNotRequired,
    validate.request,
  ],
  function (req, res, next) {
    const itemType = req.params.itemType;
    const itemId = req.body._id;
    const currentUser = req.locals.user_object;
    logger.info(
      `Got request to update profile item ${JSON.stringify(req.body)} by ${
        req.locals.user_object.email
      }`,
    );

    userService
      .updateProfileItem(currentUser.id, itemType, itemId, req, req.file, currentUser.role)
      .then((userProfile) => {
        return res.json({ payload: userProfile });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle profile update ${req.file.filename}`,
          next,
        );
      });
  },
);

/**
 * deletes item in profile
 */
router.delete(
  '/profile/me/item/:itemType/:itemId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PROFILE),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let itemType = req.params.itemType,
      itemId = req.params.itemId;

    logger.info(`Got request to remove profile item for ${currentUser.email}`);

    userService
      .removeProfileItem(currentUser.id, itemType, itemId, currentUser.role)
      .then((userProfile) => {
        return res.json({ payload: userProfile });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle deleting profile item for ${currentUser.email}`,
          next,
        );
      });
  },
);

/**
 * Handles self avatar upload
 */
router.post(
  '/avatar/me',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PROFILE),

    // file upload interceptor
    upload.single('image'),

    commonValidation.fileUploadValidation.imageFile,
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    logger.info(`Got request to upload user avatar from ${currentUser.email}`);

    userService
      .addAvatar(currentUser.id, req.file, currentUser.role)
      .then((userProfile) => {
        return res.json({ payload: userProfile });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle avatar upload ${req.file.filename}`, next);
      });
  },
);

/**
 * Handles self avatar removal
 */
router.delete(
  '/avatar/me',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PROFILE),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    logger.info(`Got request to remove user avatar for ${currentUser.email}`);

    userService
      .removeAvatar(currentUser.id, currentUser.role)
      .then((userProfile) => {
        return res.json({ payload: userProfile });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle avatar removal for ${currentUser.email}`,
          next,
        );
      });
  },
);

/**
 * Retrieves mentors for the logged in account
 */
router.get(
  '/profile/my-mentors',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_OWN, objects.PITCH),
  ],
  async function (req, res, next) {
    logger.info(`Got request to get user self mentors`);

    const currentUser = req.locals.user_object;
    let networkIds = [];

    const response = await pitchService.findMany({
      networkType: 'mentor',
      userId: mongoose.Types.ObjectId(currentUser.id),
      rejected: false,
      reviewed: true,
      deleted: false,
    });

    response.forEach((k) => {
      if (k.network) {
        networkIds.push(...k.network);
      }
    });

    networkIds = networkIds.filter((item, index) => {
      return networkIds.indexOf(item) == index;
    });
    const users = await userService.findMany({ _id: { $in: networkIds } });
    return res.json({ payload: users });
  },
);

/**
 * Retrieves investors for the logged in account
 */
router.get(
  '/profile/my-investors',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_OWN, objects.PROFILE),
  ],
  async function (req, res, next) {
    logger.info(`Got request to get user self investors`);

    const currentUser = req.locals.user_object;
    let networkIds = [];

    const response = await pitchService.findMany({
      networkType: 'investor',
      userId: mongoose.Types.ObjectId(currentUser.id),
      rejected: false,
      reviewed: true,
      deleted: false,
    });

    response.forEach((k) => {
      if (k.network) {
        networkIds.push(...k.network);
      }
    });

    networkIds = networkIds.filter((item, index) => {
      return networkIds.indexOf(item) == index;
    });

    const users = await userService.findMany({ _id: { $in: networkIds } });
    return res.json({ payload: users });
  },
);

/**
 * Creates new profile - Admin endpoint
 */
router.put(
  '/profile',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.PROFILE),

    // request validation rules
    userValidation.email,
    userValidation.password,
    userValidation.language.optional(),
    userValidation.anyRole,
    validate.request,
  ],
  function (req, res, next) {
    logger.info(
      `Got request to create new user ${JSON.stringify(req.body)} by ${
        req.locals.user_object.email
      }`,
    );

    createUser(req, res, next);
  },
);

/**
 * Updates existing profile - Admin endpoint
 */
router.post(
  '/profile',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_ANY, objects.PROFILE),

    // request validation rules
    userValidation.id,
    userValidation.email.optional(),
    userValidation.anyRole.optional(),
    userValidation.language.optional(),
    validate.request,
  ],
  function (req, res, next) {
    let userId = req.body.id;
    logger.info(`Got request to update existing user ${userId} by ${req.locals.user_object.email}`);
    userService.findById(userId).then((user) => updateUser(user, req.body, roles.ADMIN, res, next));
  },
);

/**
 * Public user search with pagination - Admin endpoint
 */
router.get(
  '/search',
  [
    // firebase authentication
    authn.firebase,

    query('q').isString().optional(),
    query('email').isString().optional(),
    query('name').isString().optional(),
    query('surname').isString().optional(),
    query('orgname').isString().optional(),
    query('orgid').isString().optional(),
    query('role').isString().optional(),
    query('id').isString().optional(),
    query('groupname').isString().optional(),
    query('groupid').isString().optional(),
    query('lang').isArray().optional(),
    query('sub').isBoolean().optional(),
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    validate.request,

    // rbac check
    // authz.check(acl.READ_ANY, objects.PROFILE),
  ],
  function (req, res, next) {
    searchUser(req, res, next);
  },
);

function searchUser(req, res, next) {
  _.defaults(req.query, { sub: false });
  _.defaults(req.query, { orgname: null });

  let currentUser = req.locals.user_object,
    paging = baseHandler.processPage(req),
    queryString = req.query.q,
    email = req.query.email,
    name = req.query.name,
    surname = req.query.surname,
    orgname = req.query.orgname,
    orgid = req.query.orgid,
    role = req.query.role,
    id = req.query.id,
    groupname = req.query.groupname,
    groupid = req.query.groupid,
    languages = req.query.lang,
    sub = baseHandler.parseBool(req.query.sub);

  logger.info(`Got request to search for users by ${currentUser.email}`);

  userService
    .search(
      currentUser,
      queryString,
      email,
      name,
      surname,
      orgname,
      orgid,
      role,
      id,
      groupname,
      groupid,
      languages,
      paging.skip,
      paging.pageSize,
      sub,
    )
    .then((foundUsers) => {
      let objects = _.map(foundUsers.objects, function (item) {
        return item.filterOut(currentUser);
      });

      foundUsers.paging.pageSize = paging.pageSize;
      return res.json({ payload: objects, paging: foundUsers.paging });
    })
    .catch((error) => {
      baseHandler.handleError(error, `Unable to handle user search`, next);
    });
}

/**
 * Denies existing profile
 */
router.delete(
  '/profile',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.DELETE_ANY, objects.PROFILE),

    // request validation rules
    userValidation.id,
    validate.request,
  ],
  function (req, res, next) {
    let userId = req.body.id;
    logger.info(
      `Got request to mark existing user ${userId} as deleted by ${req.locals.user_object.email}`,
    );

    userService
      .deleteUser(userId)
      .then((dbRecord) => {
        logger.info(`Database user ${userId}/${dbRecord.email} has been marked as deleted`);
        return res.json({ payload: dbRecord });
      })
      .catch((error) => {
        baseHandler.handleError(error, `User ${req.body.email} update has failed`, next);
      });
  },
);

const attachUserConnection = (currentUser, user) => {
  return userConnectionService
    .findConnection(currentUser, user.id)
    .then((connection) => {
      user.userConnection = {
        id: connection.id,
        type: connection.type,
      };
    })
    .catch(() => {});
};

/**
 * Fetches existing profile
 */
router.get(
  '/profile/:id',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.PROFILE),
  ],
  function (req, res, next) {
    let userId = req.params.id;
    let currentUser = req.locals.user_object;
    logger.info(
      `Got request to retrieve existing user profile ${userId} by ${req.locals.user_object.email}`,
    );

    userService
      .findById(userId)
      .then(async (user) => {
        if (currentUser.role !== roles.ADMIN) {
          await attachUserConnection(currentUser, user);
        }
        return res.json({ payload: user.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(error, `User ${req.body.email} update has failed`, next);
      });
  },
);

/**
 * Generates a user password reset link existing profile
 */
router.get('/reset', [query('email').isEmail()], function (req, res, next) {
  let resetEmail = req.query.email;
  logger.info(`Got request to reset password for ${resetEmail}`);

  firebaseService
    .resetPassword(resetEmail)
    .then(() => {
      return res.json({ payload: {} });
    })
    .catch((error) => {
      baseHandler.handleError(error, `User password reset has failed`, next);
    });
});

/**
 * Fetches existing Firebase profile
 */
router.get(
  '/profile/firebase/:id',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.PROFILE),
  ],
  function (req, res, next) {
    let firebaseUserId = req.params.id;
    logger.info(
      `Got request to retrieve existing firebase profile ${firebaseUserId} by ${req.locals.user_object.email}`,
    );

    firebaseService
      .findUser(firebaseUserId)
      .then((firebaseUser) => res.json({ payload: firebaseUser }))
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to fetch user ${firebaseUserId} from Firebase`,
          next,
        );
      });
  },
);

/**
 * Deletes existing Firebase profile
 */
router.delete(
  '/profile/firebase/:id',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.DELETE_ANY, objects.PROFILE),
  ],
  function (req, res, next) {
    let firebaseUserId = req.params.id;
    logger.info(
      `Got request to remove existing firebase profile ${firebaseUserId} by ${req.locals.user_object.email}`,
    );

    firebaseService
      .deleteUser(firebaseUserId)
      .then((firebaseUser) => res.json({ payload: {} }))
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to remove user ${firebaseUserId} from Firebase`,
          next,
        );
      });
  },
);

/**
 * Create User send Application Feedback
 */
router.put(
  '/feedback',
  [
    authn.firebase,
    authz.check(acl.CREATE_OWN, objects.USER_FEEDBACK),
    userValidation.feedbackText,
    validate.request,
  ],
  (req, res, next) => {
    let user = req.locals.user_object;
    let feedbackTxt = req.body.feedback;

    logger.info(`Got create user feedback via user Email is ${user.email}`);

    userService
      .insertUserAppFeedback(user, feedbackTxt)
      .then((feedback) => {
        res.json({ payload: feedback });
      })
      .catch((error) => {
        logger.error('PUT /feedback error is', error.message);
        baseHandler.handleError(
          error,
          `Unable to handle adding app feedback from user ${user.email}`,
          next,
        );
      });
  },
);

/**
 * Get All User Application Feedback
 */
router.get(
  '/feedback',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.USER_FEEDBACK),
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    validate.request,
  ],
  (req, res, next) => {
    let currentUser = req.locals.user_object,
      paging = baseHandler.processPage(req);

    logger.info(`Request get Application Feedback via user ${currentUser.email}.`);

    userService
      .getAllUserAppFeedback(paging)
      .then((appFeedbackList) => {
        let objects = _.map(appFeedbackList.objects, function (item) {
          return item.filterOut(currentUser);
        });

        appFeedbackList.paging.pageSize = paging.pageSize;
        return res.json({ payload: objects, paging: appFeedbackList.paging });
      })
      .catch((error) => {
        logger.error('GET /feedback error is', error.message);
        baseHandler.handleError(error, `Unable to get application feedback data.`, next);
      });
  },
);

/**
 * For User type Founder, Mentor and Investor create meeting request to each other one-by-one.
 */
router.put(
  '/meeting/:userId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.PROFILE),
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let requesteeId = req.params.userId;

    logger.info(
      `Got request from requester ${currentUser.email} create meeting request to requestee ${requesteeId}`,
    );

    userService
      .createMeetingRequest(currentUser, requesteeId)
      .then((result) => {
        res.json({ payload: result.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to create meeting from ${currentUser.email} to ${requesteeId}`,
          next,
        );
      });
  },
);

/**
 * Handles devices inserts and token refresh
 */
router.post(
  '/device',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PROFILE),
    userValidation.fcmRegistrationToken,
    userValidation.deviceOs,
    validate.request,
  ],
  (req, res, next) => {
    const currentUser = req.locals.user_object;

    logger.info(`Request to update device for ${currentUser.email}.`);

    userService
      .refreshDevice(currentUser, req.body)
      .then((result) => {
        return res.json({ payload: result.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to update device for user: ${currentUser.email}`,
          next,
        );
      });
  },
);

/**
 * Checks whether email is in use or not
 */
router.get(
  '/check',
  [
    // no acl checks, this is a public
    validate.request,
  ],
  (req, res, next) => {
    const email = req.query.email;
    logger.info(`Request to check use of email.`);

    userService
      .findByEmail(email)
      .then(() => {
        return res.json({ payload: { userExists: true } });
      })
      .catch((error) => {
        if (error instanceof errors.EntityNotFoundError) {
          return res.json({ payload: { userExists: false } });
        } else {
          baseHandler.handleError(error, `Request to check use of email.`, next);
        }
      });
  },
);

/**
 * import users from csv file
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

    userService
      .importUsersFromCsv(currentUser, req.file.path)
      .then((result) => {
        logger.info(`All users have been successfully imported requested by ${currentUser.email}`);
        return res.json({ payload: result });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle import users from csv file: ${req.file}`,
          next,
        );
      });
  },
);

/**
 * Implements a user update flow
 * @param userObject existing user object in database
 * @param updateRequest object that contains fields to update
 * @param updatorRole role of user that's updating the data
 */
function updateUser(userObject, updateRequest, updatorRole, res, next) {
  if (updateRequest.email) {
    updateRequest.email = updateRequest.email.toLowerCase();
  }

  /**
   * Non-privileged users can't update their role
   */
  if (updatorRole !== roles.ADMIN) {
    if (updateRequest.role && updateRequest.role !== userObject.role) {
      return Promise.reject(new Error('Role change is not permitted'));
    }
  }
  let emailHasChanged =
    updateRequest.email !== undefined && userObject.email !== updateRequest.email;
  let userEmail = updateRequest.email ? updateRequest.email : userObject.email;

  return Promise.all([userObject])
    .then((user) => {
      // trigger firebase in case email got changed otherwise ignore
      if (emailHasChanged) {
        return firebaseService.updateUser(user.firebaseId, userEmail);
      }
      return Promise.resolve();
    })
    .then(() => {
      // update user in database
      return userService.updateUser(userObject.id, updateRequest, updatorRole);
    })
    .then((dbRecord) => {
      logger.info(`Database user ${userObject.id}/${dbRecord.email} has been updated`);
      return res.json({ payload: dbRecord });
    })
    .then(() => {
      if (emailHasChanged) {
        userService.sendVerifyEmail(userEmail).then(() => {
          logger.info(`Validation email to ${userEmail} has been sent`);
        });
      }
    })
    .catch((error) => {
      baseHandler.handleError(error, `User ${userEmail} update has failed`, next);
    });
}

/**
 * Creates new user
 * @param req request object
 * @param res response object
 */
function createUser(req, res, next) {
  let userEmail = req.body.email.toLowerCase();
  let userPassword = req.body.password;

  // We first create entry in Firebase then in database
  firebaseService
    .createUser(userEmail, userPassword)
    .then((fbRecord) => {
      logger.info(
        `Firebase user ${userEmail} has been created. Firebase reply: ${JSON.stringify(fbRecord)}`,
      );
      return fbRecord;
    })
    .then((fbRecord) => {
      return userService.createUser(fbRecord.uid, req.body).catch((error) => {
        // we were not able to create user in database
        // rolling back out firebase user
        logger.warn(`Removing partial Firebase state by removing user ${fbRecord.uid}`);
        return firebaseService.deleteUser(fbRecord.uid).then(() => Promise.reject(error));
      });
    })
    .then((dbRecord) => {
      logger.info(`Database user ${userEmail} has been created`);
      return res.json({ payload: dbRecord });
    })
    .then(() => {
      userService.sendVerifyEmail(userEmail).then(() => {
        logger.info(`Validation email to ${userEmail} has been sent`);
      });
    })
    .catch((error) => {
      baseHandler.handleError(error, `User ${req.body.email} creation has failed`, next);
    });
}

module.exports = router;
