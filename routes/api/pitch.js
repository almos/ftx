const router = require('express').Router();

const { body, check, query, param } = require('express-validator');
const authn = require('../auth/authn');
const authz = require('../auth/authz');
const logger = require('../../services/logger').instance;
const pitchService = require('../../services/pitch');
const userService = require('../../services/user');
const validate = require('../validate');
const roles = require('../../config/security').userRoles;
const objects = require('../../config/security').objects;
const acl = require('../../config/security').permissions;
const multer = require('multer');
const config = require('../../config');
const upload = multer({ dest: config.videoTempUploadDir });
const commonValidation = require('./validation');
const _ = require('lodash');
const baseHandler = require('./base');
const timeout = require('connect-timeout');
const businessIdeaService = require('../../services/business-idea');
const languagesCodeList = require('../../services/language').getLanguagesCodeList;

/**
 * Validation rules
 */
const pitchValidation = {
  businessIdeaId: body('businessIdeaId').isAlphanumeric(),
  title: body('title'),
  description: body('description'),
  tags: body('tags').isArray(),
  language: body('language').isIn(languagesCodeList()),
  investmentAmountRequired: body('investmentAmountRequired').isNumeric().optional(),
  helpAreas: body('helpAreas').isArray(),
  reviewFeedback: check('feedback').not().isEmpty(),
  reviewCategoryId: check('rate.*.reviewCategoryId').isAlphanumeric(),
  reviewRate: check('rate.*.reviewRating').isFloat({ min: 0, max: 10 }),

  reviewToReviewRate: body('rate')
    .exists()
    .withMessage('rate is required')
    .isIn([1, -1])
    .withMessage('rate invalid value'),
};

const businessIdeaValidation = {
  title: body('businessIdea.title').isString(),
  description: body('businessIdea.description').isString(),
  teamDescription: body('businessIdea.teamDescription').isString(),
  tractionDescription: body('businessIdea.tractionDescription').isString(),
  language: body('businessIdea.language').isIn(languagesCodeList()),
  websiteUrl: body('businessIdea.websiteUrl').isString(),
  twitterUrl: body('businessIdea.twitterUrl').isURL(),
  facebookUrl: body('businessIdea.facebookUrl').isURL(),
  industries: body('businessIdea.industries').isArray(),
  location: body('businessIdea.location').isArray(),
  stage: body('businessIdea.stage')
    .isString()
    .custom((stage) => {
      return businessIdeaService.isStageValid(stage).then((isValid) => {
        if (isValid) return true;
        else return Promise.reject('invalid value');
      });
    }),
  businessIdea: body('businessIdea').custom((value, { req }) => {
    const businessIdea = req.body.businessIdea;
    if (!businessIdea.title || !businessIdea.description) {
      throw new Error('Business idea is missing required fields title and description');
    } else {
      return true;
    }
  }),
};

/**
 * Handles pitch and business idea creation
 */
router.put(
  '/v2',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.PITCH),

    businessIdeaValidation.businessIdea,
    businessIdeaValidation.title.notEmpty(),
    businessIdeaValidation.description.notEmpty(),
    businessIdeaValidation.teamDescription.optional(),
    businessIdeaValidation.tractionDescription.optional(),
    businessIdeaValidation.websiteUrl.optional(),
    businessIdeaValidation.twitterUrl.optional(),
    businessIdeaValidation.facebookUrl.optional(),
    businessIdeaValidation.industries.optional(),
    businessIdeaValidation.location.optional(),
    businessIdeaValidation.stage.optional(),
    businessIdeaValidation.language.optional(),
    pitchValidation.title,
    pitchValidation.description.optional(),
    pitchValidation.tags.optional(),
    pitchValidation.language.optional(),
    validate.request,
  ],
  function (req, res, next) {
    logger.info(`Got request to create a pitch and a business idea`);

    let currentUser = req.locals.user_object,
      businessIdeaRequest = req.body.businessIdea;
    delete req.body.businessIdea;
    let businessIdea;

    return businessIdeaService.createIdea(currentUser, businessIdeaRequest).then((result) => {
      businessIdea = result;
      pitchService
        .createPitch(currentUser, result.id, req.body)
        .then((pitch) => {
          return res.json({ payload: pitch });
        })
        .catch(async (error) => {
          if (businessIdea) {
            await businessIdeaService.deleteIdea(businessIdea.id).catch((error) => {
              logger.error(
                `Failed to delete business idea ${businessIdea.id} on pitch failure. Error: ${error.message}`,
              );
            });
          }
          baseHandler.handleError(error, `Unable to handle pitch creation request`, next);
        });
    });
  },
);

