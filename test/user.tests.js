const chai = require('chai');
const chaiHttp = require('chai-http');
const initSpec = require('./init.spec');
const async = require('async');
const request = require('request');
const base = require('./helpers/base');
const firebaseService = require('../services/firebase');
const _ = require('lodash');
const { notificationTypes } = require('../config/notification');

chai.use(chaiHttp);
let expect = chai.expect;

const existingUserId = '5fd61c19631e2d86c5ae9ce7';

const CreateDevicePayload = {
  fcmRegistrationToken: 'thecreatedfcmtoken',
  deviceOs: 'android',
};

const UpdateDevicePayload = {
  fcmRegistrationToken: 'thefcmtoken',
  deviceOs: 'android',
};

/**
 * Permission checks
 */

it('retrieve current founder profile without a token', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/user/profile/me')
    .end((err, res) => {
      res.should.have.status(401);
      res.should.be.json;

      res.body.should.have.property('errors').eql(['Unauthorized']);
      res.body.should.not.have.property('payload');

      done();
    });
});

it('retrieve current founder profile with a valid token', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/user/profile/me')
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('role').eql('founder');
      payload.should.have.property('deleted').eql(false);
      payload.should.have.property('verified').eql(false);

      payload.should.have.property('name');
      payload.should.have.property('surname');
      payload.should.not.have.property('bio');

      done();
    });
});

it('firebase token is required to access create user meeting request endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/user/meeting/6108071336c44c6702b43ee8')
    .end((err, res) => {
      res.should.have.status(401);
      done();
    });
});

/**
 * Functional tests
 */

it('founder retrieves an investors profile', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/user/profile/5fd61c19631e2d86c5ae9ce8')
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('role').eql('investor');
      payload.should.have.property('verified').eql(false);

      payload.should.not.have.property('deleted');
      payload.should.not.have.property('marketingConsentTimestamp');
      payload.should.not.have.property('theme');
      payload.should.not.have.property('watchedVideos');
      payload.should.not.have.property('hasMarketingConsent');
      payload.should.not.have.property('paid');
      payload.should.not.have.property('firebaseId');
      payload.should.not.have.property('email');

      done();
    });
});

let utm = {
  source: 'test source',
  medium: 'test medium',
  campaign: 'test campaign',
  term: 'test term',
  content: 'test content',
};

it('update current founder profile', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/user/profile/me')
    .set({ AuthToken: initSpec.getFounder().token })
    .send({ name: 'Test name', surname: 'Test surname', bio: 'Test bio', utm: utm })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('name').eql('Test name');
      payload.should.have.property('surname').eql('Test surname');
      payload.should.have.property('bio', 'Test bio');

      payload.should.have.property('utm');
      payload.utm.should.have.property('source').eql(utm.source);
      payload.utm.should.have.property('medium').eql(utm.medium);
      payload.utm.should.have.property('campaign').eql(utm.campaign);
      payload.utm.should.have.property('term').eql(utm.term);
      payload.utm.should.have.property('content').eql(utm.content);
      done();
    });
});

it('Insert current founder profile item eduction and update', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/user/profile/me/item/education')
    .set({ AuthToken: initSpec.getFounder().token })
    .send({
      qualification: 'Test qualification',
      institution: 'Test institution',
      startDate: '2021-12-12',
      endDate: '2021-12-12',
    })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.nested.include({
        'education[0].qualification': 'Test qualification',
        'education[0].institution': 'Test institution',
        'education[0].startDate': '2021-12-12T00:00:00.000Z',
        'education[0].endDate': '2021-12-12T00:00:00.000Z',
      });
      const itemId = payload.education[0]._id;
      chai
        .request(initSpec.getServer())
        .post(`/api/user/profile/me/item/education`)
        .set({ AuthToken: initSpec.getFounder().token })
        .send({
          _id: itemId,
          qualification: 'Test qualification 2',
          institution: 'Test institution 2',
          startDate: '2021-11-11',
          endDate: '2021-11-11',
        })
        .end((err, res) => {
          let payload = res.body.payload;
          payload.should.have.nested.include({
            'education[0].qualification': 'Test qualification 2',
            'education[0].institution': 'Test institution 2',
            'education[0].startDate': '2021-11-11T00:00:00.000Z',
            'education[0].endDate': '2021-11-11T00:00:00.000Z',
          });
          done();
        });
    });
});

