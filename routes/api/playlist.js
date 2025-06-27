const router = require('express').Router();

const { query } = require('express-validator');
const authn = require('../auth/authn');
const authz = require('../auth/authz');
const logger = require('../../services/logger').instance;
const validate = require('../validate');
const objects = require('../../config/security').objects;
const acl = require('../../config/security').permissions;
const multer = require('multer');
const config = require('../../config');
const upload = multer({ dest: config.videoTempUploadDir });
const commonValidation = require('./validation');
const _ = require('lodash');
const baseHandler = require('./base');
const playlistService = require('../../services/playlist');
const googleCloudStorageService = require('../../services/cloud-storage');

/**
 * Handles playlist creation
 */
router.put(
  '/',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.PLAYLIST),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;

    logger.info(`Got request to create a playlist from ${currentUser.email}`);

    playlistService
      .createPlaylist(req.body, currentUser.role)
      .then((authorObject) => {
        return res.json({ payload: authorObject });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle playlist creation request`, next);
      });
  },
);

/**
 * Public playlist search with pagination
 */
router.get(
  '/search',
  [
    // firebase authentication
    authn.firebase,

    query('q').isString().optional(),
    query('tags').isArray().optional(),
    query('sub').isBoolean().optional(),
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    validate.request,

    // rbac check
    authz.check(acl.READ_ANY, objects.AUTHOR),
  ],
  function (req, res, next) {
    searchPlaylist(req, res, next, true);
  },
);

/**
 * Public playlist search with pagination
 * Admin-only endpoint
 */
router.get(
  '/search/all',
  [
    // firebase authentication
    authn.firebase,

    query('q').isString().optional(),
    query('tags').isArray().optional(),
    query('sub').isBoolean().optional(),
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    validate.request,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.AUTHOR),
  ],
  function (req, res, next) {
    searchPlaylist(req, res, next, false);
  },
);

function searchPlaylist(req, res, next, publicOnly) {
  _.defaults(req.query, { sub: false });

  let currentUser = req.locals.user_object,
    paging = baseHandler.processPage(req),
    queryString = req.query.q,
    tags = req.query.tags,
    sub = baseHandler.parseBool(req.query.sub);
  logger.info(`Got request to search for playlists by ${currentUser.email}`);

  playlistService
    .search(queryString, tags, publicOnly, paging.skip, paging.pageSize, sub)
    .then((foundPlaylists) => {
      let objects = _.map(foundPlaylists.objects, function (item) {
        return item.filterOut(currentUser);
      });

      foundPlaylists.paging.pageSize = paging.pageSize;
      return res.json({ payload: objects, paging: foundPlaylists.paging });
    })
    .catch((error) => {
      baseHandler.handleError(error, `Unable to handle playlist search`, next);
    });
}

/**
 * Gets a playlist by ID
 */
router.get(
  '/:playlistId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.PLAYLIST),
  ],
  function (req, res, next) {
    let playlistId = req.params.playlistId;
    let currentUser = req.locals.user_object;

    logger.info(`Got request to retrieve playlist ${playlistId} from ${currentUser.email}`);

    playlistService
      .findById(playlistId)
      .then((pitch) => {
        return res.json({ payload: pitch });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to retrieve playlist ${playlistId}`, next);
      });
  },
);

/**
 * Updates a playlist by a given ID
 */
router.post(
  '/:playlistId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_ANY, objects.PLAYLIST),
  ],
  function (req, res, next) {
    let playlistId = req.params.playlistId;
    let currentUser = req.locals.user_object;

    logger.info(`Got request to update a playlist ${playlistId} from ${currentUser.email}`);

    playlistService
      .updatePlaylist(playlistId, req.body, currentUser.role)
      .then((playlistObject) => {
        return res.json({ payload: playlistObject });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle playlist ${playlistId} update request`,
          next,
        );
      });
  },
);

/**
 * Handles thumbnail upload for the given playlist
 */
router.post(
  '/:playlistId/thumbnail',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_ANY, objects.PROFILE),

    // file upload interceptor
    upload.single('image'),

    commonValidation.fileUploadValidation.imageFile,
    validate.request,
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object,
      playlistId = req.params.playlistId;

    logger.info(`Got request to upload playlist ${playlistId} thumbnail from ${currentUser.email}`);

    googleCloudStorageService
      .uploadToBucket(req.file)
      .then((urloadUrl) =>
        playlistService.setPlaylistThumbnail(playlistId, urloadUrl, currentUser.role),
      )
      .then((userProfile) => {
        return res.json({ payload: userProfile });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle thumbnail upload ${req.file.filename} for playlist ${playlistId}`,
          next,
        );
      });
  },
);

module.exports = router;