/**
 * Handles pitch and business idea creation
 */
router.post(
  '/v2/:pitchId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PITCH),

    businessIdeaValidation.businessIdea,
    businessIdeaValidation.title.notEmpty(),
    businessIdeaValidation.description.notEmpty(),
    businessIdeaValidation.teamDescription.optional(),
    businessIdeaValidation.tractionDescription.optional(),
    businessIdeaValidation.websiteUrl.optional(),
    businessIdeaValidation.twitterUrl.optional(),
    businessIdeaValidation.facebookUrl.optional(),
    businessIdeaValidation.industries.optional(),
    businessIdeaValidation.location.optional(),
    businessIdeaValidation.stage.optional(),
    businessIdeaValidation.language.optional(),
    pitchValidation.title,
    pitchValidation.description.optional(),
    pitchValidation.tags.optional(),
    pitchValidation.language.optional(),
    validate.request,
  ],
  async function (req, res, next) {
    logger.info(`Got request to update a pitch and a business idea`);

    let currentUser = req.locals.user_object,
      pitchId = req.params.pitchId,
      businessIdeaRequest = req.body.businessIdea;
    delete req.body.businessIdea;

    try {
      if (businessIdeaRequest) {
        let pitch = await pitchService.findById(currentUser, pitchId);
        await businessIdeaService.updateIdea(
          currentUser,
          pitch.businessIdeaId,
          businessIdeaRequest,
        );
      }
      const result = await pitchService.updatePitch(currentUser, pitchId, req.body);

      return res.json({ payload: result });
    } catch (error) {
      baseHandler.handleError(error, `Unable to handle pitch update request`, next);
    }
  },
);

/**
 * Handles pitch creation
 */
router.put(
  '/',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.PITCH),

    pitchValidation.businessIdeaId,
    pitchValidation.title,
    pitchValidation.description.optional(),
    pitchValidation.tags.optional(),
    pitchValidation.language.optional(),
    validate.request,
  ],
  function (req, res, next) {
    logger.info(`Got request to create a pitch`);

    let currentUser = req.locals.user_object,
      businessIdeaId = req.body.businessIdeaId;

    pitchService
      .createPitch(currentUser, businessIdeaId, req.body)
      .then((pitch) => {
        return res.json({ payload: pitch });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle pitch creation request`, next);
      });
  },
);

/**
 * Handles pitch removal
 */
router.delete(
  '/:pitchId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.DELETE_OWN, objects.PITCH),
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId;
    let currentUser = req.locals.user_object;
    logger.info(`Got request to remove pitch ${pitchId} from ${currentUser.email}`);

    pitchService
      .deletePitch(currentUser, pitchId)
      .then((pitch) => {
        return res.json({ payload: pitch });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to remove pitch ${pitchId}`, next);
      });
  },
);

/**
 * Handles pitch removal and business idea removal
 */
router.delete(
  '/v2/:pitchId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.DELETE_OWN, objects.PITCH),
  ],
  async function (req, res, next) {
    let pitchId = req.params.pitchId;
    let currentUser = req.locals.user_object;
    logger.info(`Got request to remove pitch ${pitchId} from ${currentUser.email}`);

    try {
      const pitch = await pitchService.findById(currentUser, pitchId);
      const result = await pitchService.deletePitch(currentUser, pitchId).then();
      await businessIdeaService.deleteIdea(pitch.businessIdeaId);
      return res.json({ payload: result.filterOut(currentUser) });
    } catch (error) {
      baseHandler.handleError(error, `Unable to remove pitch ${pitchId}`, next);
    }
  },
);

