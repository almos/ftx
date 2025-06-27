const _ = require('lodash');

const permissions = {
  CREATE_OWN: 'createOwn',
  CREATE_ANY: 'createAny',
  CREATE: 'create',

  READ_OWN: 'readOwn',
  READ_ANY: 'readAny',
  READ: 'read',

  UPDATE_OWN: 'updateOwn',
  UPDATE_ANY: 'updateAny',
  UPDATE: 'update',

  DELETE_OWN: 'deleteOwn',
  DELETE_ANY: 'deleteAny',
  DELETE: 'delete',
};

const objects = {
  PROFILE: 'profile',
  PREUSER: 'preuser',
  VIDEO: 'video',
  LIKE: 'like',
  BUSINESS_IDEA: 'business-idea',
  PITCH: 'pitch',
  PITCH_REVIEW: 'pitch-review',
  AUTHOR: 'author',
  PLAYLIST: 'playlist',
  GROUP: 'group',
  USER_CONNECTION: 'user-connection',
  BOOKMARK: 'bookmark',
  SYSTEM_CONFIG: 'system-config',
  NOTIFICATION: 'notification',
  USER_FEEDBACK: 'user-feedback',
  COMMUNITY_FEED: 'community-feed',
};

const scopes = {
  OWNER: 'owner',
};

const roles = {
  ADMIN: 'admin',
  COHORT_ADMIN: 'cohort-admin',
  FOUNDER: 'founder',
  INVESTOR: 'investor',
  JUDGE: 'judge',
  MENTOR: 'mentor',
};

module.exports = {
  /**
   * User roles available in the system
   */
  userRoles: roles,
  userScopes: scopes,
  userRolesList: _.values(roles),
  objects: objects,
  permissions: permissions,
};