it('Insert current founder profile item work experience and update', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/user/profile/me/item/workexperience')
    .set({ AuthToken: initSpec.getFounder().token })
    .send({
      jobTitle: 'Test jobTitle',
      placeOfWork: 'Test placeOfWork',
      startDate: '2021-12-12',
      endDate: '2021-12-12',
    })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.nested.include({
        'workExperience[0].jobTitle': 'Test jobTitle',
        'workExperience[0].placeOfWork': 'Test placeOfWork',
        'workExperience[0].startDate': '2021-12-12T00:00:00.000Z',
        'workExperience[0].endDate': '2021-12-12T00:00:00.000Z',
      });
      const itemId = payload.workExperience[0]._id;
      chai
        .request(initSpec.getServer())
        .post(`/api/user/profile/me/item/workexperience`)
        .set({ AuthToken: initSpec.getFounder().token })
        .send({
          _id: itemId,
          jobTitle: 'Test jobTitle 2',
          placeOfWork: 'Test placeOfWork 2',
          startDate: '2021-11-11',
          endDate: '2021-11-11',
        })
        .end((err, res) => {
          let payload = res.body.payload;
          payload.should.have.nested.include({
            'workExperience[0].jobTitle': 'Test jobTitle 2',
            'workExperience[0].placeOfWork': 'Test placeOfWork 2',
            'workExperience[0].startDate': '2021-11-11T00:00:00.000Z',
            'workExperience[0].endDate': '2021-11-11T00:00:00.000Z',
          });
          done();
        });
    });
});

let createUserPayload = {
  email: 'integration.tests.founder.runtime@ftx.com',
  password: 'Qwerty!2345',
  role: 'founder',
};

function verifyCreatedUser(err, res, email, role) {
  base.checkSuccessResponse(res);

  let payload = res.body.payload;
  payload.should.have.property('verified').eql(false);
  payload.should.have.property('deleted').eql(false);
  payload.should.have.property('paid').eql(false);
  payload.should.have.property('hasMarketingConsent').eql(false);
  payload.should.have.property('watchedVideos').eql(0);
  payload.should.have.property('email').eql(email);
  payload.should.have.property('role').eql(role);
  payload.should.have.property('signupQuestions').eql([]);
  payload.should.have.property('language').eql('en');
  payload.should.have.property('createdAt');
  payload.should.not.have.property('marketingConsentTimestamp');
  payload.should.have.property('id');
  payload.should.have.property('firebaseId');
}

const preUserPayload = {
  email: 'preuser.register.bycode.test@gmail.com',
  password: '123456',
  role: 'founder',
};

it('preuser make registration by invite code', (done) => {
  async.waterfall(
    [
      // first step: creating user from preuser data by invite code
      // this creates user in firebase as well
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put('/api/user/profile/bycode/nom-kom')
          .send({ password: preUserPayload.password })
          .end((err, res) => {
            verifyCreatedUser(err, res, preUserPayload.email, preUserPayload.role);
            cb(null, res.body.payload);
          }),
      // second step: obtaining a firebase auth token for the newly created user
      (user, cb) =>
        firebaseService
          .obtainFirebaseUserToken(preUserPayload.email, preUserPayload.password)
          .then((response) => {
            cb(null, response.data.idToken);
          }),
      // third step: obtaining user details using the FB token
      (fbToken, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/user/profile/me`)
          .set({ AuthToken: fbToken })
          .end((err, res) => {
            verifyCreatedUser(err, res, preUserPayload.email, preUserPayload.role);
            cb(null, res.body.payload.firebaseId);
          }),
      // fourth step: removing firebase user
      (firebaseId, cb) =>
        chai
          .request(initSpec.getServer())
          .delete(`/api/user/profile/firebase/${firebaseId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb(null);
          }),
    ],
    done,
  );
});

const preUserWithUTMPayload = {
  email: 'integration.tests.founder-utm.runtime@ftx.com',
  password: 'Asdf!2345',
  role: 'founder',
  utm: utm,
};