router.get(
  '/search',
  [
    // firebase authentication
    authn.firebase,

    query('q').isString().optional(),
    query('tags').isArray().optional(),
    query('groups').isArray().optional(),
    query('sub').isBoolean().optional(),
    query('curated').isBoolean().optional(),
    query('language').isArray().optional(),
    query('excludeOwn').isBoolean().optional(),
    query('excludeReviewed').isBoolean().optional(),
    query('oldToNew').isBoolean().optional(),
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    validate.request,

    // rbac check
    authz.check(acl.READ_ANY, objects.PITCH),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object,
      currentUserId = currentUser.id,
      paging = baseHandler.processPage(req);

    // setting default request values
    _.defaults(req.query, { sub: false });
    _.defaults(req.query, { curated: true });
    _.defaults(req.query, { excludeOwn: true });
    _.defaults(req.query, { excludeReviewed: true });
    _.defaults(req.query, { oldToNew: false });

    let queryString = req.query.q,
      tags = req.query.tags,
      groups = req.query.groups,
      sub = baseHandler.parseBool(req.query.sub),
      curated = baseHandler.parseBool(req.query.curated),
      languages = req.query.language,
      excludeOwn = baseHandler.parseBool(req.query.excludeOwn),
      excludeReviewed = baseHandler.parseBool(req.query.excludeReviewed),
      oldToNew = baseHandler.parseBool(req.query.oldToNew);

    logger.info(`Got request to search for pitches by ${currentUser.email}`);
    pitchService
      .search(
        currentUser,
        queryString,
        tags,
        paging.skip,
        paging.pageSize,
        sub,
        curated,
        languages,
        excludeOwn ? currentUserId : undefined,
        excludeReviewed ? currentUserId : undefined,
        groups,
        oldToNew,
      )
      .then((foundPitches) => {
        let objects = _.map(foundPitches.objects, function (item) {
          return item.filterOut(currentUser);
        });

        foundPitches.paging.pageSize = paging.pageSize;
        return res.json({ payload: objects, paging: foundPitches.paging });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle pitch search`, next);
      });
  },
);

/**
 * Search all pitches - Admin only endpoint
 */
router.get(
  '/search/all',
  [
    // firebase authentication
    authn.firebase,

    query('title').isString().optional(),
    query('name').isString().optional(),
    query('surname').isString().optional(),
    query('role').isString().optional(),
    query('email').isString().optional(),
    query('userid').isString().optional(),
    query('businessideatitle').isString().optional(),
    query('businessideaid').isString().optional(),
    query('language').isArray().optional(),
    query('sub').isBoolean().optional(),
    query('curated').isBoolean().optional(),
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    validate.request,

    // rbac check
    authz.check(acl.READ_ANY, objects.PITCH),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object,
      paging = baseHandler.processPage(req);

    // setting default request values
    _.defaults(req.query, { sub: false });
    _.defaults(req.query, { curated: true });

    let title = req.query.title,
      userName = req.query.name,
      userSurname = req.query.surname,
      userRole = req.query.role,
      userEmail = req.query.email,
      userId = req.query.userid,
      businessIdeaTitle = req.query.businessideatitle,
      businessIdeaId = req.query.businessideaid,
      languages = req.query.language,
      sub = baseHandler.parseBool(req.query.sub),
      curated = baseHandler.parseBool(req.query.curated);

    logger.info(`Got request to search all for pitches by ${currentUser.email}`);

    pitchService
      .searchAll(
        currentUser,
        title,
        userName,
        userSurname,
        userRole,
        userEmail,
        userId,
        businessIdeaTitle,
        businessIdeaId,
        languages,
        paging.skip,
        paging.pageSize,
        sub,
        curated,
      )
      .then(async (foundPitches) => {
        let objects = await Promise.all(
          _.map(foundPitches.objects, async (item) => {
            if (currentUser.role !== roles.ADMIN) {
              item.businessIdeaId = await businessIdeaService.findById(
                currentUser,
                item.businessIdeaId,
              );
            }
            return Promise.resolve(item.filterOut(currentUser));
          }),
        );

        foundPitches.paging.pageSize = paging.pageSize;
        return res.json({ payload: objects, paging: foundPitches.paging });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle pitch search`, next);
      });
  },
);

