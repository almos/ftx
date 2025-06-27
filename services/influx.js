/**
 * This module is is responsible for persisting various system events into time-series database InfluxDB
 */

const config = require('../config');
const eventbus = require('./eventbus');
const events = eventbus.events;
const logger = require('./logger').instance;

const influx = require('influx');
const influxClient = config.influx.isEnabled()
  ? new influx.InfluxDB({
      host: config.influx.getHost(),
      database: config.influx.getDatabase(),
      schema: [
        {
          measurement: 'authEvents',
          fields: {
            org: influx.FieldType.STRING, // organization alias, i.e. tef
            count: influx.FieldType.INTEGER, // always '1' as one entry represents a single event
            result: influx.FieldType.STRING, // success or failure
            uri: influx.FieldType.STRING, // uri, i.e. /api/business-idea
          },
          tags: [],
        },
        {
          measurement: 'errors',
          fields: {
            type: influx.FieldType.STRING, // error type
            count: influx.FieldType.INTEGER, // always '1' as one entry represents a single event
            code: influx.FieldType.INTEGER, // http response code, i.e. 500
            org: influx.FieldType.STRING, // organization alias, i.e. tef (optional)
            email: influx.FieldType.STRING, // email of user that encountered the issue (optional)
            endpoint: influx.FieldType.STRING, // uri, i.e. /api/business-idea
          },
          tags: [],
        },
        {
          measurement: 'objectEvents',
          fields: {
            count: influx.FieldType.INTEGER, // always '1' as one entry represents a single event
            /**
             * Following combinations of type/operation are available:
             * - type: 'user', operation: 'register'
             * - type: 'bi', operation: 'create'
             * - type: 'pitch', operation: 'create'
             * - type: 'pitch', operation: 'approve', resolution: 'pass'
             * - type: 'pitch', operation: 'search'
             * - type: 'pitch', operation: 'videoupload' (in this case there will be also sizeMbytes)
             */
            type: influx.FieldType.STRING, // object type
            operation: influx.FieldType.STRING, // operation done on the object
            resolution: influx.FieldType.STRING, // in case event is related topitch approval process this contains the resolution outcome, either pass or fail
            org: influx.FieldType.STRING, // organization alias, i.e. tef (optional)
            sizeMbytes: influx.FieldType.FLOAT, // size in megabytes for an uploaded video
          },
          tags: [],
        },
        {
          measurement: 'metrics',
          fields: {
            count: influx.FieldType.FLOAT, // counted size / target metric size
            /**
             * Following metric types are available:
             * - allPlatformUsers: Count of all users on the platform except those created by *@ftx.com users
             * - allPlatformUsersWithAvatars: Percentage of users with a profile photo except *@ftx.com users
             * - allPlatformUsersWithNameSurname: Percentage of users with name and surname set except *@ftx.com users
             * - allPlatformUsersWithPitches: Percentage of users with at least one pitch uploaded
             * - allOrgUsers: Count of users that are part of any organization except *@ftx.com users
             * - nonOrgUsers: Count of users that are not part of any organization except *@ftx.com users
             * - orgUsers: Count of users that are part of any organization except *@ftx.com users
             * - allPlatformBusinessIdeas: Count of all business ideas on the platform except those created by *@ftx.com users
             * - allOrgBusinessIdeas: Grouped counts of business ideas per organization except those created by *@ftx.com users
             * - allPlatformPitches: Count of all pitches (with videos), pitches except those created by *@ftx.com users
             * - allOrgPitches: Grouped counts of pitches (with videos) per organization except those created by *@ftx.com users
             * - allPlatformPitchesWithReviews: Count of pitches that have reviews except those created by *@ftx.com users
             */
            type: influx.FieldType.STRING, // metric type
            org: influx.FieldType.STRING, // organization alias, i.e. tef (optional)
          },
          tags: [],
        },
      ],
    })
  : null;

function sendInfluxPoint(eventChannel, measurement, fields, tags, precision) {
  if (!config.influx.isEnabled()) return;

  return influxClient
    .writePoints([{ measurement: measurement, tags: tags, fields: fields }])
    .then(() => {
      logger.debug(`Successfully wrote ${eventChannel} measurement data to influxdb`);
    })
    .catch((err) => {
      logger.error(`Was unable to send ${eventChannel} data to influxdb: ${err.message}`);
    });
}

eventbus.instance.on(events.ERROR_AUTH, function (data) {
  let fields = { count: 1, result: 'failure' };
  if (data) {
    fields = Object.assign(fields, data);
  }
  return sendInfluxPoint(events.ERROR_AUTH, 'authEvents', fields, {}, 's');
});

