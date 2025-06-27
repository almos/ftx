let perm = require('../../config/security').permissions;
let AccessControl = require('accesscontrol');
let rbac = new AccessControl();
let roles = require('../../config/security').userRoles;
let objects = require('../../config/security').objects;
const errors = require('../../services/error');
const baseHandler = require('../api/base');

/**
 * Defining permissions for admin role
 */
rbac
  .grant([roles.ADMIN])
  // profiles
  .createAny(objects.PROFILE, ['*'])
  .updateAny(objects.PROFILE, ['*'])
  .deleteAny(objects.PROFILE, ['*'])
  .readAny(objects.PROFILE, ['*'])

  // preuser
  .createAny(objects.PREUSER, ['*'])
  .updateAny(objects.PREUSER, ['*'])
  .deleteAny(objects.PREUSER, ['*'])
  .readAny(objects.PREUSER, ['*'])

  // likes
  .createAny(objects.LIKE, ['*'])
  .deleteAny(objects.LIKE, ['*'])

  // videos
  .createAny(objects.VIDEO, ['*'])
  .updateAny(objects.VIDEO, ['*'])
  .deleteAny(objects.VIDEO, ['*'])
  .readAny(objects.VIDEO, ['*'])

  // business ideas
  .createAny(objects.BUSINESS_IDEA, ['*'])
  .updateAny(objects.BUSINESS_IDEA, ['*'])
  .deleteAny(objects.BUSINESS_IDEA, ['*'])
  .readAny(objects.BUSINESS_IDEA, ['*'])

  // pitches
  .createAny(objects.PITCH, ['*'])
  .updateAny(objects.PITCH, ['*'])
  .deleteAny(objects.PITCH, ['*'])
  .readAny(objects.PITCH, ['*'])

  // pitch reviews
  .createAny(objects.PITCH_REVIEW, ['*'])
  .updateAny(objects.PITCH_REVIEW, ['*'])
  .deleteAny(objects.PITCH_REVIEW, ['*'])
  .readAny(objects.PITCH_REVIEW, ['*'])

  // authors
  .createAny(objects.AUTHOR, ['*'])
  .updateAny(objects.AUTHOR, ['*'])
  .deleteAny(objects.AUTHOR, ['*'])
  .readAny(objects.AUTHOR, ['*'])

  // groups
  .createAny(objects.GROUP, ['*'])
  .updateAny(objects.GROUP, ['*'])
  .deleteAny(objects.GROUP, ['*'])
  .readAny(objects.GROUP, ['*'])

  // playlists
  .createAny(objects.PLAYLIST, ['*'])
  .updateAny(objects.PLAYLIST, ['*'])
  .deleteAny(objects.PLAYLIST, ['*'])
  .readAny(objects.PLAYLIST, ['*'])

  // user-connection
  .createAny(objects.USER_CONNECTION, ['*'])
  .updateAny(objects.USER_CONNECTION, ['*'])
  .deleteAny(objects.USER_CONNECTION, ['*'])
  .readAny(objects.USER_CONNECTION, ['*'])

  // bookmarks
  .createOwn(objects.BOOKMARK, ['*'])
  .updateOwn(objects.BOOKMARK, ['*'])
  .deleteOwn(objects.BOOKMARK, ['*'])
  .readOwn(objects.BOOKMARK, ['*'])

  // system configs
  .createAny(objects.SYSTEM_CONFIG, ['*'])
  .updateAny(objects.SYSTEM_CONFIG, ['*'])
  .deleteAny(objects.SYSTEM_CONFIG, ['*'])
  .readAny(objects.SYSTEM_CONFIG, ['*'])

  // notifications
  .createAny(objects.NOTIFICATION, ['*'])
  .updateAny(objects.NOTIFICATION, ['*'])
  .deleteAny(objects.NOTIFICATION, ['*'])
  .readAny(objects.NOTIFICATION, ['*'])

  // user feedback
  .createAny(objects.USER_FEEDBACK, ['*'])
  .updateAny(objects.USER_FEEDBACK, ['*'])
  .deleteAny(objects.USER_FEEDBACK, ['*'])
  .readAny(objects.USER_FEEDBACK, ['*'])

  //CommunityFeedPost
  .createAny(objects.COMMUNITY_FEED, ['*'])
  .updateAny(objects.COMMUNITY_FEED, ['*'])
  .deleteAny(objects.COMMUNITY_FEED, ['*'])
  .readAny(objects.COMMUNITY_FEED, ['*']);

/**
 * Defining permissions for cohort-admin role
 */
rbac.grant(roles.COHORT_ADMIN).create('user');

/**
 * Defining permissions for founder, judge and mentor roles
 */
