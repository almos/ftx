const agenda = require('./config/beans/agenda');
const emailService = require('./services/email');
const videoService = require('./services/video');
const pitchService = require('./services/pitch');
const metricService = require('./services/metric');
const brightcoveService = require('./services/brightcove');
const eventbus = require('./services/eventbus');
const Logger = require('./services/logger');
const events = eventbus.events;
const _ = require('lodash');

/**
 * Logger setup
 */
Logger.init();
const logger = Logger.instance;

/**
 * Connecting to MongoDB to manage regular API entities
 * at the same time Agenda needs a separate database connection for managing jobs
 */
/**
 * Connecting to MongoDB
 */
let databaseConnectionReady = require('./config/beans/mongoose').connect();

/**
 * Initializing event bus and influx logging listeners
 */
require('./services/influx');

/**
 * Performs job dispatch subsystem initialization
 */
async function run() {
  // Wait for agenda to connect. Should never fail since connection failures
  // should happen in the `await MongoClient.connect()` call.
  await agenda.connect();

  // assign job handlers
  map();

  // wait for scheduling subsystem to initialize
  await agenda.waitStart();

  // start job consumption
  agenda.start();

  agenda.every('*/1 * * * *', agenda.jobs.BRIGHTCOVE_WAIT_PROCESSED);
  agenda.every('*/15 * * * *', agenda.jobs.METRICS_COLLECT);

  logger.info('Ready to consume jobs');
}

/**
 * Map jobs to handlers
 */
