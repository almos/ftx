const router = require('express').Router();
const authn = require('../auth/authn');
const authz = require('../auth/authz');
const validate = require('../validate');
const commonValidation = require('./validation');
const userConnectionService = require('../../services/user-connection');
const acl = require('../../config/security').permissions;
const objects = require('../../config/security').objects;
const _ = require('lodash');
const baseHandler = require('./base');
const logger = require('../../services/logger').instance;
const { param } = require('express-validator');
const userConnectionTypesList = require('../../config/user-connection').userConnectionTypesList;

function addUserIdField(connectionObject, userId) {
  connectionObject.user =
    connectionObject.users[0].id != userId ? connectionObject.users[0] : connectionObject.users[1];

  delete connectionObject.users;
}

/**
 * Validation rules
 */
const connectionValidation = {
  otherId: param('otherId').isAlphanumeric(),
  userId: param('userId').isAlphanumeric(),
  connectionId: param('connectionId').isAlphanumeric(),
  connectionType: param('connectionType').exists().isIn(userConnectionTypesList),
};

/**
 * Creates a new connection between 2 users
 */
router.put(
  '/:connectionType/:otherId',
  [
    // firebase authentication
    authn.firebase,
    connectionValidation.connectionType,
    connectionValidation.otherId,
    validate.request,
    // rbac check
    authz.check(acl.UPDATE_OWN, objects.USER_CONNECTION),
  ],
  function (req, res, next) {
    const currentUser = req.locals.user_object;
    const otherUserId = req.params.otherId;
    const connectionType = req.params.connectionType;

    userConnectionService
      .createConnectionRequest(currentUser, otherUserId, connectionType)
      .then((result) => {
        result.filterOut(currentUser);
        res.json({ payload: result });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle connection put request`, next);
      });
  },
);

router.get(
  '/',
  [
    // firebase authentication
    authn.firebase,
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    validate.request,
    // rbac check
    authz.check(acl.READ_OWN, objects.USER_CONNECTION),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object,
      paging = baseHandler.processPage(req);
    filterOwnConnectionListByType(currentUser, undefined, paging, res);
  },
);

router.get(
  '/:connectionType',
  [
    // firebase authentication
    authn.firebase,
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    connectionValidation.connectionType,
    validate.request,
    // rbac check
    authz.check(acl.READ_OWN, objects.USER_CONNECTION),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object,
      paging = baseHandler.processPage(req),
      connectionType = req.params.connectionType;
    filterOwnConnectionListByType(currentUser, connectionType, paging, res);
  },
);

router.get(
  '/:userId/:connectionType',
  [
    // firebase authentication
    authn.firebase,
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    connectionValidation.connectionType,
    connectionValidation.userId,
    validate.request,
    // rbac check
    authz.check(acl.READ_OWN, objects.USER_CONNECTION),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object,
      userId = req.params.userId,
      paging = baseHandler.processPage(req),
      connectionType = req.params.connectionType;
    filterUserConnectionListByType(currentUser, userId, connectionType, paging, res);
  },
);

router.delete(
  '/:connectionId',
  [
    // firebase authentication
    authn.firebase,
    connectionValidation.connectionId,
    validate.request,
    // rbac check
    authz.check(acl.DELETE_OWN, objects.USER_CONNECTION),
  ],
  function (req, res, next) {
    const currentUser = req.locals.user_object;
    const connectionId = req.params.connectionId;

    userConnectionService
      .deleteConnection(currentUser, connectionId)
      .then((result) => {
        res.json({ payload: result });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle delete connection request`, next);
      });
  },
);

function filterOwnConnectionListByType(currentUser, connectionType, paging, res) {
  userConnectionService
    .findConnections(currentUser, connectionType, paging.skip, paging.pageSize)
    .then((result) => {
      let objects = _.map(result.objects, function (item) {
        item.filterOut(currentUser);
        addUserIdField(item, currentUser.id);
        return item;
      });

      result.paging.pageSize = paging.pageSize;
      return res.json({ payload: objects, paging: result.paging });
    })
    .catch((error) => {
      baseHandler.handleError(error, `Unable to handle connections retrieval request`, next);
    });
}

function filterUserConnectionListByType(currentUser, userId, connectionType, paging, res) {
  userConnectionService
    .findUsersConnections(currentUser, userId, connectionType, paging.skip, paging.pageSize)
    .then((result) => {
      let objects = _.map(result.objects, function (item) {
        item.filterOut(currentUser);
        addUserIdField(item, userId);
        return item;
      });

      result.paging.pageSize = paging.pageSize;
      return res.json({ payload: objects, paging: result.paging });
    })
    .catch((error) => {
      baseHandler.handleError(error, `Unable to handle connections retrieval request`, next);
    });
}

module.exports = router;
