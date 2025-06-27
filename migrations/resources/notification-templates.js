const templates = [
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:connection-request-mentor',
    locale: 'en',
    value: 'wants to be your mentor!',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'push-notification-templates:connection-request-mentor',
    locale: 'en',
    value: '{{createdBy.name}} {{createdBy.surname}} wants to be your mentor!',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:connection-request-mentee',
    locale: 'en',
    value: 'wants to be your mentee',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'push-notification-templates:connection-request-mentee',
    locale: 'en',
    value: '{{createdBy.name}} {{createdBy.surname}} wants to be your mentee!',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:connection-request-mentor-sent',
    locale: 'en',
    value: 'Mentorship requested',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:connection-request-mentee-sent',
    locale: 'en',
    value: 'Mentorship requested',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:connection-request-mentor-accepted',
    locale: 'en',
    value: 'accepted to be your mentee!',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:connection-request-mentee-accepted',
    locale: 'en',
    value: 'accepted to be your mentor!',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'push-notification-templates:connection-request-mentor-accepted',
    locale: 'en',
    value: '{{createdBy.name}} {{createdBy.surname}} has accepted your mentor request!',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'push-notification-templates:connection-request-mentee-accepted',
    locale: 'en',
    value: '{{createdBy.name}} {{createdBy.surname}} has accepted your mentee request!',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:connection-request-mentor-rejected',
    locale: 'en',
    value: 'has rejected your mentor request',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:connection-request-mentee-rejected',
    locale: 'en',
    value: 'has rejected your mentee request',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:connection-mentor-accepted-confirmation',
    locale: 'en',
    value: 'You have accepted a mentor request from {{createdBy.name}} {{createdBy.surname}}',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:connection-mentee-accepted-confirmation',
    locale: 'en',
    value: 'You have accepted a mentee request from {{createdBy.name}} {{createdBy.surname}}',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:connection-mentor-rejected-confirmation',
    locale: 'en',
    value: 'You have rejected a mentor request from {{createdBy.name}} {{createdBy.surname}}',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:connection-mentee-rejected-confirmation',
    locale: 'en',
    value: 'You have rejected a mentee request from {{createdBy.name}} {{createdBy.surname}}',
  },
  // Pitch deck

  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:pitch-deck-request',
    locale: 'en',
    value: 'has requested your pitch deck!',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'push-notification-templates:pitch-deck-request',
    locale: 'en',
    value: '{{createdBy.name}} {{createdBy.surname}} has requested your pitch deck!',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:pitch-deck-request-sent',
    locale: 'en',
    value: 'You have requested a pitch deck from {{createdBy.name}} {{createdBy.surname}}',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:pitch-deck-request-accepted',
    locale: 'en',
    value: 'has accepted your pitch deck request. ',
  },
  {
    groupKey: 'push-notification-templates',
    itemKey: 'push-notification-templates:pitch-deck-request-accepted',
    locale: 'en',
    value: '{{createdBy.name}} {{createdBy.surname}} has accepted your pitch deck request.',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:pitch-deck-request-rejected',
    locale: 'en',
    value: 'has rejected your pitch deck request',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:pitch-deck-request-accepted-confirmation',
    locale: 'en',
    value:
      'You have accepted the pitch deck request from {{createdBy.name}} {{createdBy.surname}}.',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:pitch-deck-request-rejected-confirmation',
    locale: 'en',
    value:
      'You have rejected the pitch deck request from {{createdBy.name}} {{createdBy.surname}}.',
  },

  // Meeting request

  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:meeting-request',
    locale: 'en',
    value: 'has requested a meeting!',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'push-notification-templates:meeting-request',
    locale: 'en',
    value: '{{createdBy.name}} {{createdBy.surname}} has requested a meeting!',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:meeting-request-sent',
    locale: 'en',
    value: 'You have requested a meeting!',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:meeting-request-accepted',
    locale: 'en',
    value: 'has accepted your meeting request. ',
  },
  {
    groupKey: 'push-notification-templates',
    itemKey: 'push-notification-templates:meeting-request-accepted',
    locale: 'en',
    value: '{{createdBy.name}} {{createdBy.surname}} has accepted your meeting request. ',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:meeting-request-rejected',
    locale: 'en',
    value: 'has rejected your meeting request.',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:meeting-request-accepted-confirmation',
    locale: 'en',
    value:
      'You have accepted a meeting request from {{createdBy.name}} {{createdBy.surname}}, find a time on Calendly.',
  },
  {
    groupKey: 'notification-templates',
    itemKey: 'notification-templates:meeting-request-rejected-confirmation',
    locale: 'en',
    value: 'You have rejected this meeting request from {{createdBy.name}} {{createdBy.surname}}',
  },
];

module.exports = { templates };