it('create new founder user with utm fields', (done) => {
  async.waterfall(
    [
      // first step: creating a user through API
      // this creates user in firebase as well
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put('/api/user/profile/me')
          .send(preUserWithUTMPayload)
          .end((err, res) => {
            verifyCreatedUser(err, res, preUserWithUTMPayload.email, preUserWithUTMPayload.role);

            let payload = res.body.payload;
            payload.should.have.property('utm');
            payload.utm.should.have.property('source').eql(utm.source);
            payload.utm.should.have.property('medium').eql(utm.medium);
            payload.utm.should.have.property('campaign').eql(utm.campaign);
            payload.utm.should.have.property('term').eql(utm.term);
            payload.utm.should.have.property('content').eql(utm.content);
            cb(null, res.body.payload);
          }),
      // second step: obtaining a firebase auth token for the newly created user
      (user, cb) =>
        firebaseService
          .obtainFirebaseUserToken(preUserWithUTMPayload.email, preUserWithUTMPayload.password)
          .then((response) => {
            cb(null, response.data.idToken);
          }),
      // third step: obtaining user details using the FB token
      (fbToken, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/user/profile/me`)
          .set({ AuthToken: fbToken })
          .end((err, res) => {
            verifyCreatedUser(err, res, preUserWithUTMPayload.email, preUserWithUTMPayload.role);
            cb(null, res.body.payload.firebaseId);
          }),
      // fourth step: removing firebase user
      (firebaseId, cb) =>
        chai
          .request(initSpec.getServer())
          .delete(`/api/user/profile/firebase/${firebaseId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb(null);
          }),
    ],
    done,
  );
});

it('create new founder user', (done) => {
  async.waterfall(
    [
      // first step: creating a user through API
      // this creates user in firebase as well
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put('/api/user/profile/me')
          .send(createUserPayload)
          .end((err, res) => {
            verifyCreatedUser(err, res, createUserPayload.email, createUserPayload.role);
            cb(null, res.body.payload);
          }),
      // second step: obtaining a firebase auth token for the newly created user
      (user, cb) =>
        firebaseService
          .obtainFirebaseUserToken(createUserPayload.email, createUserPayload.password)
          .then((response) => {
            cb(null, response.data.idToken);
          }),
      // third step: obtaining user details using the FB token
      (fbToken, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/user/profile/me`)
          .set({ AuthToken: fbToken })
          .end((err, res) => {
            verifyCreatedUser(err, res, createUserPayload.email, createUserPayload.role);
            cb(null, res.body.payload.firebaseId);
          }),
      // fourth step: removing firebase user
      (firebaseId, cb) =>
        chai
          .request(initSpec.getServer())
          .delete(`/api/user/profile/firebase/${firebaseId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb(null);
          }),
    ],
    done,
  );
});

let createUserPayloadOrgBound = {
  email: 'integration.tests.founder.runtime.org@ftx.com',
  password: 'Qwerty!2345',
  role: 'founder',
};

it('create new founder user bound to organization and group', (done) => {
  async.waterfall(
    [
      // first step: creating a user through API
      // this creates user in firebase as well
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put('/api/user/profile/me')
          .send(createUserPayloadOrgBound)
          .end((err, res) => {
            verifyCreatedUser(err, res, createUserPayloadOrgBound.email, createUserPayload.role);
            cb(null, res.body.payload);
          }),
      // second step: obtaining a firebase auth token for the newly created user
      (user, cb) =>
        firebaseService
          .obtainFirebaseUserToken(
            createUserPayloadOrgBound.email,
            createUserPayloadOrgBound.password,
          )
          .then((response) => {
            cb(null, response.data.idToken);
          }),
      // third step: obtaining user details using the FB token
      (fbToken, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/user/profile/me`)
          .set({ AuthToken: fbToken })
          .end((err, res) => {
            verifyCreatedUser(err, res, createUserPayloadOrgBound.email, createUserPayload.role);

            let payload = res.body.payload;
            payload.should.have.property('organization');
            payload.should.have.property('groups');
            payload.should.have.property('globalGroups');
            payload.organization.should.have.property('id').eql('60207218df5c94115e857031');
            payload.groups.should.have.lengthOf(1);
            payload.globalGroups.should.have.lengthOf(1);
            payload.should.have.property(`${payload.organization.tenantAlias}Member`).eql(true);

            let groupsExtraction = _.map(payload.groups, function (v) {
              return { id: v.id, type: v.type, title: v.title };
            });

            expect(groupsExtraction).to.have.deep.members([
              { id: '602d61a214c6fd937c1ac9a5', type: 'generic', title: 'Test group' },
            ]);

            cb(null, res.body.payload.firebaseId);
          }),
      // fourth step: removing firebase user
      (firebaseId, cb) =>
        chai
          .request(initSpec.getServer())
          .delete(`/api/user/profile/firebase/${firebaseId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb(null);
          }),
    ],
    done,
  );
});

