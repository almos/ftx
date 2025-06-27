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
const systemConfigsService = require('../../services/system-config');

/**
 * Handles system config creation
 */
router.put(
  '/',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.CREATE_ANY, objects.SYSTEM_CONFIG),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object;

    logger.info(`Got request to create a system config from ${currentUser.email}`);

    systemConfigsService
      .createSystemConfig(req.body, currentUser.role)
      .then((result) => {
        return res.json({ payload: result.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to handle system config creation request`, next);
      });
  },
);

/**
 * Public system config search with pagination
 */
router.get(
  '/search/:groupKey/:locale',
  [
    query('q').isString().optional(),
    commonValidation.pagingValidation.page,
    commonValidation.pagingValidation.pageSize,
    validate.request,
  ],
  function (req, res, next) {
    searchSystemConfigs(req, res, next);
  },
);

/**
 * Gets a config by ID
 */
router.get(
  '/:configId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.SYSTEM_CONFIG),
  ],
  function (req, res, next) {
    let id = req.params.configId;
    let currentUser = req.locals.user_object;

    logger.info(`Got request to get system config ${id} from ${currentUser.email}`);

    systemConfigsService
      .findById(id)
      .then((config) => {
        return res.json({ payload: config.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to retrieve system config ${id}`, next);
      });
  },
);

/**
 * Gets a config by item key
 */
router.get(
  '/item/:itemKey/:locale',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.READ_ANY, objects.SYSTEM_CONFIG),
  ],
  function (req, res, next) {
    let itemKey = req.params.itemKey;
    let locale = req.params.locale;
    let currentUser = req.locals.user_object;

    logger.info(`Got request to get system config ${itemKey} from ${currentUser.email}`);

    systemConfigsService
      .findByItemKeyAndLocale(itemKey, locale)
      .then((config) => {
        return res.json({ payload: config.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(error, `Unable to retrieve system config ${id}`, next);
      });
  },
);

/**
 * Updates a config by a given ID
 */
router.post(
  '/:configId',
  [
    // firebase authentication
    authn.firebase,

    // rbac check
    authz.check(acl.UPDATE_ANY, objects.SYSTEM_CONFIG),
  ],
  function (req, res, next) {
    let configId = req.params.configId;
    let currentUser = req.locals.user_object;

    logger.info(`Got request to update a system config ${configId} from ${currentUser.email}`);

    systemConfigsService
      .updateSystemConfig(configId, req.body, currentUser.role)
      .then((result) => {
        return res.json({ payload: result.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Unable to handle system config ${configId} update request`,
          next,
        );
      });
  },
);

/**
 * Gets a list from a group key and locale. Intended for small lists only
 */
router.get('/list/:groupKey/:locale', [], function (req, res, next) {
  let groupKey = req.params.groupKey;
  let locale = req.params.locale;

  logger.info(`Got request to get system config ${groupKey}`);

  systemConfigsService
    .findList(groupKey, locale)
    .then((list) => {
      return res.json({ payload: list });
    })
    .catch((error) => {
      baseHandler.handleError(error, `Unable to retrieve system config group ${groupKey}`, next);
    });
});

function searchSystemConfigs(req, res, next) {
  let groupKey = req.params.groupKey;
  let locale = req.params.locale;
  _.defaults(req.query, { limit: false });

  let paging = baseHandler.processPage(req),
    queryString = req.query.q;

  logger.info(`Got request to search for system configs`);

  systemConfigsService
    .search(queryString, groupKey, locale, paging.skip, paging.pageSize)
    .then((foundConfigs) => {
      foundConfigs.paging.pageSize = paging.pageSize;
      return res.json({ payload: foundConfigs.objects, paging: foundConfigs.paging });
    })
    .catch((error) => {
      baseHandler.handleError(error, `Unable to handle system config search`, next);
    });
}

module.exports = router;
