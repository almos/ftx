const router = require('express').Router();

const { query } = require('express-validator');
const authn = require('../auth/authn');
const authz = require('../auth/authz');
const logger = require('../../services/logger').instance;
const validate = require('../validate');
const objects = require('../../config/security').objects;
const acl = require('../../config/security').permissions;
const config = require('../../config');
const commonValidation = require('./validation');
const _ = require('lodash');
const baseHandler = require('./base');
const groupService = require('../../services/group');

/**
 * Handles group creation
 */
router.put(
  '/',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.GROUP),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;

    logger.info(`Got request to create a group from ${currentUser.email}`);

    groupService
      .createGroup(req.body, currentUser.role)
      .then((authorObject) => {
        return res.json({ payload: authorObject });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle group creation request`, next);
      });
  },
);

/**
 * Public group search with pagination
 */
router.get(
  '/search',
  [
    // firebase authentication
    authn.firebase,

    query('q').isString().optional(),
    query('organization').isString().optional(),
    query('private').isBoolean().optional(),
    query('limit').isBoolean().optional(),
    query('sub').isBoolean().optional(),
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    validate.request,

    // rbac check
    authz.check(acl.READ_ANY, objects.GROUP),
  ],
  function (req, res, next) {
    searchGroup(req, res, next, true);
  },
);

function searchGroup(req, res, next, publicOnly) {
  _.defaults(req.query, { sub: false });
  _.defaults(req.query, { private: false });
  _.defaults(req.query, { limit: false });
  _.defaults(req.query, { organization: null });

  let currentUser = req.locals.user_object,
    paging = baseHandler.processPage(req),
    queryString = req.query.q,
    organization = req.query.organization,
    isPrivate = baseHandler.parseBool(req.query.private),
    limitReviewers = baseHandler.parseBool(req.query.limit),
    sub = baseHandler.parseBool(req.query.sub);

  logger.info(`Got request to search for groups by ${currentUser.email}`);

  groupService
    .search(queryString, organization, isPrivate, limitReviewers, paging.skip, paging.pageSize, sub)
    .then((foundGroups) => {
      let objects = _.map(foundGroups.objects, function (item) {
        return item.filterOut(currentUser);
      });

      foundGroups.paging.pageSize = paging.pageSize;
      return res.json({ payload: objects, paging: foundGroups.paging });
    })
    .catch((error) => {
      baseHandler.handleError(error, `Unable to handle group search`, next);
    });
}

/**
 * Group search all with pagination - Admin only
 */
router.get(
  '/search/all',
  [
    // firebase authentication
    authn.firebase,

    query('title').isString().optional(),
    query('type').isString().optional(),
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    validate.request,

    // rbac check
    authz.check(acl.READ_ANY, objects.GROUP),
  ],
  function (req, res, next) {
    searchGroupAll(req, res, next);
  },
);

function searchGroupAll(req, res, next) {
  let currentUser = req.locals.user_object,
    paging = baseHandler.processPage(req),
    title = req.query.title,
    type = req.query.type;

  logger.info(`Got request to search all for groups by ${currentUser.email}`);

  groupService
    .searchAll(title, type, paging.skip, paging.pageSize)
    .then((foundGroups) => {
      let objects = _.map(foundGroups.objects, function (item) {
        return item.filterOut(currentUser);
      });

      foundGroups.paging.pageSize = paging.pageSize;
      return res.json({ payload: objects, paging: foundGroups.paging });
    })
    .catch((error) => {
      baseHandler.handleError(error, `Unable to handle group search all`, next);
    });
}

/**
 * Gets a group by ID
 */
router.get(
  '/:groupId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.GROUP),
  ],
  function (req, res, next) {
    let groupId = req.params.groupId;
    let currentUser = req.locals.user_object;

    logger.info(`Got request to retrieve group ${groupId} from ${currentUser.email}`);

    groupService
      .findById(groupId)
      .then((pitch) => {
        return res.json({ payload: pitch });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to retrieve group ${groupId}`, next);
      });
  },
);

/**
 * Updates a group by a given ID
 */
router.post(
  '/:groupId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_ANY, objects.GROUP),
  ],
  function (req, res, next) {
    let groupId = req.params.groupId;
    let currentUser = req.locals.user_object;

    logger.info(`Got request to update a group ${groupId} from ${currentUser.email}`);

    groupService
      .updateGroup(groupId, req.body, currentUser.role)
      .then((groupObject) => {
        return res.json({ payload: groupObject });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle group ${groupId} update request`, next);
      });
  },
);

module.exports = router;