it('founder uploads and removes his avatar', (done) => {
  async.waterfall(
    [
      // first step: uploading an avatar
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/user/avatar/me`)
          .set({ AuthToken: initSpec.getFounder().token })
          .attach('image', './test/test-avatar.png', 'test-avatar.png')
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('avatarUrl');
            cb(null, res.body.payload);
          }),
      // second step: checking if avatar is uploaded to google storage
      (user, cb) => {
        request(user.avatarUrl, {}, function (err, res) {
          res.should.have.status(200);
          cb(null, user);
        });
      },
      // third step: removing the avatar
      (user, cb) => {
        chai
          .request(initSpec.getServer())
          .delete(`/api/user/avatar/me`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('avatarUrl').eql(null);
            cb();
          });
      },
    ],
    done,
  );
});

it('user updates their devices list', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/user/device`)
    .set({ AuthToken: initSpec.getFounder().token })
    .send(CreateDevicePayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('id').eql(initSpec.getFounder().id);
      payload.devices.should.have.lengthOf(1);
      payload.devices[0].should.have
        .property('fcmRegistrationToken')
        .eql(CreateDevicePayload.fcmRegistrationToken);
      payload.devices[0].should.have.property('deviceOs').eql(CreateDevicePayload.deviceOs);
      payload.devices[0].should.have.property('timestamp');
      done();
    });
});

it('Another user on same device updates their devices list', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/user/device`)
    .set({ AuthToken: initSpec.getInvestor().token })
    .send(UpdateDevicePayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('id').eql(initSpec.getInvestor().id);
      payload.devices.should.have.lengthOf(1);
      payload.devices[0].should.have
        .property('fcmRegistrationToken')
        .eql(UpdateDevicePayload.fcmRegistrationToken);
      payload.devices[0].should.have.property('deviceOs').eql(UpdateDevicePayload.deviceOs);
      payload.devices[0].should.have.property('timestamp');
      done();
    });
});

it('user updates their devices item in list', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/user/device`)
    .set({ AuthToken: initSpec.getSecondFounder().token })
    .send(UpdateDevicePayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('id').eql(initSpec.getSecondFounder().id);
      payload.devices.should.have.lengthOf(1);
      payload.devices[0].should.have
        .property('fcmRegistrationToken')
        .eql(UpdateDevicePayload.fcmRegistrationToken);
      payload.devices[0].should.have.property('deviceOs').eql('android');
      payload.devices[0].should.have.property('timestamp').not.eql('2021-02-22T10:35:23.339Z');
      done();
    });
});

/**
 * Search tests - Admin only endpoint
 */

it('admin searches users with no filter and with default paging', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/user/search')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.should.have.property('paging');
      res.body.payload.should.have.lengthOf(10);

      let paging = res.body.paging;
      paging.should.have.property('totalObjects').eql(10);
      paging.should.have.property('currentPage').eql(1);
      paging.should.have.property('totalPages').eql(1);
      paging.should.have.property('hasNextPage').eql(false);
      paging.should.have.property('pageSize').eql(10);
      done();
    });
});

it('admin searches users with page size 2', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/user/search?pageSize=2')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.should.have.property('paging');
      res.body.payload.should.have.lengthOf(2);

      let paging = res.body.paging;
      paging.should.have.property('totalObjects').eql(10);
      paging.should.have.property('currentPage').eql(1);
      paging.should.have.property('totalPages').eql(5);
      paging.should.have.property('hasNextPage').eql(true);
      paging.should.have.property('pageSize').eql(2);
      done();
    });
});

it('admin searches users by name', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/user/search?name=alex')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].name', 'Alex');

      let paging = res.body.paging;
      paging.should.have.property('hasNextPage').eql(false);
      done();
    });
});

it('admin searches users by surname', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/user/search?surname=kent')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].surname', 'Kent');

      let paging = res.body.paging;
      paging.should.have.property('hasNextPage').eql(false);
      done();
    });
});

