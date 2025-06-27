const userService = require('../../services/user');
const redisService = require('../../services/redis');
const firebaseService = require('../../services/firebase');
const groupService = require('../../services/group');
const eventbus = require('../../services/eventbus');
const events = eventbus.events;
const moment = require('moment');
const rbac = require('./authz').rbac;
const logger = require('../../services/logger').instance;
const _ = require('lodash');

/**
 * Sets user metadata to req.locals retrieved from Firebase
 * @param req http request object
 */
function setUserMeta(req, decodedToken) {
  req.locals = new Object({ user_meta: {} });
  req.locals.user_meta = {
    email: decodedToken.email,
    uid: decodedToken.uid,
    domain: decodedToken.aud,
  };
}

/**
 * Sets user object to req.locals retrieved from database
 * @param req http request object
 */
async function setUserObject(req, result) {
  req.locals.user_object = result;
  req.can = rbac.can(req.locals.user_object.role);
  req.locals.user_meta.orgTag = result.organization ? result.organization.tenantAlias : null;

  await attachTenant(result);
  await attachGroups(result);
}

async function attachTenant(user) {
  user.getGlobalTenant = function () {
    return 'global';
  };

  let userRole = user.role,
    userOrg = user.organization;

  user.getActiveTenant = function () {
    // TODO: remove in future, workaround
    if (userRole == 'admin' && !userOrg) {
      return 'root';
    }

    return userOrg == null ? user.getGlobalTenant() : userOrg.tenantAlias;
  };

  // TODO: remove in future, workaround
  if (user.organization && user.organization.tenantAlias) {
    user[`${user.organization.tenantAlias}Member`] = true;
  }
}

async function attachGroups(user) {
  let globalGroups = await groupService.findGlobal(),
    defaultGroups = [];

  user.globalGroups = [];

  let ftGlobalGroup = _.find(globalGroups, (obj) => obj.type === 'ft-global'),
    orgGlobal = _.find(globalGroups, (obj) => obj.type === 'org-global');

  // groups user is allowed to post to
  let userOrgIsHidden = user.organization != undefined && user.organization.hidden === true;

  if (user.organization && userOrgIsHidden) {
    user.globalGroups.push(orgGlobal);

    if (user.groups) {
      let organizationGroups = user.groups.filter((g) => g.organization == user.organization.id);
      if (organizationGroups.length) defaultGroups = defaultGroups.concat(organizationGroups);
      else defaultGroups.push(orgGlobal);
    } else {
      defaultGroups.push(orgGlobal);
    }
  } else if (user.organization && !userOrgIsHidden) {
    user.globalGroups.push(orgGlobal);
    user.globalGroups.push(ftGlobalGroup);
    defaultGroups.push(orgGlobal);
  } else {
    user.globalGroups.push(ftGlobalGroup);
    defaultGroups.push(ftGlobalGroup);
  }

  // default content groups
  user.getDefaultGroups = function () {
    return _.map(defaultGroups, (v) => v.id);
  };
}

/**
 * Firebase authentication routine
 * To be used with protected endpoints
 */
function firebase(req, res, next) {
  let fbRawToken = req.headers.authtoken;

  if (fbRawToken) {
    redisService
      .getCachedToken(fbRawToken)
      .then((cachedToken) => {
        if (cachedToken) return cachedToken;

        return firebaseService.verifyToken(fbRawToken);
      })
      .then((fbDecodedToken) => {
        let source = fbDecodedToken.__cached ? 'redis' : 'firebase';
        logger.info(
          `Token for ${fbDecodedToken.email} resolved from ${source}. Expires in ${
            fbDecodedToken.exp - moment().unix()
          } sec`,
        );

        setUserMeta(req, fbDecodedToken);
        return fbDecodedToken;
      })
      .then((fbDecodedToken) => redisService.cacheAuthToken(fbRawToken, fbDecodedToken))
      .then(() => userService.findByEmail(req.locals.user_meta.email))
      .then((result) => setUserObject(req, result))
      .then(() => {
        let orgTag = eventbus.instance.emit(events.USER_REQUEST, null, {
          org: req.locals.user_meta.orgTag,
          uri: req.baseUrl,
        });
      })
      .then(() => next())
      .catch((error) => {
        logger.warn(`Auth failed. Error: ${error.message}`);

        // sending a event bus message on the authentication error
        eventbus.instance.emit(events.ERROR_AUTH, null);

        res.status(401).json({ errors: ['Unauthorized'] });
      });
  } else {
    logger.warn('Auth failed, due to no AuthToken header found');

    // sending a event bus message on the authentication error
    eventbus.instance.emit(events.ERROR_AUTH, null);

    res.status(401).json({ errors: ['Unauthorized'] });
  }
}

/**
 * Authentication routine to be used with unprotected endpoints
 * that don't require access control
 */
function none(req, res, next) {
  next();
}

module.exports = {
  firebase: firebase,
  none: none,
};
