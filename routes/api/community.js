const router = require('express').Router();

const { body, check, query, param } = require('express-validator');
const authn = require('../auth/authn');
const authz = require('../auth/authz');
const logger = require('../../services/logger').instance;
const communityService = require('../../services/community');
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

/**
 * Validation rules
 */
const communityValidation = {
  communityPostId: param('communityPostId').trim().notEmpty(),
  title: body('title').notEmpty(),
  description: body('description').trim().notEmpty(),
  url: body('url').trim().notEmpty(),
  tags: body('tags').isArray(),
  pushNotifications: body('pushNotifications').isBoolean(),
};

/**
 * Creates new Community Feed Post - Admin endpoint.
 */
router.put(
  '/',
  [
    authn.firebase,
    authz.check(acl.CREATE_ANY, objects.COMMUNITY_FEED),
    communityValidation.title,
    communityValidation.description.optional(),
    communityValidation.url.optional(),
    communityValidation.tags.optional(),
    communityValidation.pushNotifications.optional(),
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    logger.info(`Got request to create the community feed post from ${currentUser.email}`);

    communityService
      .createCommunityFeedPost(currentUser, req.body)
      .then((communityPost) => {
        res.json({ payload: communityPost.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle adding community feed post.`, next);
      });
  },
);

/**
 * Get all community Feed Posts with Paginate
 */
router.get(
  '/search',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.COMMUNITY_FEED),
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object,
      paging = baseHandler.processPage(req);

    logger.info(`Got request to search community from user: ${currentUser.email}`);

    communityService
      .searchCommunityFeedPost(currentUser, paging)
      .then((communityPostList) => {
        let objects = _.map(communityPostList.objects, function (item) {
          return item.filterOut(currentUser);
        });

        communityPostList.paging.pageSize = paging.pageSize;
        return res.json({ payload: objects, paging: communityPostList.paging });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Can not search all community feed. `, next);
      });
  },
);

/**
 * get Specific Community Feed Post by Community Post Id
 */
router.get(
  '/:communityPostId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.COMMUNITY_FEED),
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object,
      communityPostId = req.params.communityPostId;

    logger.info(`Got request to get communityPostId: ${communityPostId}`);

    communityService
      .findById(communityPostId)
      .then((communityPost) => {
        return res.json({ payload: communityPost.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to find community feed post with id: ${communityPostId}.`,
          next,
        );
      });
  },
);

/**
 * Update Specific Community Feed Post by Community Feed Post Id
 */
router.post(
  '/:communityPostId',
  [
    authn.firebase,
    authz.check(acl.UPDATE_ANY, objects.COMMUNITY_FEED),
    communityValidation.title.optional(),
    communityValidation.description.optional(),
    communityValidation.url.optional(),
    communityValidation.tags.optional(),
    communityValidation.pushNotifications.optional(),
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let communityPostId = req.params.communityPostId;

    logger.info(`Got request to update community post with id:  ${communityPostId}. `);

    communityService
      .updateCommunityFeedPost(currentUser, communityPostId, req.body)
      .then((communityPost) => {
        res.json({ payload: communityPost.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle updating community feed post: ${communityPostId}`,
          next,
        );
      });
  },
);

/**
 * Update Specific Community Feed Post by Community Feed Post Id
 */
router.post(
  '/image/:communityPostId',
  [
    authn.firebase,
    authz.check(acl.UPDATE_ANY, objects.COMMUNITY_FEED),
    upload.single('image'),
    commonValidation.fileUploadValidation.imageFileNotRequired,
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let communityPostId = req.params.communityPostId;

    logger.info(`Got request to upload image to post with id: ${communityPostId}`);

    communityService
      .uploadCoverImage(currentUser, communityPostId, req.file)
      .then((communityPost) => {
        res.json({ payload: communityPost.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle updating community feed post: ${communityPostId}`,
          next,
        );
      });
  },
);

/**
 * Delete Specific Community Post by Community Feed Post Id
 */
router.delete(
  '/:communityPostId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.DELETE_ANY, objects.COMMUNITY_FEED),
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object,
      communityPostId = req.params.communityPostId;

    logger.info(`Got request to delete community post with id: ${communityPostId}`);

    communityService
      .deleteCommunityFeedPost(currentUser, communityPostId)
      .then((communityPost) => {
        res.json({ payload: communityPost.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle deleting community feed post: ${communityPostId}`,
          next,
        );
      });
  },
);

module.exports = router;
