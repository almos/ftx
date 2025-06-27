const path = require('path');
const typeUtils = require('../utils/typeutils');
const mongoUriBuilder = require('mongo-uri-builder');

function getLogLevel() {
  return process.env.LOG_LEVEL || 'info';
}

function getLogFile() {
  return process.env.LOG_FILE || 'ftx.log';
}

function getServerPort() {
  return process.env.PORT || 3000;
}

function getTargetEnv() {
  let environment = process.env.TARGET_ENVIRONMENT;
  return environment ? environment : 'staging';
}

function getApiUrl() {
  return `https://${getTargetEnv()}.ftx.com`;
}

module.exports = {
  getApiUrl: getApiUrl,
  /**
   * Defines a function to retrieve logging level.
   * Available logging levels are: off, fatal, error, warn, info, debug, trace, all
   */
  getLogLevel: getLogLevel,

  /**
   * Defines a function to retrieve log file for the application
   */
  getLogFile: getLogFile,

  /**
   * Defines a temp path to upload videos until they are transferred to cloud storage
   */
  videoTempUploadDir: '/tmp/uploads/',

  /**
   * Default page size when searching for objects
   */
  pageSize: 10,

  server: {
    /**
     * Timeout for uploading large files, ms
     */
    longTimeout: 600000,
  },

  /**
   * MongoDB related configuration
   */
  mongo: {
    getHostname: function () {
      let extHost = process.env.MONGODB_APP_HOST;
      return extHost ? extHost : 'localhost';
    },
    getApiDatabaseName: function () {
      let extApiDbName = process.env.MONGODB_APP_DB;
      return extApiDbName ? extApiDbName : 'ftx';
    },
    getJobDatabaseName: function () {
      let extJobsDbName = process.env.MONGODB_APP_JOBS;
      return extJobsDbName ? extJobsDbName : 'jobs';
    },
    getUsername: function () {
      let extDbUsername = process.env.MONGODB_APP_USER;
      return extDbUsername ? extDbUsername : undefined;
    },
    getPassword: function () {
      let extDbPassword = process.env.MONGODB_APP_PASSWORD;
      return extDbPassword ? extDbPassword : undefined;
    },
    getApiUri: function () {
      let extUri =
        //   'mongodb://production:iNIZyLfgDuqKfFU8@ftx-shard-00-00.ydoj1.mongodb.net:27017,foundertribes-shard-00-01.ydoj1.mongodb.net:27017,foundertribes-shard-00-02.ydoj1.mongodb.net:27017/FounderTribes-Production?ssl=true&replicaSet=atlas-ytlcth-shard-0&authSource=admin&retryWrites=true&w=majority';
        process.env.MONGO_APP_URI;
      return extUri
        ? extUri
        : mongoUriBuilder({
            username: this.getUsername(),
            password: this.getPassword(),
            host: this.getHostname(),
            port: 27017,
            database: this.getApiDatabaseName(),
          });
    },
    getJobUri: function () {
      return this.getApiUri();
    },
    debug: true,
  },

  /**
   * Async job scheduler configuration
   */
  scheduler: {
    /**
     * MongoDB collection to persist jobs
     */
    collection: 'jobs',
  },

  /**
   * Firebase related configuration
   */
  firebase: {
    getApiKey: function () {
      let firebaseApiKey = process.env.FIREBASE_APIKEY;
      if (!firebaseApiKey) {
        return 'AIzaSyBzwHUlRauZltbWsLeyHttqGkq2TvVWL2w';
      }
      return firebaseApiKey;
    },
    getClientTokenUrl: function () {
      return `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyPassword?key=${this.getApiKey()}`;
    },
    configFile: function () {
      return `config/firebase-production.json`;
      //return `config/firebase-${getTargetEnv()}.json`;
    },
    databaseUrl: function () {
      let firebaseDatabaseUrl = process.env.FIREBASE_DATABASEURL;
      if (!firebaseDatabaseUrl) {
        return 'https://founder-tribes.firebaseio.com';
      }
      return firebaseDatabaseUrl;
    },
  },

  /**
   * Configuration related to a node server
   */
  server: {
    /**
     * Defines a function to retrieve server port number
     */
    getPort: getServerPort,
  },

  /**
   * E-mail server configuration
   */
  email: {
    smtpService: 'gmail',
    smtpHostname: 'smtp.gmail.com',
    smtpSslPort: '465',
    smtpUsername: 'noreply@ftx.com',
    smtpPassword: '<password>',
  },

  /**
   * Google cloud storage
   */
  cloudStorage: {
    bucketName: 'ftmedia',
    serviceKey: path.join(__dirname, 'ftx-landing-page-46456b6ae222.json'),
    projectId: 'ftx-landing-page',
  },

  /**
   * InfluxDB time series database configuration
   */
  influx: {
    isEnabled: function () {
      let externalInfluxEnabled = process.env.INFLUX_ENABLED;
      return typeUtils.parseBool(externalInfluxEnabled);
    },
    getHost: function () {
      let externalInfluxHost = process.env.INFLUX_HOST;
      if (!externalInfluxHost) {
        return 'localhost';
      }
      return externalInfluxHost;
    },
    getDatabase: function () {
      let externalInfluxDatabase = process.env.INFLUX_DATABASE;
      if (!externalInfluxDatabase) {
        return 'ftx';
      }
      return externalInfluxDatabase;
    },
  },

  /**
   * Brightcove cloud configuration
   */
  brightcove: {
    oAuthClientId: 'ec219336-a934-40b4-b9ee-97c1d163c306',
    oAuthClientSecret:
      'G04r-jR-U9EcoC9s8UeUcAbJW7YwLjMaZyexYX-bgeMjIlDwKGg755HSmLiSLgQFQKZL4wf7OKPGSeJvD_s8AQ',
    accountId: '6131873349001',
    accessTokenUrl: 'https://oauth.brightcove.com/v4/access_token',
    policyKey:
      'BCpkADawqM0htTSaOThKbGXrI7LcQ6hfXK130IPZ2WQoGt7xwflQd-MbvsAjRSbr4afsMibwE0XbUZv5qASnrdkmfCAD2yMw9WyxVVomTIkdrQaA3i9r1a618URjDNRjPCIas148Nv1yUVPG',
    getCreateVideoUrl: function () {
      return `https://cms.api.brightcove.com/v1/accounts/${this.accountId}/videos/`;
    },
    getUploadUrlsUrl: function (videoId, sourceName) {
      return `https://cms.api.brightcove.com/v1/accounts/${this.accountId}/videos/${videoId}/upload-urls/${sourceName}`;
    },
    getVideoUrl: function (videoId) {
      return `https://edge.api.brightcove.com/playback/v1/accounts/${this.accountId}/videos/${videoId}`;
    },
    getDynamicIngestUrl: function (videoId) {
      return `https://ingest.api.brightcove.com/v1/accounts/${this.accountId}/videos/${videoId}/ingest-requests`;
    },
    getAllFoldersUrl: function () {
      return `https://ingest.api.brightcove.com/v1/accounts/${this.accountId}/folders`;
    },
    getAddFolderForVideoUrl: function (folderId, videoId) {
      return `https://ingest.api.brightcove.com/v1/accounts/${this.accountId}/folders/${folderId}/videos/${videoId}`;
    },
    getUpdateMetadataVideoUrl: function (videoId) {
      return `https://cms.api.brightcove.com/v1/accounts/${this.accountId}/videos/${videoId}`;
    },
  },

  /**
   * LinkedIn configuration
   */
  linkedin: {
    clientId: '78tu8wdp1fsfxq',
    clientSecret: 'a15xtIaaQ1Pr9f3l',
    redirectUri: 'http://localhost:3000/api/integration/linkedin',
    state: 'my_state_2580',
    databaseUrl: 'https://linkedin-auth-5f8fc-default-rtdb.europe-west1.firebasedatabase.app',
  },

  getRedisUri() {
    let extRedisUri = process.env.REDIS_URI;
    return extRedisUri ? extRedisUri : 'redis://127.0.0.1:6379';
  },
  isRedisEnabled: function () {
    let redisDisabled = typeUtils.parseBool(process.env.REDIS_DISABLED);
    return !redisDisabled;
  },
};