/**
 * Updates pitch details
 */
router.post(
  '/:pitchId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PITCH),
    pitchValidation.title.optional(),
    pitchValidation.description.optional(),
    pitchValidation.tags.optional(),
    pitchValidation.language.optional(),
    validate.request,
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId;
    let currentUser = req.locals.user_object;

    logger.info(`Got request to update a pitch ${pitchId} from ${currentUser.email}`);

    pitchService
      .updatePitch(currentUser, pitchId, req.body, req.file)
      .then((pitchObject) => {
        return res.json({ payload: pitchObject.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle pitch ${pitchId} update request`, next);
      });
  },
);

function extendTimeout(req, res, next) {
  res.setTimeout(480000, function () {
    let currentUser = req.locals.user_object;
    logger.error(`Request has timed out for user ${currentUser.email}`);
    res.send(408);
  });
  next();
}

/**
 * Handles video upload for a pitch
 * TODO: cover with integration tests
 */
router.post(
  '/:pitchId/video',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PITCH),

    // extended timeout for large transfers
    timeout(config.server.longTimeout),

    // file upload interceptor
    upload.single('video'),

    commonValidation.fileUploadValidation.videoFile,
    validate.request,
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId;
    let currentUser = req.locals.user_object;
    logger.info(`Got request to upload pitch video from ${currentUser.email}`);

    pitchService
      .handleVideoUpload(currentUser, pitchId, req.file.path)
      .then((pitch) => {
        return res.json({ payload: pitch.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle pitch video upload ${req.file.filename}`,
          next,
        );
      });
  },
);

/**
 * Handles video poster upload for a pitch
 */
router.post(
  '/:pitchId/video/poster',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PITCH),

    // file upload interceptor
    upload.single('image'),

    commonValidation.fileUploadValidation.imageFile,
    validate.request,
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId;
    let currentUser = req.locals.user_object;
    logger.info(`Got request to upload pitch video poster from ${currentUser.email}`);

    pitchService
      .handlePosterPhotoUpload(currentUser, pitchId, req.file)
      .then((pitch) => {
        return res.json({ payload: pitch.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle pitch video poster upload ${req.file.filename}`,
          next,
        );
      });
  },
);

/**
 * Submits a pitch to a review queue
 */
router.get(
  '/:pitchId/submit',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PITCH),
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId;
    let currentUser = req.locals.user_object;
    logger.info(`Got request to submit pitch for review ${currentUser.email}`);

    pitchService
      .submit(currentUser, pitchId)
      .then((submitRequest) => {
        return res.json({ payload: submitRequest });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle pitch submission`, next);
      });
  },
);

/**
 * Sends a pitch to another user
 * TODO cover with integration tests
 */
router.get(
  '/:pitchId/send/:otherUserId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PITCH),
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId;
    let otherUserId = req.params.otherUserId;
    let currentUser = req.locals.user_object;
    logger.info(`Got request to send pitch (${pitchId}) to ${otherUserId} from ${currentUser.id}`);

    pitchService
      .sendToUser(currentUser, pitchId, otherUserId)
      .then((sendRequest) => {
        return res.json({ payload: sendRequest });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle sending pitch`, next);
      });
  },
);

/**
 * Revokes a pitch from submission
 */
router.get(
  '/:pitchId/revoke',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PITCH),
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId;
    let currentUser = req.locals.user_object;
    logger.info(`Got request to revoke pitch from ${currentUser.email}`);

    pitchService
      .revoke(currentUser, pitchId)
      .then((submitRequest) => {
        return res.json({ payload: submitRequest });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle pitch revocation`, next);
      });
  },
);

/**
 * Submits review for a pitch
 */