it('admin searches users by emil with page size 5', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/user/search?email=tests.founder&pageSize=5')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(5);
      payload.forEach((object) => {
        expect(object.email).to.include('founder');
      });

      let paging = res.body.paging;
      paging.should.have.property('totalObjects').eql(5);
      paging.should.have.property('currentPage').eql(1);
      paging.should.have.property('totalPages').eql(1);
      paging.should.have.property('hasNextPage').eql(false);
      paging.should.have.property('pageSize').eql(5);
      done();
    });
});

it('admin searches user by ID', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/user/search?id=${existingUserId}`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].id').eql(existingUserId);
      done();
    });
});

it('admin searches users by role', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/user/search?role=founder')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(5);
      payload.forEach((object) => {
        object.should.have.property('role').eql('founder');
      });

      let paging = res.body.paging;
      paging.should.have.property('hasNextPage').eql(false);
      done();
    });
});

it('admin searches users by name and surname with role', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/user/search?name=clark&surname=kent&role=founder')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].name', 'Clark');
      payload.should.have.deep.nested.property('[0].surname', 'Kent');
      payload.should.have.deep.nested.property('[0].role', 'founder');
      done();
    });
});

describe('admin searches users by query string', () => {
  const querySearchData = [
    {
      searchBy: 'email',
      queryString: 'ftx',
      expectingString: 'ftx',
      expectingLength: 9,
    },
    {
      searchBy: 'name',
      queryString: 'clark',
      expectingString: 'Clark',
      expectingLength: 1,
    },
    {
      searchBy: 'surname',
      queryString: 'kent',
      expectingString: 'Kent',
      expectingLength: 1,
    },
  ];

  querySearchData.forEach(({ searchBy, queryString, expectingString, expectingLength }) => {
    it(`admin searches users with query string of '${searchBy}'`, (done) => {
      chai
        .request(initSpec.getServer())
        .get(`/api/user/search?q=${queryString}`)
        .set({ AuthToken: initSpec.getAdmin().token })
        .end((err, res) => {
          base.checkSuccessResponse(res);

          let payload = res.body.payload;
          payload.should.have.lengthOf(expectingLength);
          payload.forEach((object) => {
            expect(object[searchBy]).to.include(expectingString);
          });

          let paging = res.body.paging;
          paging.should.have.property('hasNextPage').eql(false);
          done();
        });
    });
  });
});

it('admin searches users by query string in french', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/user/search?q=fonder')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].email', 'gdepardieu@fonderdestribus.com');

      done();
    });
});

it('admin searches users by name and by surname in french', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/user/search?name=gerar&surname=depard')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].name', 'Gerard');
      payload.should.have.deep.nested.property('[0].surname', 'Depardieu');

      done();
    });
});

it('admin searches users by query string with role', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/user/search?q=test1&role=admin')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].role', 'admin');
      payload.should.have.deep.nested.property('[0].email').that.include('test');
      payload.should.have.deep.nested
        .property('[0].organization')
        .that.include('60207218df5c94115e857032');

      payload[0].groups.should.have.lengthOf(2);
      expect(payload[0].groups).to.include.members([
        '602d61a214c6fd937c1ac9a3',
        '602d61a214c6fd937c1ac9a4',
      ]);

      let paging = res.body.paging;
      paging.should.have.property('hasNextPage').eql(false);
      done();
    });
});

it('admin searches for a user by surname with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/user/search?sub=true&surname=kent`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);

      payload.should.have.deep.nested.property('[0].role', 'founder');
      payload.should.have.deep.nested.property('[0].name', 'Clark');
      payload.should.have.deep.nested.property('[0].surname', 'Kent');
      payload.should.have.deep.nested.property('[0].organization.id', '60207218df5c94115e857031');
      payload.should.have.deep.nested.property('[0].organization.title', 'Hidden organization');
      payload.should.have.deep.nested.property('[0].groups[0].title', 'Test group');

      done();
    });
});

it('admin searches users by organization name with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/user/search?sub=true&orgname=Hidden`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(4);

      for (const e of payload) {
        e.should.have.property('organization');
        e.organization.should.have
          .property('title')
          .to.contain.oneOf(['Non-hidden organization', 'Hidden organization']);
      }

      done();
    });
});

