const router = require('express').Router();

const { body, check, query, param } = require('express-validator');
const authn = require('../auth/authn');
const authz = require('../auth/authz');
const config = require('../../config');
const acl = require('../../config/security').permissions;
const logger = require('../../services/logger').instance;
const objects = require('../../config/security').objects;
const multer = require('multer');
const upload = multer({ dest: config.videoTempUploadDir });
const videoService = require('../../services/video');
const validate = require('../validate');
const commonValidation = require('./validation');
const baseHandler = require('./base');
const timeout = require('connect-timeout');
const _ = require('lodash');

/**
 * Validation rules
 */
const VideoViewmarkValidation = {
  lastWatchedAtSec: body('lastWatchedAtSec').isInt(),
  completed: body('completed').isBoolean(),
};

const VideoMetadataValidation = {
  evaluationCriteria: body('metadata.evaluationCriteria')
    .isArray()
    .custom((evaluationCriteries) => {
      return videoService.isEvaluationCriteriesValid(evaluationCriteries).then((isValid) => {
        if (isValid) return true;
        else return Promise.reject('invalid value');
      });
    }),
  stage: body('metadata.stage')
    .isArray()
    .custom((stages) => {
      return videoService.isStagesValid(stages).then((isValid) => {
        if (isValid) return true;
        else return Promise.reject('invalid value');
      });
    }),
};

/**
 * Handles video upload
 */
router.put(
  '/',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.VIDEO),

    // extended timeout for large transfers
    timeout(config.server.longTimeout),

    // file upload interceptor
    upload.single('video'),

    commonValidation.fileUploadValidation.videoFile,
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    logger.info(`Got request to upload user video from ${currentUser.email}`);

    videoService
      .createVideo(req.file.path, currentUser.id)
      .then((videoObject) => {
        return res.json({ payload: videoObject.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle video upload ${req.file.filename}`, next);
      });
  },
);

/**
 * Handles video information update
 */
router.post(
  '/:videoId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_ANY, objects.VIDEO),

    VideoMetadataValidation.evaluationCriteria.optional(),
    VideoMetadataValidation.stage.optional(),
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let videoId = req.params.videoId;

    logger.info(`Got request to update user video ${videoId} from ${currentUser.email}`);

    videoService
      .updateVideo(videoId, req.body, currentUser.role)
      .then((videoObject) => {
        return res.json({ payload: videoObject.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle video update ${videoId}`, next);
      });
  },
);

/**
 * Handles video like
 */
router.get(
  '/:videoId/like',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_OWN, objects.LIKE),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let videoId = req.params.videoId;

    logger.info(`Got request to like video ${videoId} by ${currentUser.email}`);

    videoService
      .likeVideo(videoId, currentUser.id)
      .then((videoObject) => {
        return res.json({});
      })
      .catch((error) => {
        baseHandler(error, `Unable to handle adding a like to ${videoId}`, next);
      });
  },
);

/**
 * Handles video dislike
 */
router.get(
  '/:videoId/dislike',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.DELETE_OWN, objects.LIKE),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let videoId = req.params.videoId;

    logger.info(`Got request to like video ${videoId} by ${currentUser.email}`);

    videoService
      .dislikeVideo(videoId, currentUser.id)
      .then((videoObject) => {
        return res.json({});
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle removing a like from ${videoId}`, next);
      });
  },
);

router.get(
  '/search',
  [
    // firebase authentication
    authn.firebase,

    query('q').isString().optional(),
    query('tags').isArray().optional(),
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    query('author').isString().optional(),
    validate.request,

    // rbac check
    authz.check(acl.READ_ANY, objects.VIDEO),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object,
      queryString = req.query.q,
      tags = req.query.tags,
      author = req.query.author,
      paging = baseHandler.processPage(req);

    logger.info(`Got request to search for videos by ${currentUser.email}`);

    videoService
      .search(queryString, author, tags, paging.skip, paging.pageSize)
      .then((foundVideos) => {
        let objects = _.map(foundVideos.objects, function (item) {
          return item.filterOut(currentUser);
        });

        foundVideos.paging.pageSize = paging.pageSize;
        return res.json({ payload: objects, paging: foundVideos.paging });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle video search`, next);
      });
  },
);

/**
 * Handles video information retrieval
 */
router.get(
  '/:videoId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.VIDEO),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let videoId = req.params.videoId;

    logger.info(`Got request to retrieve video ${videoId} from ${currentUser.email}`);

    videoService
      .findById(videoId, req.body, currentUser.role)
      .then((videoObject) => {
        return res.json({ payload: videoObject.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle video retrieval ${videoId}`, next);
      });
  },
);

/**
 * Handles video viewmark information update
 */
router.post(
  '/:videoId/viewmark',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.VIDEO),

    VideoViewmarkValidation.lastWatchedAtSec.optional(),
    VideoViewmarkValidation.completed.optional(),
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let videoId = req.params.videoId;

    logger.info(`Got request to update video view mark for ${videoId} from ${currentUser.email}`);

    videoService
      .setViewMark(videoId, currentUser.id, req.body, currentUser.role)
      .then((viewMarkObject) => {
        return res.json({ payload: viewMarkObject.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle video view mark setup ${videoId}`, next);
      });
  },
);

/**
 * Handles video viewmark retrieval
 */
router.get(
  '/:videoId/viewmark',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.VIDEO),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let videoId = req.params.videoId;

    logger.info(`Got request to retrieve video view mark for ${videoId} from ${currentUser.email}`);

    videoService
      .getViewMark(videoId, currentUser.id)
      .then((viewMarkObject) => {
        return res.json({ payload: viewMarkObject.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to retrieve video view mark setup ${videoId}`, next);
      });
  },
);

module.exports = router;
