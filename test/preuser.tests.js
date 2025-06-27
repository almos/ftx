const chai = require('chai');
const chaiHttp = require('chai-http');
const initSpec = require('./init.spec');
const async = require('async');
const base = require('./helpers/base');
const _ = require('lodash');

chai.use(chaiHttp);

let existPreUserId = '609e9aaef1d06d1a58c5b59a';

/**
 * Authentification checks
 */
it('firebase token is required to access preuser creation endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/preuser')
    .send(createPreUserPayload)
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to access preuser updating endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/preuser/${existPreUserId}`)
    .send({ name: 'updated name' })
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to access preuser searching endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/preuser/search')
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to access preuser fetching endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/preuser/${existPreUserId}`)
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to access preuser deleting endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .delete(`/api/preuser/${existPreUserId}`)
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to send invite notification endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/preuser/invite/${existPreUserId}`)
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to send bulk invite notifications endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/preuser/invite/list`)
    .send({ preUserIds: ['609e9aaef1d06d1358c5b49c', '609e9af4f1d06d1358c5b49d'] })
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

/**
 * Permission checks
 */
it('founder cannot create new pre-user', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/preuser?notify=false')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(createPreUserPayload)
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('founder cannot update existing pre-user', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/preuser/${existPreUserId}`)
    .set({ AuthToken: initSpec.getFounder().token })
    .send({ name: 'updated name' })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('founder cannot search existing pre-users', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/preuser/search')
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('founder cannot fetch existing pre-user', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/preuser/${existPreUserId}`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('founder cannot delete existing pre-user', (done) => {
  chai
    .request(initSpec.getServer())
    .delete(`/api/preuser/${existPreUserId}`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('founder cannot send invite notification for pre-user', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/preuser/invite/${existPreUserId}`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('founder cannot send bulk invite notifications for pre-users', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/preuser/invite/list`)
    .set({ AuthToken: initSpec.getFounder().token })
    .send({ preUserIds: ['609e9aaef1d06d1358c5b49c', '609e9af4f1d06d1358c5b49d'] })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

/**
 * Functional checks
 */
let createPreUserPayload = {
  userData: {
    email: 'integration.tests.preuser.runtime@ftx.com',
    role: 'founder',
    name: 'Solly',
    surname: 'Molly',
  },
};

let updatedPreUserPayload = {
  userData: {
    email: 'integration.test.preuser.runtime@ftx.com',
    role: 'investor',
    name: 'Polly',
    surname: 'Dolly',
  },
  inviteCode: 'mcu5laea',
  inviteCodeSent: true,
};

it('admin handles pre-user creating/updating/fetching/deleting', (done) => {
  async.waterfall(
    [
      // 1st step: admin create new pre-user
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put(`/api/preuser?notify=false`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .send(createPreUserPayload)
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.nested
              .property('userData.email')
              .eql(createPreUserPayload.userData.email);
            payload.should.have.nested
              .property('userData.role')
              .eql(createPreUserPayload.userData.role);
            payload.should.have.nested
              .property('userData.name')
              .eql(createPreUserPayload.userData.name);
            payload.should.have.nested
              .property('userData.surname')
              .eql(createPreUserPayload.userData.surname);
            payload.should.have.property('inviteCode').that.is.a('string');
            payload.should.have.property('inviteCodeSent').eql(false);

            cb(null, res.body.payload.id);
          }),
      // 2nd step: admin update existing pre-user
      (preUserId, cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/preuser/${preUserId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .send(updatedPreUserPayload)
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;

            cb(null, res.body.payload.id);
          }),
      // 3rd step: admin fetches updated pre-user
      (preUserId, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/preuser/${preUserId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.nested
              .property('userData.email')
              .eql(updatedPreUserPayload.userData.email);
            payload.should.have.nested
              .property('userData.role')
              .eql(updatedPreUserPayload.userData.role);
            payload.should.have.nested
              .property('userData.name')
              .eql(updatedPreUserPayload.userData.name);
            payload.should.have.nested
              .property('userData.surname')
              .eql(updatedPreUserPayload.userData.surname);
            payload.should.have.property('inviteCode').eql(updatedPreUserPayload.inviteCode);
            payload.should.have
              .property('inviteCodeSent')
              .eql(updatedPreUserPayload.inviteCodeSent);

            cb(null, res.body.payload.id);
          }),
      // 4th step: admin deletes existing pre-user
      (preUserId, cb) =>
        chai
          .request(initSpec.getServer())
          .delete(`/api/preuser/${preUserId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb();
          }),
    ],
    done,
  );
});

it('user makes registration by invite code', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/preuser/register?code=zin-fin')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('preUserId').eql('809e9aaef1d06d1a58c5b59c');
      payload.should.have.property('firstName').eql('Siri');
      done();
    });
});

it('admin imports pre-users from CSV file', (done) => {
  async.waterfall(
    [
      // first step: import pre-users
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/preuser/bulk-import`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .attach('file', './test/test-preusers.csv', 'test-preusers.csv')
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('success').eql(2);
            payload.should.have.property('failed').eql(0);
            payload.should.have.property('errors').eql([]);
            cb(null, res.body.payload);
          }),
      // second step: checking if CSV file has been parsed correctly
      (user, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/preuser/search?q=murray`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            for (const obj of payload) {
              obj.should.have.property('userData').that.is.an('object');
              obj.should.have.property('inviteCodeSent').eql(false);

              obj.userData.should.have.property('languages').eql(['en', 'fr']);
              obj.userData.should.have.property('name').eql('bill');
              obj.userData.should.have.property('surname').eql('murray');
              obj.userData.should.have.property('email').eql('test.murray@gmail.com');

              obj.userData.should.have.property('education').that.is.an('array');
              for (const e of obj.userData.education) {
                e.should.have.property('institution').to.contain.oneOf(['ONPU', 'VNAU']);
                e.should.have
                  .property('startDate')
                  .to.contain.oneOf(['2012-09-29T21:00:00.000Z', '2018-12-30T22:00:00.000Z']);
                e.should.have
                  .property('endDate')
                  .to.contain.oneOf(['2018-05-29T21:00:00.000Z', '2020-12-11T22:00:00.000Z']);
              }
            }
            cb(null, res.body.payload);
          }),
      // third step: update existing pre-users from csv
      (user, cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/preuser/bulk-import`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .attach('file', './test/test-preusers-changed.csv', 'test-preusers-changed.csv')
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('success').eql(1);
            payload.should.have.property('failed').eql(0);
            payload.should.have.property('errors').eql([]);
            cb(null, res.body.payload);
          }),
      // fourth step: checking if CSV file has been updated correctly
      (user, cb) => {
        chai
          .request(initSpec.getServer())
          .get(`/api/preuser/search?q=murran`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            for (const obj of payload) {
              obj.should.have.property('userData').that.is.an('object');
              obj.should.have.property('inviteCodeSent').eql(false);

              obj.userData.should.have.property('languages').eql(['fr', 'fr']);
              obj.userData.should.have.property('name').eql('billy');
              obj.userData.should.have.property('surname').eql('murran');
              obj.userData.should.have.property('email').eql('test.murray@gmail.com');

              obj.userData.should.have.property('education').that.is.an('array');
              for (const e of obj.userData.education) {
                e.should.have.property('institution').to.contain.oneOf(['KPI', 'VNAU']);
                e.should.have
                  .property('startDate')
                  .to.contain.oneOf(['2012-09-29T21:00:00.000Z', '2018-12-30T22:00:00.000Z']);
                e.should.have
                  .property('endDate')
                  .to.contain.oneOf(['2018-05-29T21:00:00.000Z', '2020-12-11T22:00:00.000Z']);
              }
            }
            cb();
          });
      },
    ],
    done,
  );
});

/**
 * Search tests
 */

it('admin searches pre-users with no filter and with default paging', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/preuser/search')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.should.have.property('paging');
      res.body.payload.should.have.lengthOf(3);

      let paging = res.body.paging;
      paging.should.have.property('totalObjects').eql(3);
      paging.should.have.property('currentPage').eql(1);
      paging.should.have.property('totalPages').eql(1);
      paging.should.have.property('hasNextPage').eql(false);
      paging.should.have.property('pageSize').eql(10);
      done();
    });
});

