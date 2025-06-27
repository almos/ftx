const eventBus = require('js-event-bus')();

/**
 * Event names that could be sent over event buses
 */
const events = {
  USER_REGISTER: 'user:register',
  USER_REQUEST: 'user:request',
  ERROR_AUTH: 'error:auth',
  ERROR_API: 'error:api',
  BUSINESS_IDEA_CREATE: 'bi:create',
  PITCH_CREATE: 'pitch:create',
  PITCH_VIDEO_UPLOAD: 'pitch:videoupload',
  PITCH_SEARCH: 'pitch:search',
  PITCH_APPROVE: 'pitch:approve',
  METRIC_EVENT: 'metric:event',
  BUSINESS_IDEA_SEARCH: 'business-idea:search',
};

module.exports = {
  events: events,
  instance: eventBus,
};