function map() {
  // Periodically checks brightcove videos and caches them
  agenda.define(agenda.jobs.BRIGHTCOVE_WAIT_PROCESSED, async (job) => {
    pitchService.findWithUnhandledVideos().then((pitches) => {
      pitches.forEach((pitch) => {
        let brightcoveVideoId = pitch.brightcove.videoId;
        brightcoveService
          .verifyUpload(brightcoveVideoId)
          .then((brightcoveVideo) => {
            if (!brightcoveVideo) {
              logger.warn(`Brightcove metadata is not yet ready for video ${brightcoveVideoId}`);
              return;
            }

            pitchService.updatePitches(pitch.id, { video: brightcoveVideo }).then(() => {
              logger.warn(
                `Brightcove metadata is ready for video ${brightcoveVideoId}: ${JSON.stringify(
                  brightcoveVideo,
                )}`,
              );
            });
          })
          .catch((error) => {
            logger.warn(
              `Brightcove metadata retrieval failed for video ${brightcoveVideoId}. Error: ${error.message}`,
            );
          });
      });
    });

    videoService.findUnhandledVideos().then((videos) => {
      videos.forEach((video) => {
        let brightcoveVideoId = video.brightcove.videoId;
        brightcoveService.verifyUpload(brightcoveVideoId).then((brightcoveVideo) => {
          if (!brightcoveVideo) {
            logger.warn(`Brightcove metadata is not yet ready for video ${brightcoveVideoId}`);
            return;
          }
          logger.warn(
            `Brightcove metadata is ready for video ${brightcoveVideoId}: ${JSON.stringify(
              brightcoveVideo,
            )}`,
          );
          videoService.updateVideo(video.id, { video: brightcoveVideo }).then(() => {});
        });
      });
    });
  });

  /**
   * Educational video upload job
   */
  agenda.define(agenda.jobs.VIDEO_UPLOAD, (job) => {
    let dto = job.attrs.data;
    logger.info(`Got new video upload request ${JSON.stringify(dto)}`);

    brightcoveService
      .upload(dto)
      .then((result) => {
        return videoService.updateVideo(dto.id, result);
      })
      .then(() => {
        logger.info(`Video record ${dto.id} has been updated with brightcove metadata`);
      })
      .catch((error) => {
        logger.info(`Video ${dto.id} upload has failed: ${error.message}`);
      });
  });

  /**
   * Pitch video upload job
   */
  agenda.define(agenda.jobs.PITCH_VIDEO_UPLOAD, (job) => {
    let dto = job.attrs.data;
    logger.info(`Got new pitch video upload request ${JSON.stringify(dto)}`);

    brightcoveService
      .upload(dto)
      .then((result) => {
        return pitchService.updatePitches(dto.id, result);
      })
      .then(() => {
        logger.info(`Pitch record ${dto.id} has been updated with brightcove metadata`);
      })
      .catch((error) => {
        logger.info(`Pitch video ${dto.id} upload has failed: ${error.message}`);
      });
  });

  /**
   * Generic e-mail delivery job
   */
  agenda.define(agenda.jobs.EMAIL_SEND, (job) => {
    let dto = job.attrs.data;
    logger.info(`Got new email send request ${JSON.stringify(dto)}`);

    emailService.sendNoReplyEmail(dto.recipient, dto.subject, dto.html).catch((error) => {
      logger.error(`Error sending validation email to ${dto.recipient}. Message: ${error.message}`);
    });
  });

  /**
   * Gather metrics and persist them to database
   */
  agenda.define(agenda.jobs.METRICS_COLLECT, (job) => {
    let mtypes = metricService.metricTypes;

    metricService.countAllPlatformUsers().then((res) => {
      logger.info(`Metric calculated ${mtypes.ALL_PLATFORM_USERS} with value of ${res}`);
      eventbus.instance.emit(events.METRIC_EVENT, null, {
        type: mtypes.ALL_PLATFORM_USERS,
        count: res,
      });
    });

    metricService.countAllOrganizationUsers().then((res) => {
      logger.info(`Metric calculated ${mtypes.ALL_ORG_USERS} with value of ${res}`);
      eventbus.instance.emit(events.METRIC_EVENT, null, {
        type: mtypes.ALL_ORG_USERS,
        count: res,
      });
    });

    metricService.countAllNonOrganizationUsers().then((res) => {
      logger.info(`Metric calculated ${mtypes.ALL_NON_ORG_USERS} with value of ${res}`);
      eventbus.instance.emit(events.METRIC_EVENT, null, {
        type: mtypes.ALL_NON_ORG_USERS,
        count: res,
      });
    });

    metricService.groupedUserCountPerOrganization().then((res) => {
      _.forEach(res, function (orgMetric) {
        logger.info(
          `Metric calculated ${mtypes.ORG_USERS} for org ${orgMetric.org} with value of ${orgMetric.count}`,
        );
        eventbus.instance.emit(events.METRIC_EVENT, null, {
          type: mtypes.ORG_USERS,
          org: orgMetric.org,
          count: orgMetric.count,
        });
      });
    });

    metricService.countAllPlatformBusinessIdeas().then((res) => {
      logger.info(`Metric calculated ${mtypes.ALL_PLATFORM_BUSINESSIDEAS} with value of ${res}`);
      eventbus.instance.emit(events.METRIC_EVENT, null, {
        type: mtypes.ALL_PLATFORM_BUSINESSIDEAS,
        count: res,
      });
    });

    metricService.groupedBusinessIdeasCountPerOrganization().then((res) => {
      _.forEach(res, function (orgMetric) {
        logger.info(
          `Metric calculated ${mtypes.ALL_ORG_BUSINESSIDEAS} for org ${orgMetric.org} with value of ${orgMetric.count}`,
        );
        eventbus.instance.emit(events.METRIC_EVENT, null, {
          type: mtypes.ALL_ORG_BUSINESSIDEAS,
          org: orgMetric.org,
          count: orgMetric.count,
        });
      });
    });

    metricService.countAllPlatformPitches().then((res) => {
      logger.info(`Metric calculated ${mtypes.ALL_PLATFORM_PITCHES} with value of ${res}`);
      eventbus.instance.emit(events.METRIC_EVENT, null, {
        type: mtypes.ALL_PLATFORM_PITCHES,
        count: res,
      });
    });

    metricService.groupedPitchesCountPerOrganization().then((res) => {
      _.forEach(res, function (orgMetric) {
        logger.info(
          `Metric calculated ${mtypes.ALL_ORG_PITCHES} for org ${orgMetric.org} with value of ${orgMetric.count}`,
        );
        eventbus.instance.emit(events.METRIC_EVENT, null, {
          type: mtypes.ALL_ORG_PITCHES,
          org: orgMetric.org,
          count: orgMetric.count,
        });
      });
    });

    metricService.countAllPlatformPitchesWithReviews().then((res) => {
      logger.info(
        `Metric calculated ${mtypes.ALL_PLATFORM_PITCHES_WITH_REVIEWS} with value of ${res}`,
      );
      eventbus.instance.emit(events.METRIC_EVENT, null, {
        type: mtypes.ALL_PLATFORM_PITCHES_WITH_REVIEWS,
        count: res,
      });
    });

    metricService.countPercentOfPlatformUsersWithAvatar().then((res) => {
      logger.info(
        `Metric calculated ${mtypes.ALL_PLATFORM_USERS_WITH_AVATARS} with value of ${res}`,
      );
      eventbus.instance.emit(events.METRIC_EVENT, null, {
        type: mtypes.ALL_PLATFORM_USERS_WITH_AVATARS,
        count: res,
      });
    });

    metricService.countPercentOfPlatformUsersWithNameAndSurname().then((res) => {
      logger.info(
        `Metric calculated ${mtypes.ALL_PLATFORM_USERS_WITH_NAME_SURNAME} with value of ${res}`,
      );
      eventbus.instance.emit(events.METRIC_EVENT, null, {
        type: mtypes.ALL_PLATFORM_USERS_WITH_NAME_SURNAME,
        count: res,
      });
    });

    //

    metricService.countPercentOfPlatformUsersWithAtLeastOnePitch().then((res) => {
      logger.info(
        `Metric calculated ${mtypes.ALL_PLATFORM_USERS_WITH_PITCHES} with value of ${res}`,
      );
      eventbus.instance.emit(events.METRIC_EVENT, null, {
        type: mtypes.ALL_PLATFORM_USERS_WITH_PITCHES,
        count: res,
      });
    });
  });
}
Promise.all([databaseConnectionReady]).then(() =>
  run().catch((error) => {
    console.error(error);
    process.exit(-1);
  }),
);