it('admin searches users by organization ID with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/user/search?sub=true&orgid=60207218df5c94115e857031`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(3);

      for (const e of payload) {
        e.should.have.property('organization');
        e.organization.should.have.property('title').to.eq('Hidden organization');
      }

      done();
    });
});

it('admin searches users by group name with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/user/search?sub=true&groupname=Test`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(5);

      for (const e of payload) {
        e.should.have.property('groups');
        e.groups.should.have.lengthOf(1);

        e.groups.should.have.deep.nested
          .property('[0].title')
          .to.contain.oneOf(['Test group not bound to an organization', 'Test group']);
      }

      done();
    });
});

it('admin searches users by group ID with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/user/search?sub=true&groupid=602d61a214c6fd937c1ac9a6`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(2);
      payload[0].should.have.property('groups');
      payload[0].groups.should.have.lengthOf(1);

      payload.should.have.deep.nested.property(
        '[0].groups[0].title',
        'Test group not bound to an organization',
      );

      done();
    });
});

it('admin searches users by languages', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/user/search?lang[]=en&lang[]=fr`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(2);

      for (const e of payload) {
        e.should.have.property('language');
        e.language.should.to.contain.oneOf(['en', 'fr']);
      }

      done();
    });
});

it('admin searches users by query string by language and with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/user/search?q=alex&lang[]=en&sub=true`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have.property('language').eql('en');
      payload[0].should.have.property('organization').that.is.an('object');

      for (const e of payload[0].groups) {
        expect(e).to.be.an('object');
      }

      done();
    });
});

it('founder searches users by query string', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/user/search?surname=first`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(2);
      payload[0].should.not.have.property('language');
      payload[0].should.not.have.property('organization');
      payload[0].should.not.have.property('email');
      payload[0].should.not.have.property('calendlyUrl');
      payload[1].should.not.have.property('calendlyUrl');

      payload[0].should.have.property('id').eql('5fd61c19631e2d86c5ae9ce7');
      payload[0].should.have.property('name').eql('founder');
      payload[0].should.have.property('surname').eql('first');
      payload[0].should.have.property('role').eql('founder');
      payload[0].should.have.property('displayJobTitle').eql('CEO of FTX');
      payload[1].should.have.property('surname').eql('first');

      done();
    });
});

it('founder searches users by query string', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/user/search?email=integration.tests.admin`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(0);
      done();
    });
});

it('Admin user can create meeting request to another ', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/user/meeting/5fd61c19631e2d86c5ae9ce7')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      done();
    });
});

it('User without admin role can not create meeting to userself ', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/user/meeting/5fd61c19631e2d86c5ae9ce7')
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkFailResponse(res, 422);
      done();
    });
});

it('User without admin role create meeting request to someone who not found in db', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/user/meeting/6108071336c44c6702b43ee8')
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkFailResponse(res, 404);
      done();
    });
});

it(`User as requester being Founder send meeting request to mentor as requestee who don't have calendyUrl. Requestee can not accept the request.`, (done) => {
  async.waterfall(
    [
      (cb) => {
        chai
          .request(initSpec.getServer())
          .put('/api/user/meeting/60f57cef4e915f5f7f3a72d9')
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb();
          });
      },
      (cb) => {
        chai
          .request(initSpec.getServer())
          .get('/api/notification')
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            let { payload } = res.body;
            cb(null, payload[0]);
          });
      },
      (meetingRequest, cb) => {
        let { id } = meetingRequest;
        chai
          .request(initSpec.getServer())
          .post(`/api/notification/${id}/accepted`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkFailResponse(res, 422);
            cb();
          });
      },
    ],
    done,
  );
});

it(`User as requester being Founder send meeting request to mentor as requestee who have calendyUrl. Requestee can accept the request.`, (done) => {
  async.waterfall(
    [
      (cb) => {
        chai
          .request(initSpec.getServer())
          .put('/api/user/meeting/5fd61c19631e2d86c5ae9ce8')
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb();
          });
      },
      (cb) => {
        chai
          .request(initSpec.getServer())
          .get('/api/notification')
          .set({ AuthToken: initSpec.getInvestor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            let { payload } = res.body;
            cb(null, payload[0]);
          });
      },
      (meetingRequest, cb) => {
        let { id } = meetingRequest;
        chai
          .request(initSpec.getServer())
          .post(`/api/notification/${id}/accepted`)
          .set({ AuthToken: initSpec.getInvestor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let { payload } = res.body;
            payload.userId.should.to.equal(initSpec.getInvestor().id);
            payload.type.should.to.equal(notificationTypes.MEETING_REQUEST_ACCEPTED_CONFIRMATION);

            cb();
          });
      },
    ],
    done,
  );
});

