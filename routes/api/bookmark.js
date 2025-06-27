const router = require('express').Router();

const authn = require('../auth/authn');
const authz = require('../auth/authz');
const logger = require('../../services/logger').instance;
const validate = require('../validate');
const objects = require('../../config/security').objects;
const acl = require('../../config/security').permissions;
const baseHandler = require('./base');
const bookmarkService = require('../../services/bookmark');
const _ = require('lodash');

/**
 * Handles bookmark creation
 */
router.put(
  '/:type/:objectId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_OWN, objects.BOOKMARK),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object,
      type = req.params.type,
      objectId = req.params.objectId;

    logger.info(`Got request to create a bookmark from ${currentUser.email}`);

    bookmarkService
      .createBookmark(currentUser, type, objectId)
      .then((result) => {
        return res.json({ payload: result.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle bookmark creation request from user ${currentUser.email}`,
          next,
        );
      });
  },
);

/**
 * Gets all bookmarks for a given user
 */
router.get(
  '/',
  [
    // firebase authentication
    authn.firebase,
    validate.request,

    // rbac check
    authz.check(acl.READ_OWN, objects.BOOKMARK),
  ],
  function (req, res, next) {
    filterBookmarks(req, res, next);
  },
);

/**
 * Gets all bookmarks for a given user by type
 */
router.get(
  '/:type',
  [
    // firebase authentication
    authn.firebase,
    validate.request,

    // rbac check
    authz.check(acl.READ_OWN, objects.BOOKMARK),
  ],
  function (req, res, next) {
    filterBookmarks(req, res, next);
  },
);

/**
 * Delete a bookmark for a given user
 */
router.delete(
  '/:bookmarkId',
  [
    // firebase authentication
    authn.firebase,
    validate.request,

    // rbac check
    authz.check(acl.DELETE_OWN, objects.BOOKMARK),
  ],
  function (req, res, next) {
    const bookmarkId = req.params.bookmarkId;
    const currentUser = req.locals.user_object;

    logger.info(`Got request to delete a bookmark: ${bookmarkId} from ${currentUser.email}`);

    bookmarkService
      .deleteBookmark(bookmarkId)
      .then((result) => {
        return res.json({ payload: result.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle bookmark delete for bookmark: ${bookmarkId} from ${currentUser.email}`,
          next,
        );
      });
  },
);

function filterBookmarks(req, res, next) {
  let currentUser = req.locals.user_object,
    type = req.params.type,
    paging = baseHandler.processPage(req);

  logger.info(`Got request to get bookmarks from ${currentUser.email}`);

  bookmarkService
    .findManyOwn(currentUser.id, type, paging.skip, paging.pageSize)
    .then((result) => {
      let objects = _.map(result.objects, function (item) {
        return item.filterOut(currentUser);
      });
      result.paging.pageSize = paging.pageSize;

      return res.json({ payload: objects, paging: result.paging });
    })
    .catch((error) => {
      baseHandler.handleError(
        error,
        `Unable to handle bookmark get request for user: ${currentUser.email}`,
        next,
      );
    });
}

module.exports = router;