it('admin searches groups with page size 1', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/preuser/search?pageSize=1')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.should.have.property('paging');
      res.body.payload.should.have.lengthOf(1);

      let paging = res.body.paging;
      paging.should.have.property('totalObjects').eql(3);
      paging.should.have.property('currentPage').eql(1);
      paging.should.have.property('totalPages').eql(3);
      paging.should.have.property('hasNextPage').eql(true);
      paging.should.have.property('pageSize').eql(1);
      done();
    });
});

it('admin searches pre-users by query string', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/preuser/search?q=app')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      payload.should.have.lengthOf(2);

      for (const e of payload) {
        e.should.have.nested.property('userData.surname').to.contain.oneOf(['Douglas', 'App']);
        e.should.have.nested
          .property('userData.email')
          .to.contain.oneOf(['creativity.app@gmail.com', 'company@gmail.com']);
      }

      done();
    });
});

it('admin searches pre-user by name', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/preuser/search?name=siri')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].userData.name', 'Siri');
      done();
    });
});

it('admin searches pre-user by surname', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/preuser/search?surname=longusta`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].userData.surname', 'Longusta');
      done();
    });
});

it('admin searches pre-users by role', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/preuser/search?role=founder')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(2);

      for (const e of payload) {
        e.should.have.nested.property('userData.role').eql('founder');
      }

      done();
    });
});

it('admin searches pre-users with inviteCodeSent flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/preuser/search?inviteCodeSent=true')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].inviteCodeSent', true);
      done();
    });
});