it(`User as requester being Founder send meeting request to mentor as requestee who have calendyUrl. Requestee can rejected the request.`, (done) => {
  async.waterfall(
    [
      (cb) => {
        chai
          .request(initSpec.getServer())
          .put('/api/user/meeting/5fd61c19631e2d86c5ae9ce8')
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb();
          });
      },
      (cb) => {
        chai
          .request(initSpec.getServer())
          .get('/api/notification')
          .set({ AuthToken: initSpec.getInvestor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            let { payload } = res.body;
            cb(null, payload[0]);
          });
      },
      (meetingRequest, cb) => {
        let { id } = meetingRequest;
        chai
          .request(initSpec.getServer())
          .post(`/api/notification/${id}/rejected`)
          .set({ AuthToken: initSpec.getInvestor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let { payload } = res.body;
            payload.userId.should.to.equal(initSpec.getInvestor().id);
            payload.type.should.to.equal(notificationTypes.MEETING_REQUEST_REJECTED_CONFIRMATION);

            cb();
          });
      },
    ],
    done,
  );
});

it(`User as requester being Founder send meeting request to mentor as requestee who have not calendyUrl. Requestee can rejected the request.`, (done) => {
  async.waterfall(
    [
      (cb) => {
        chai
          .request(initSpec.getServer())
          .put('/api/user/meeting/60f57cef4e915f5f7f3a72d9')
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb();
          });
      },
      (cb) => {
        chai
          .request(initSpec.getServer())
          .get('/api/notification')
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            let { payload } = res.body;
            cb(null, payload[0]);
          });
      },
      (meetingRequest, cb) => {
        let { id } = meetingRequest;
        chai
          .request(initSpec.getServer())
          .post(`/api/notification/${id}/rejected`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let { payload } = res.body;
            payload.userId.should.to.equal(initSpec.getMentor().id);
            payload.type.should.to.equal(notificationTypes.MEETING_REQUEST_REJECTED_CONFIRMATION);

            cb();
          });
      },
    ],
    done,
  );
});

it(`User as requester can not create meeting request again If requestee do not accept or reject the request`, (done) => {
  async.waterfall(
    [
      (cb) => {
        chai
          .request(initSpec.getServer())
          .put('/api/user/meeting/60f57cef4e915f5f7f3a72d9')
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb();
          });
      },
      (cb) => {
        chai
          .request(initSpec.getServer())
          .put('/api/user/meeting/60f57cef4e915f5f7f3a72d9')
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkFailResponse(res, 422);
            cb();
          });
      },
    ],
    done,
  );
});

it('Check use of email. Unused ', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/user/check?email=unused%40email.com')
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let { userExists } = res.body.payload;
      chai.assert(!userExists);
      done();
    });
});

it('Check use of email. Used ', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/user/check?email=integration.tests.founder%ftx.com')
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let { userExists } = res.body.payload;
      chai.assert(userExists);
      done();
    });
});

it('admin update existing user while importing from CSV', (done) => {
  async.waterfall(
    [
      // first step: import users
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/user/bulk-import`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .attach('file', './test/test-users.csv', 'test-users.csv')
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('success').eql(1);
            payload.should.have.property('failed').eql(0);
            payload.should.have.property('errors').eql([]);
            cb(null, res.body.payload);
          }),
      // second step: checking if existed user has been successfully updated
      (user, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/user/search?q=murran`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            for (const obj of payload) {
              obj.should.have.property('languages').eql(['fr']);
              obj.should.have.property('name').eql('billy');
              obj.should.have.property('surname').eql('murran');
              obj.should.have
                .property('email')
                .eql('integration.tests.founder.second@ftx.com');

              obj.should.have.property('signupQuestions').that.is.an('array');
              obj.signupQuestions[0].should.have.property('answer').eql(['seed']);

              obj.should.have.property('education').that.is.an('array');
              obj.education[0].should.have.property('institution').eql('KPI');
            }
            cb();
          }),
    ],
    done,
  );
});