/**
 * data is expected to have following structure. Example: {org: 'tef', uri: '/user/blabla'}
 */
eventbus.instance.on(events.USER_REQUEST, function (data) {
  let fields = { count: 1, result: 'success' };
  if (data) {
    fields = Object.assign(fields, data);
  }
  return sendInfluxPoint(events.USER_REQUEST, 'authEvents', fields, {}, 's');
});

/**
 * data is expected to have following structure. Example: {code: '500', org:'tef', email: 'someone@teforg.com', endpoint: '/endpoint/path'}
 */
eventbus.instance.on(events.ERROR_API, function (data) {
  let fields = { count: 1, type: 'api' };
  if (data) {
    fields = Object.assign(fields, data);
  }
  return sendInfluxPoint(events.ERROR_API, 'errors', fields, {}, 's');
});

/**
 * data is expected to have following structure. Example: {org: 'tef'}
 */
eventbus.instance.on(events.USER_REGISTER, function (data) {
  let fields = { count: 1, type: 'user', operation: 'register' };
  if (data) {
    fields = Object.assign(fields, data);
  }

  return sendInfluxPoint(events.USER_REGISTER, 'objectEvents', fields, {}, 's');
});

/**
 * data is expected to have following structure. Example: {org: 'tef'}
 */
eventbus.instance.on(events.BUSINESS_IDEA_CREATE, function (data) {
  let fields = { count: 1, type: 'bi', operation: 'create' };
  if (data) {
    fields = Object.assign(fields, data);
  }
  return sendInfluxPoint(events.BUSINESS_IDEA_CREATE, 'objectEvents', fields, {}, 's');
});

/**
 * data is expected to have following structure. Example: {org: 'tef'}
 */
eventbus.instance.on(events.PITCH_CREATE, function (data) {
  let fields = { count: 1, type: 'pitch', operation: 'create' };
  if (data) {
    fields = Object.assign(fields, data);
  }
  return sendInfluxPoint(events.PITCH_CREATE, 'objectEvents', fields, {}, 's');
});

/**
 * data is expected to have following structure.
 * Example: {org: 'tef', resolution: 'pass'} or {org: 'tef', resolution: 'fail'}
 */
eventbus.instance.on(events.PITCH_APPROVE, function (data) {
  let fields = { count: 1, type: 'pitch', operation: 'approve' };
  if (data) {
    fields = Object.assign(fields, data);
  }
  return sendInfluxPoint(events.PITCH_APPROVE, 'objectEvents', fields, {}, 's');
});

/**
 * data is expected to have following structure. Example: {org: 'tef'}
 */
eventbus.instance.on(events.PITCH_SEARCH, function (data) {
  let fields = { count: 1, type: 'pitch', operation: 'search' };
  if (data) {
    fields = Object.assign(fields, data);
  }
  return sendInfluxPoint(events.PITCH_SEARCH, 'objectEvents', fields, {}, 's');
});

/**
 * data is expected to have following structure. Example: {org: 'tef', sizeMbytes: 12.1}
 */
eventbus.instance.on(events.PITCH_VIDEO_UPLOAD, function (data) {
  let fields = { count: 1, type: 'pitch', operation: 'videoupload' };
  if (data) {
    fields = Object.assign(fields, data);
  }
  return sendInfluxPoint(events.PITCH_VIDEO_UPLOAD, 'objectEvents', fields, {}, 's');
});

/**
 * data is expected to have following structure. Examples:
 *  - {type: 'allPlatformUsers', count: 123} - count of all users on the platform
 *  - {type: 'allOrgUsers', count: 123} - count of users that are part of any organization
 *  - {org: 'tef', type: 'orgUsers', count: 123} - counts of users per organization
 *  - {type: 'nonOrgUsers', count: 123} - Count of users that are not part of any organization
 */
eventbus.instance.on(events.METRIC_EVENT, function (data) {
  let fields = {};
  if (data) {
    fields = Object.assign(fields, data);
  }
  return sendInfluxPoint(events.METRIC_EVENT, 'metrics', fields, {}, 's');
});

eventbus.instance.on(events.BUSINESS_IDEA_SEARCH, function (data) {
  let fields = { count: 1, type: 'bi', operation: 'search' };
  if (data) {
    fields = Object.assign(fields, data);
  }
  return sendInfluxPoint(events.BUSINESS_IDEA_SEARCH, 'objectEvents', fields, {}, 's');
});