router.post(
  '/:pitchId/review',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.PITCH_REVIEW),

    pitchValidation.reviewCategoryId,
    pitchValidation.reviewRate,
    pitchValidation.reviewFeedback,
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let pitchId = req.params.pitchId;

    logger.info(`Got request to post pitch review from ${currentUser.email}`);
    req.body.userId = currentUser.id;

    pitchService
      .addReview(currentUser, req.body, pitchId)
      .then((pitchReview) => {
        return res.json({ payload: pitchReview });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle pitch ${pitchId} review addition`, next);
      });
  },
);

/**
 * Gets unreviewed submitted pitches - Admin endpoint
 */
router.get(
  '/unreviewed',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_ANY, objects.PITCH_REVIEW),

    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object,
      paging = baseHandler.processPage(req);

    logger.info(`Got request to retrieve unreviewed pitches from ${currentUser.email}`);

    pitchService
      .findUnapproved(currentUser, paging.skip, paging.pageSize)
      .then((pendingPitches) => {
        let objects = _.map(pendingPitches.objects, function (item) {
          return item.filterOut(currentUser);
        });

        pendingPitches.paging.pageSize = paging.pageSize;
        return res.json({ payload: objects, paging: pendingPitches.paging });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to retrieve unreviewed pitches`, next);
      });
  },
);

/**
 * Approves pitch to make it published (internal review)
 */
router.get(
  '/:pitchId/approve',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_ANY, objects.PITCH),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let pitchId = req.params.pitchId;

    logger.info(`Got request to approve pitch from ${currentUser.email}`);
    req.body.userId = currentUser.id;

    pitchService
      .passReview(currentUser, pitchId)
      .then(() => {
        return res.json({ payload: {} });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle pitch approval ${pitchId}`, next);
      });
  },
);

/**
 * Rejects the pitch (internal review)
 */
router.post(
  '/:pitchId/reject',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_ANY, objects.PITCH),

    body('rejectReason').isString().optional(),
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let pitchId = req.params.pitchId;

    logger.info(`Got request to reject pitch from ${currentUser.email}`);
    req.body.userId = currentUser.id;

    pitchService
      .failReview(currentUser, pitchId, req.body.rejectReason)
      .then(() => {
        return res.json({ payload: {} });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to reject pitch ${pitchId}`, next);
      });
  },
);

/**
 * Gets a pitch by ID
 */
router.get(
  '/:pitchId',
  [
    // firebase authentication
    authn.firebase,
    // rbac check
    authz.check(acl.READ_ANY, objects.PITCH),
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId;
    let currentUser = req.locals.user_object;
    logger.info(`Got request to retrieve pitch ${pitchId} from ${currentUser.email}`);

    pitchService
      .findById(currentUser, pitchId)
      .then((pitch) => {
        return res.json({ payload: pitch.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to retrieve pitch ${pitchId}`, next);
      });
  },
);

/**
 * Get pitch suggested network once it's reviewed and algorithm suggest investor or mentors
 */
router.get(
  '/:pitchId/get-suggested-network',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    // authz.check(acl.READ_OWN, objects.PITCH),
  ],
  function (req, res, next) {
    try {
      let pitchId = req.params.pitchId;
      let currentUser = req.locals.user_object;
      pitchService
        .findPitchMentorsOrInvestorsById(currentUser, pitchId)
        .then((pitch) => {
          return res.json({ payload: pitch.network });
        })
        .catch((error) => {
          baseHandler.handleError(error, `Unable to retrieve pitch ${pitchId}`, next);
        });
    } catch (e) {
      return res.status(400).json({ status: 400, message: e.message });
    }
  },
);

/**
 * Gets pitch reviews
 */
router.get(
  '/:pitchId/reviews',
  [
    // firebase authentication
    authn.firebase,

    query('sub').isBoolean().optional(),
    validate.request,

    // rbac check
    authz.check(acl.READ_ANY, objects.PITCH_REVIEW),
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId;
    let currentUser = req.locals.user_object;
    logger.info(`Got request to retrieve pitch reviews for ${pitchId} from ${currentUser.email}`);

    // setting default request values
    _.defaults(req.query, { sub: false });

    let sub = baseHandler.parseBool(req.query.sub);

    pitchService
      .findPitchWithReviewsById(currentUser, pitchId, sub)
      .then((pitch) => {
        return res.json({ payload: pitch.filterOut(currentUser).reviews });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to retrieve pitch ${pitchId} reviews`, next);
      });
  },
);

/**
 * Gets pitch review by ID
 */
router.get(
  '/:pitchId/review/:reviewId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.PITCH_REVIEW),
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId;
    let reviewId = req.params.reviewId;
    let currentUser = req.locals.user_object;
    logger.info(
      `Got request to retrieve pitch ${pitchId} review ${reviewId} from ${currentUser.email}`,
    );

    pitchService
      .findReviewById(currentUser, pitchId, reviewId)
      .then((pitch) => {
        return res.json({ payload: pitch });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to retrieve pitch review ${reviewId}`, next);
      });
  },
);

/**
 * Adds review for a pitch review
 */
router.put(
  '/:pitchId/review/:reviewId/feedback',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.PITCH_REVIEW),

    pitchValidation.reviewToReviewRate,
    validate.request,
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId,
      reviewId = req.params.reviewId,
      currentUser = req.locals.user_object;
    logger.info(
      `Got request to add review for pitch ${pitchId} review ${reviewId} from ${currentUser.email}`,
    );

    pitchService
      .addReviewToPitchReview(currentUser, req.body.rate, pitchId, reviewId)
      .then((review) => {
        return res.json({ payload: review });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to add review for pitch ${pitchId} review ${reviewId}`,
          next,
        );
      });
  },
);

