let router = require('express').Router();

const { body, query } = require('express-validator');
const authn = require('../auth/authn');
const authz = require('../auth/authz');
const logger = require('../../services/logger').instance;
const businessIdeaService = require('../../services/business-idea');
const validate = require('../validate');
const acl = require('../../config/security').permissions;
const objects = require('../../config/security').objects;
const pitchService = require('../../services/pitch');
const baseHandler = require('./base');
const _ = require('lodash');
const multer = require('multer');
const config = require('../../config');
const upload = multer({ dest: config.videoTempUploadDir });
const languagesCodeList = require('../../services/language').getLanguagesCodeList;
const commonValidation = require('./validation');

/**
 * Validation rules
 */
const businessIdeaValidation = {
  id: body('id').isAlphanumeric(),
  title: body('title').isString(),
  description: body('description').isString(),
  teamDescription: body('teamDescription').isString(),
  tractionDescription: body('tractionDescription').isString(),
  language: body('language').isIn(languagesCodeList()),
  websiteUrl: body('websiteUrl').isString(),
  twitterUrl: body('twitterUrl').isURL(),
  facebookUrl: body('facebookUrl').isURL(),
  industries: body('industries').isArray(),
  location: body('location').isArray(),
  stage: body('stage')
    .isString()
    .custom((stage) => {
      return businessIdeaService.isStageValid(stage).then((isValid) => {
        if (isValid) return true;
        else return Promise.reject('invalid value');
      });
    }),
};

/**
 * Creates new business idea
 */
router.put(
  '/',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.BUSINESS_IDEA),

    // request validation rules
    upload.single('image'),
    commonValidation.fileUploadValidation.imageFileNotRequired,
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
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;

    logger.info(
      `Got request to create business idea ${JSON.stringify(req.body)} from ${currentUser.email} `,
    );

    businessIdeaService
      .createIdea(currentUser, req.body, req.file)
      .then((businessIdeaObject) => {
        return res.json({ payload: businessIdeaObject });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle business idea creation`, next);
      });
  },
);

/**
 * Updates a business idea
 */
router.post(
  '/:businessIdeaId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.BUSINESS_IDEA),

    // request validation rules
    upload.single('image'),
    commonValidation.fileUploadValidation.imageFileNotRequired,
    businessIdeaValidation.title.optional(),
    businessIdeaValidation.description.optional(),
    businessIdeaValidation.teamDescription.optional(),
    businessIdeaValidation.tractionDescription.optional(),
    businessIdeaValidation.websiteUrl.optional(),
    businessIdeaValidation.twitterUrl.optional(),
    businessIdeaValidation.facebookUrl.optional(),
    businessIdeaValidation.industries.optional(),
    businessIdeaValidation.location.optional(),
    businessIdeaValidation.stage.optional(),
    businessIdeaValidation.language.optional(),
    validate.request,
  ],
  function (req, res, next) {
    let businessIdeaId = req.params.businessIdeaId;
    let currentUser = req.locals.user_object;

    logger.info(
      `Got request to update a business idea ${JSON.stringify(req.body)} from ${currentUser.email}`,
    );

    businessIdeaService
      .updateIdea(currentUser, businessIdeaId, req.body)
      .then((businessIdeaObject) => {
        return res.json({ payload: businessIdeaObject });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle business idea creation`, next);
      });
  },
);

/**
 * Retrieves user owned business ideas
 */
router.get(
  '/my',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_OWN, objects.BUSINESS_IDEA),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    logger.info(
      `Got request to retrieve own business ideas ${JSON.stringify(req.body)} of ${
        currentUser.email
      }`,
    );

    businessIdeaService
      .findAllByUser(currentUser)
      .then((businessIdeasObject) => {
        return res.json({ payload: businessIdeasObject });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to retrieve business ideas`, next);
      });
  },
);

/**
 * Retrieves existing business idea
 */
router.get(
  '/:businessIdeaId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.BUSINESS_IDEA),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let businessIdeaId = req.params.businessIdeaId;

    logger.info(
      `Got request to retrieve a business idea ${businessIdeaId} for ${currentUser.email}`,
    );
    businessIdeaService
      .findById(currentUser, businessIdeaId)
      .then((businessIdeaObject) => {
        return res.json({ payload: businessIdeaObject.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to retrieve business idea ${businessIdeaId}`, next);
      });
  },
);

/**
 * Retrieves existing business idea
 */
router.get(
  '/:businessIdeaId/pitches',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.BUSINESS_IDEA),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let businessIdeaId = req.params.businessIdeaId;

    logger.info(
      `Got request to retrieve a pitches attached to a business idea ${businessIdeaId} for ${currentUser.email}`,
    );
    pitchService
      .findByBusinessIdea(currentUser, businessIdeaId)
      .then((businessIdeaPitches) => {
        let filtered = _.map(businessIdeaPitches, function (item) {
          return item.filterOut(currentUser);
        });
        return res.json({ payload: filtered });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to retrieve pitches attached to a business idea ${businessIdeaId}`,
          next,
        );
      });
  },
);

router.put(
  '/search',
  [
    // firebase authentication
    authn.firebase,

    query('q').isString().optional(),
    query('language').isArray().optional(),
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    validate.request,

    // rbac check
    authz.check(acl.READ_ANY, objects.BUSINESS_IDEA),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object,
      currentUserId = currentUser.id,
      paging = baseHandler.processPage(req);

    // setting default request values
    _.defaults(req.query, { sub: false });
    _.defaults(req.query, { excludeOwn: true });

    let queryString = req.query.q,
      sub = baseHandler.parseBool(req.query.sub),
      languages = req.query.language,
      groups = req.query.groups,
      excludeOwn = baseHandler.parseBool(req.query.excludeOwn);

    logger.info(`Got request to search for business ideas by ${currentUser.email}`);

    businessIdeaService
      .search(
        currentUser,
        queryString,
        paging.skip,
        paging.pageSize,
        sub,
        languages,
        excludeOwn ? currentUserId : undefined,
        groups,
      )
      .then((foundbusinessIdeas) => {
        let objects = _.map(foundbusinessIdeas.objects, function (item) {
          return item.filterOut(currentUser);
        });

        foundbusinessIdeas.paging.pageSize = paging.pageSize;
        return res.json({ payload: objects, paging: foundbusinessIdeas.paging });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle business idea search for user: ${currentUser.email}`,
          next,
        );
      });
  },
);

/**
 * Update Specific business idea logo by id
 */
router.post(
  '/logo/:businessIdeaId',
  [
    authn.firebase,
    authz.check(acl.UPDATE_OWN, objects.BUSINESS_IDEA),
    upload.single('image'),
    commonValidation.fileUploadValidation.imageFile,
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let businessIdeaId = req.params.businessIdeaId;

    logger.info(`Got request to upload image to idea with id:  ${businessIdeaId}.`);

    businessIdeaService
      .uploadLogo(currentUser, businessIdeaId, req.file)
      .then((businessIdea) => {
        res.json({ payload: businessIdea.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle upload logo for user: ${currentUser.email}`,
          next,
        );
      });
  },
);

module.exports = router;
