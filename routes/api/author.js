const router = require('express').Router();

const { body, check, query, param } = require('express-validator');
const authn = require('../auth/authn');
const authz = require('../auth/authz');
const logger = require('../../services/logger').instance;
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
const authorService = require('../../services/author');

/**
 * Handles author creation
 */
router.put(
  '/',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.AUTHOR),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;

    logger.info(`Got request to create an author from ${currentUser.email}`);

    authorService
      .createAuthor(req.body, currentUser.role)
      .then((authorObject) => {
        return res.json({ payload: authorObject });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle author creation request`, next);
      });
  },
);

/**
 * Author search with pagination
 * Admin-only endpoint
 */
router.get(
  '/search',
  [
    // firebase authentication
    authn.firebase,

    query('q').isString().optional(),
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    validate.request,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.AUTHOR),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object,
      paging = baseHandler.processPage(req),
      queryString = req.query.q;

    logger.info(`Got request to search for authors by ${currentUser.email}`);

    authorService
      .search(queryString, paging.skip, paging.pageSize)
      .then((foundAuthors) => {
        let objects = _.map(foundAuthors.objects, function (item) {
          return item.filterOut(currentUser);
        });

        foundAuthors.paging.pageSize = paging.pageSize;
        return res.json({ payload: objects, paging: foundAuthors.paging });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle author search`, next);
      });
  },
);

/**
 * Updates an author
 */
router.post(
  '/:authorId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_ANY, objects.AUTHOR),
  ],
  function (req, res, next) {
    let authorId = req.params.authorId;
    let currentUser = req.locals.user_object;

    logger.info(
      `Got request to update an author ${JSON.stringify(req.body)} from ${currentUser.email}`,
    );

    authorService
      .updateAuthor(authorId, req.body, currentUser.role)
      .then((authorObject) => {
        return res.json({ payload: authorObject });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle author creation`, next);
      });
  },
);

/**
 * Retrieves existing author
 */
router.get(
  '/:authorId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.AUTHOR),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let authorId = req.params.authorId;

    logger.info(`Got request to retrieve an authorId ${authorId} for ${currentUser.email}`);

    authorService
      .findById(authorId)
      .then((authorObject) => {
        return res.json({ payload: authorObject });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to retrieve an author ${authorId}`, next);
      });
  },
);

/**
 * Handles avatar upload
 */
router.post(
  '/avatar/:authorId',
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
      authorId = req.params.authorId;

    logger.info(`Got request to upload author avatar from ${currentUser.email}`);

    authorService
      .addAvatar(authorId, req.file, currentUser.role)
      .then((authorObject) => {
        return res.json({ payload: authorObject });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle author's avatar upload ${req.file.filename}`,
          next,
        );
      });
  },
);

/**
 * Handles avatar removal
 */
router.delete(
  '/avatar/:authorId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_ANY, objects.PROFILE),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;
    let authorId = req.params.authorId;
    logger.info(`Got request to delete author avatar from ${currentUser.email}`);

    authorService
      .removeAvatar(authorId, currentUser.role)
      .then((authorObject) => {
        return res.json({ payload: authorObject });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle author's avatar removal ${authorId}`,
          next,
        );
      });
  },
);

module.exports = router;