/**
 * Updates user own review for a pitch review
 */
router.post(
  '/:pitchId/review/:reviewId/feedback',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.PITCH_REVIEW),

    pitchValidation.reviewToReviewRate,
    validate.request,
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId,
      reviewId = req.params.reviewId,
      currentUser = req.locals.user_object;
    logger.info(
      `Got request to update review for pitch ${pitchId} review ${reviewId} from ${currentUser.email}`,
    );

    pitchService
      .updateReviewToPitchReview(currentUser, req.body.rate, pitchId, reviewId)
      .then((review) => {
        return res.json({ payload: review });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to update pitch review for pitch ${pitchId} review ${reviewId}`,
          next,
        );
      });
  },
);

/**
 * Retrieves reviews for a pitch review
 */
router.get(
  '/:pitchId/review/:reviewId/feedback',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.PITCH_REVIEW),
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId,
      reviewId = req.params.reviewId,
      currentUser = req.locals.user_object;
    logger.info(
      `Got request to retrieve reviews for pitch ${pitchId} review ${reviewId} from ${currentUser.email}`,
    );

    pitchService
      .findReviewsToPitchReview(currentUser, pitchId, reviewId)
      .then((reviews) => {
        return res.json({ payload: reviews });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to retrieve reviews for pitch ${pitchId} review ${reviewId}`,
          next,
        );
      });
  },
);

/**
 * Retrieves user's own active pitches
 */
router.get(
  '/my/active',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_OWN, objects.PITCH),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    logger.info(`Got request to lookup own active pitches from ${currentUser.email}`);

    pitchService
      .findActiveUserPitches(currentUser)
      .then((fetchResult) => {
        let filtered = _.map(fetchResult, function (item) {
          return item.filterOut(currentUser);
        });
        return res.json({ payload: filtered });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle own active pitch lookup`, next);
      });
  },
);

/**
 * Retrieves user's own pitches
 */
router.get(
  '/my/all',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_OWN, objects.PITCH),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    logger.info(`Got request to lookup own pitches from ${currentUser.email}`);

    pitchService
      .findUserPitches(currentUser)
      .then((fetchResult) => {
        let filtered = _.map(fetchResult, function (item) {
          return item.filterOut(currentUser);
        });
        return res.json({ payload: filtered });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle own pitch lookup`, next);
      });
  },
);

/**
 * Retrieves user's active pitches
 */
router.get(
  '/:userId/active',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.PITCH),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    const userId = req.params.userId;
    logger.info(`Got request to lookup user ${userId} active pitches from ${currentUser.email}`);

    userService.findById(userId).then((user) => {
      pitchService
        .findUsersActivePitches(currentUser, user)
        .then((fetchResult) => {
          let filtered = _.map(fetchResult, function (item) {
            return item.filterOut(currentUser);
          });
          return res.json({ payload: filtered });
        })
        .catch((error) => {
          baseHandler.handleError(error, `Unable to handle user's active pitch lookup`, next);
        });
    });
  },
);

