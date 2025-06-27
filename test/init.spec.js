const mongoUnit = require('mongo-unit');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongooseAdapter = require('../config/beans/mongoose');
const config = require('./config');
const should = chai.should();
const firebaseService = require('../services/firebase');
const testData = require('./test.data');
const _ = require('lodash');

chai.use(chaiHttp);

process.env.REDIS_DISABLED = true;
process.env.INFLUX_ENABLED = false;

let server, mongoose;

mongoUnit.start().then(() => {
  console.log('Fake mongo has been started: ', mongoUnit.getUrl());
  process.env.MONGO_APP_URI = mongoUnit.getUrl();

  mongooseAdapter.connect().then((mongooseObject) => {
    console.log('Mongoose connection succeeded');

    mongoose = mongooseObject;

    //loading models
    require('../models');

    global.startupCompletedCallback = function () {
      // running mocha tests
      run();
    };

    // loading express server
    server = require('../app-apisrv');
  });
});

after(() => {
  console.log('Stopping fake mongo');
  mongooseAdapter
    .disconnect()
    .then(() => server.close())
    .then(() => mongoUnit.stop());
});

function importTest(name, path) {
  describe(name, function () {
    require(path);
  });
}

module.exports = {
  getServer: function () {
    return server;
  },
  getFounder: function () {
    return config.founderTest;
  },
  getSecondFounder: function () {
    return config.founderSecondTest;
  },
  getTenantedFounder: function () {
    return config.founderThirdTest;
  },
  getAdmin: function () {
    return config.adminTest;
  },
  getInvestor: function () {
    return config.investorTest;
  },
  getMentor: function () {
    return config.mentorTest;
  },
};

/**
 * Removes data from the collections
 * which is needed to ensure that every test runs on a strict dataset
 */
async function cleanCollections() {
  for (const v of [
    'Author',
    'BusinessIdea',
    'Pitch',
    'PitchReviewQueue',
    'Playlist',
    'ReviewCategory',
    'SignupQuestion',
    'User',
    'PreUser',
    'Video',
    'VideoViewMark',
    'Group',
    'GroupMappings',
    'OrganizationMappings',
    'Organization',
    'Bookmark',
    'Notification',
    'SystemConfig',
    'UserConnection',
    'Bookmark',
  ]) {
    await mongoose.model(v).deleteMany({});
  }
}

describe('FTX API endpoints', () => {
  before((done) => {
    // obtains tokens for founder, admin and investor
    Promise.all([
      firebaseService
        .obtainFirebaseUserToken(config.founderTest.email, config.founderTest.password)
        .then((response) => {
          config.founderTest.token = response.data.idToken;
          console.log(`Obtained founder 1st firebase token ${config.founderTest.token}`);
        }),
      firebaseService
        .obtainFirebaseUserToken(config.founderSecondTest.email, config.founderSecondTest.password)
        .then((response) => {
          config.founderSecondTest.token = response.data.idToken;
          console.log(`Obtained founder 2nd firebase token ${config.founderSecondTest.token}`);
        }),
      firebaseService
        .obtainFirebaseUserToken(config.founderThirdTest.email, config.founderThirdTest.password)
        .then((response) => {
          config.founderThirdTest.token = response.data.idToken;
          console.log(`Obtained founder 3rd firebase token ${config.founderThirdTest.token}`);
        }),
      firebaseService
        .obtainFirebaseUserToken(config.adminTest.email, config.adminTest.password)
        .then((response) => {
          config.adminTest.token = response.data.idToken;
          console.log(`Obtained admin firebase token ${config.adminTest.token}`);
        }),
      firebaseService
        .obtainFirebaseUserToken(config.investorTest.email, config.investorTest.password)
        .then((response) => {
          config.investorTest.token = response.data.idToken;
          console.log(`Obtained investor firebase token ${config.investorTest.token}`);
        }),
      firebaseService
        .obtainFirebaseUserToken(config.mentorTest.email, config.mentorTest.password)
        .then((response) => {
          config.mentorTest.token = response.data.idToken;
          console.log(`Obtained mentor firebase token ${config.mentorTest.token}`);
        }),
    ]).then(() => done());
  });

  beforeEach(() => {
    mongoUnit.initDb(mongoUnit.getUrl(), testData);
  });

  importTest('Dev endpoints', './dev.tests.js');
  importTest('User endpoints', './user.tests.js');
  importTest('Author endpoints', './author.tests.js');
  importTest('Business idea endpoints', './businessidea.tests.js');
  importTest('Pitch endpoints', './pitch.tests.js');
  importTest('Playlist endpoints', './playlist.tests.js');
  importTest('Group endpoints', './group.tests.js');
  importTest('Review-categories endpoints', './reviewcategories.tests.js');
  importTest('Signup-questions endpoints', './signupquestions.tests.js');
  importTest('Video endpoints', './video.tests.js');
  importTest('Preuser endpoints', './preuser.tests.js');
  importTest('Match endpoints', './match.tests.js');
  importTest('Bookmark endpoints', './bookmark.tests.js');
  importTest('System-config endpoints', './system-config.tests.js');
  importTest('Bookmark endpoints', './bookmark.tests.js');
  importTest('User-connections endpoints', './user-connection.tests.js');
  importTest('Notification endpoints', './notification.tests.js');
  importTest('Community endpoints', './community.tests.js');

  afterEach(() => cleanCollections());
  after(() => mongoUnit.drop());
});
