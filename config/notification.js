const _ = require('lodash');

const templateGroupKey = 'notification-templates';
const pushTemplateGroupKey = 'push-notification-templates';

const notificationTypes = {
  // Mentor connection request flow
  CONNECTION_REQUEST_MENTOR: 'connection-request-mentor',
  CONNECTION_REQUEST_MENTOR_SENT: 'connection-request-mentor-sent',
  CONNECTION_REQUEST_MENTOR_ACCEPTED: 'connection-request-mentor-accepted',
  CONNECTION_REQUEST_MENTOR_REJECTED: 'connection-request-mentor-rejected',
  CONNECTION_MENTOR_ACCEPTED_CONFIRMATION: 'connection-mentor-accepted-confirmation',
  CONNECTION_MENTOR_REJECTED_CONFIRMATION: 'connection-mentor-rejected-confirmation',
  CONNECTION_REQUEST_MENTEE: 'connection-request-mentee',
  CONNECTION_REQUEST_MENTEE_SENT: 'connection-request-mentee-sent',
  CONNECTION_REQUEST_MENTEE_ACCEPTED: 'connection-request-mentee-accepted',
  CONNECTION_REQUEST_MENTEE_REJECTED: 'connection-request-mentee-rejected',
  CONNECTION_MENTEE_ACCEPTED_CONFIRMATION: 'connection-mentee-accepted-confirmation',
  CONNECTION_MENTEE_REJECTED_CONFIRMATION: 'connection-mentee-rejected-confirmation',

  // Pitch deck request flow
  PITCH_DECK_REQUEST: 'pitch-deck-request',
  PITCH_DECK_REQUEST_SENT: 'pitch-deck-request-sent',
  PITCH_DECK_REQUEST_ACCEPTED: 'pitch-deck-request-accepted',
  PITCH_DECK_REQUEST_REJECTED: 'pitch-deck-request-rejected',
  PITCH_DECK_REQUEST_ACCEPTED_CONFIRMATION: 'pitch-deck-request-accepted-confirmation',
  PITCH_DECK_REQUEST_REJECTED_CONFIRMATION: 'pitch-deck-request-rejected-confirmation',

  // Meeting request flow
  MEETING_REQUEST: 'meeting-request',
  MEETING_REQUEST_SENT: 'meeting-request-sent',
  MEETING_REQUEST_ACCEPTED: 'meeting-request-accepted',
  MEETING_REQUEST_REJECTED: 'meeting-request-rejected',
  MEETING_REQUEST_ACCEPTED_CONFIRMATION: 'meeting-request-accepted-confirmation',
  MEETING_REQUEST_REJECTED_CONFIRMATION: 'meeting-request-rejected-confirmation',
};

const notificationStatus = {
  UNREAD: 'unread',
  READ: 'read',
  REJECTED: 'rejected',
  ACCEPTED: 'accepted',
  ACTION_REQUIRED: 'action',
};

const actionResponses = {
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
};

const actionStatuses = {
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  REQUIRED: 'required',
};

module.exports = {
  templateGroupKey: templateGroupKey,
  pushTemplateGroupKey: pushTemplateGroupKey,
  notificationTypes: notificationTypes,
  notificationTypesList: _.values(notificationTypes),
  notificationStatus: notificationStatus,
  notificationStatusList: _.values(notificationStatus),
  actionResponses: actionResponses,
  actionResponseList: _.values(actionResponses),
  actionStatuses: actionStatuses,
  actionStatusList: _.values(actionStatuses),
};