/**
 * Handles self pitch deck upload
 */
router.post(
  '/:pitchId/deck',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PITCH),

    // file upload interceptor
    upload.single('pdf'),

    commonValidation.fileUploadValidation.pdfFile,
    validate.request,
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId;
    let currentUser = req.locals.user_object;
    logger.info(
      `Got request to upload pitch deck from ${currentUser.email} to pitch with ID:${pitchId}.`,
    );

    pitchService
      .addPitchDeck(currentUser, pitchId, req.file)
      .then((pitch) => {
        return res.json({ payload: pitch.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle pitch deck upload to pitch with ID:${pitchId} from ${currentUser.email}.`,
          next,
        );
      });
  },
);

/**
 * Handles create pitch deck request
 */
router.put(
  '/:pitchId/deck/request',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.PITCH),

    validate.request,
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId;
    let currentUser = req.locals.user_object;
    logger.info(
      `Got request to create a pitch deck request from ${currentUser.email} to pitch with id: ${pitchId}.`,
    );

    pitchService
      .requestPitchDeck(currentUser, pitchId)
      .then((pitchRequestNotification) => {
        return res.json({ payload: pitchRequestNotification.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle pitch deck request for pitch with id: ${pitchId} from ${currentUser.email}.`,
          next,
        );
      });
  },
);

/**
 * Handles self pitch deck removal
 */
router.delete(
  '/:pitchId/deck',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PROFILE),
  ],
  function (req, res, next) {
    let pitchId = req.params.pitchId;
    let currentUser = req.locals.user_object;
    logger.info(
      `Got request from ${currentUser.email} to remove pitch deck from pitch with ID: ${pitchId}.`,
    );

    pitchService
      .removePitchDeck(currentUser, pitchId, currentUser.role)
      .then((userProfile) => {
        return res.json({ payload: userProfile.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle pitch deck removal for pitch with ID:${pitchId} from ${currentUser.email}.`,
          next,
        );
      });
  },
);

router.get(
  '/:pitchId/bookmark-count',
  [
    // firebase authentication
    authn.firebase,
    // rbac check
    authz.check(acl.READ_OWN, objects.PITCH),
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let pitchId = req.params.pitchId;

    logger.info(
      `Got request from ${currentUser.email} to get bookmark count for pitch with ID: ${pitchId}.`,
    );

    pitchService
      .findPitchBookmarkCount(currentUser, pitchId)
      .then((result) => {
        return res.json({ payload: result });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle to get bookmark count for pitch: ${pitchId}`,
          next,
        );
      });
  },
);

router.post(
  '/:pitchId/like',
  [
    // firebase authentication
    authn.firebase,
    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PITCH),
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let pitchId = req.params.pitchId;

    logger.info(`Got request from ${currentUser.email} to like pitch with ID: ${pitchId}.`);

    pitchService
      .updatePitchStatusLikeNumber(currentUser, pitchId)
      .then((result) => {
        return res.json({ payload: result.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle to increment likes for pitch: ${pitchId}`,
          next,
        );
      });
  },
);

router.post(
  '/:pitchId/unlike',
  [
    // firebase authentication
    authn.firebase,
    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PITCH),
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let pitchId = req.params.pitchId;
    logger.info(`Got request from ${currentUser.email} to unlike pitch with ID: ${pitchId}.`);

    pitchService
      .updatePitchStatusUnlikeNumber(currentUser, pitchId)
      .then((result) => {
        return res.json({ payload: result.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle to decrement likes for pitch: ${pitchId}`,
          next,
        );
      });
  },
);

router.post(
  '/:pitchId/views',
  [
    // firebase authentication
    authn.firebase,
    // rbac check
    authz.check(acl.UPDATE_OWN, objects.PITCH),
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let pitchId = req.params.pitchId;

    logger.info(
      `Got request from ${currentUser.email} to increment the view count for pitch with ID: ${pitchId}.`,
    );

    pitchService
      .updatePitchStatusViewNumber(currentUser, pitchId)
      .then((result) => {
        return res.json({ payload: result.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle to increment views for pitch: ${pitchId}`,
          next,
        );
      });
  },
);

module.exports = router;