rbac
  .grant([roles.FOUNDER, roles.JUDGE, roles.MENTOR])

  // profiles
  .readAny(objects.PROFILE)
  .updateOwn(objects.PROFILE)

  // likes
  .createOwn(objects.LIKE, ['*'])
  .deleteOwn(objects.LIKE, ['*'])

  // videos
  .readAny(objects.VIDEO, ['*'])

  // business ideas
  .createAny(objects.BUSINESS_IDEA, ['*'])
  .updateOwn(objects.BUSINESS_IDEA, ['*'])
  .deleteOwn(objects.BUSINESS_IDEA, ['*'])
  .readAny(objects.BUSINESS_IDEA, ['*'])

  // pitches
  .createAny(objects.PITCH, ['*'])
  .updateOwn(objects.PITCH, ['*'])
  .deleteOwn(objects.PITCH, ['*'])
  .readAny(objects.PITCH, ['*'])

  // pitch reviews
  .createAny(objects.PITCH_REVIEW, ['*'])
  .readAny(objects.PITCH_REVIEW, ['*'])

  // authors
  .readAny(objects.AUTHOR, ['*'])

  // playlists
  .readAny(objects.PLAYLIST, ['*'])

  // user-connection
  .createOwn(objects.USER_CONNECTION, ['*'])
  .updateOwn(objects.USER_CONNECTION, ['*'])
  .deleteOwn(objects.USER_CONNECTION, ['*'])
  .readOwn(objects.USER_CONNECTION, ['*'])

  // bookmarks
  .createOwn(objects.BOOKMARK, ['*'])
  .updateOwn(objects.BOOKMARK, ['*'])
  .deleteOwn(objects.BOOKMARK, ['*'])
  .readOwn(objects.BOOKMARK, ['*'])

  // system configs
  .readAny(objects.SYSTEM_CONFIG, ['*'])

  // notifications
  .updateOwn(objects.NOTIFICATION, ['*'])
  .readOwn(objects.NOTIFICATION, ['*'])

  // user feedback
  .createOwn(objects.USER_FEEDBACK, ['*'])
  .updateOwn(objects.USER_FEEDBACK, ['*'])
  .deleteOwn(objects.USER_FEEDBACK, ['*'])
  .readOwn(objects.USER_FEEDBACK, ['*'])

  //CommunityFeedPost
  .readAny(objects.COMMUNITY_FEED, ['*']);

/**
 * Defining permissions for investor role
 */
rbac
  .grant(roles.INVESTOR)

  // profiles
  .readAny(objects.PROFILE)
  .updateOwn(objects.PROFILE)

  // likes
  .createOwn(objects.LIKE, ['*'])
  .deleteOwn(objects.LIKE, ['*'])

  // videos
  .readAny(objects.VIDEO, ['*'])

  // business ideas
  .readAny(objects.BUSINESS_IDEA, ['*'])

  // pitches
  .readAny(objects.PITCH, ['*'])

  // pitch reviews
  .createAny(objects.PITCH_REVIEW, ['*'])
  .readAny(objects.PITCH_REVIEW, ['*'])

  // authors
  .readAny(objects.AUTHOR, ['*'])

  // playlists
  .readAny(objects.PLAYLIST, ['*'])

  // user-connection
  .createOwn(objects.USER_CONNECTION, ['*'])
  .updateOwn(objects.USER_CONNECTION, ['*'])
  .deleteOwn(objects.USER_CONNECTION, ['*'])
  .readOwn(objects.USER_CONNECTION, ['*'])

  // bookmarks
  .createOwn(objects.BOOKMARK, ['*'])
  .updateOwn(objects.BOOKMARK, ['*'])
  .deleteOwn(objects.BOOKMARK, ['*'])
  .readOwn(objects.BOOKMARK, ['*'])

  // system configs
  .readAny(objects.SYSTEM_CONFIG, ['*'])

  // notifications
  .updateOwn(objects.NOTIFICATION, ['*'])
  .readOwn(objects.NOTIFICATION, ['*'])

  // user feedback
  .createOwn(objects.USER_FEEDBACK, ['*'])
  .updateOwn(objects.USER_FEEDBACK, ['*'])
  .deleteOwn(objects.USER_FEEDBACK, ['*'])
  .readOwn(objects.USER_FEEDBACK, ['*'])

  //CommunityFeedPost
  .readAny(objects.COMMUNITY_FEED, ['*']);

function aclCheck(operation, object, req, res, next) {
  var permission = null;

  switch (operation) {
    case perm.CREATE_OWN:
      permission = req.can.createOwn(object);
      break;
    case perm.CREATE_ANY:
      permission = req.can.createAny(object);
      break;
    case perm.CREATE:
      permission = req.can.create(object);
      break;

    case perm.UPDATE_OWN:
      permission = req.can.updateOwn(object);
      break;
    case perm.UPDATE_ANY:
      permission = req.can.updateAny(object);
      break;
    case perm.UPDATE:
      permission = req.can.update(object);
      break;

    case perm.READ_OWN:
      permission = req.can.readOwn(object);
      break;
    case perm.READ_ANY:
      permission = req.can.readAny(object);
      break;
    case perm.READ:
      permission = req.can.read(object);
      break;

    case perm.DELETE_OWN:
      permission = req.can.deleteOwn(object);
      break;
    case perm.DELETE_ANY:
      permission = req.can.deleteAny(object);
      break;
    case perm.DELETE:
      permission = req.can.delete(object);
      break;
  }

  if (!permission.granted) {
    baseHandler.handleError(new errors.PermissionAccessViolation(), `Authz error`, next);
  } else {
    next();
  }
}

module.exports = {
  rbac: rbac,
  check: function (operation, object) {
    return function (req, res, next) {
      return aclCheck(operation, object, req, res, next);
    };
  },
};
