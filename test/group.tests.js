const chai = require('chai');
const chaiHttp = require('chai-http');
const initSpec = require('./init.spec');
const async = require('async');
const base = require('./helpers/base');
const _ = require('lodash');

chai.use(chaiHttp);

const groupCreateRequestPayload = {
  type: 'generic',
  global: false,
  private: false,
  limitReviewers: false,
  reviewers: ['5fd61c19631e2d86c5ae9ce6'],
  title: 'Best group',
  organization: '60207218df5c94115e857031',
};

const existingGroupId = '602d61a214c6fd937c1ac9a5';

/**
 * Authentification checks
 */

it('firebase token is required to access group creation endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/group')
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to access group getting endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/group/fakeID')
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to access group updating endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/group/fakeID')
    .send({
      title: 'My group with updated title',
    })
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to access group search endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/group/search')
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

/**
 * Endpoints forbidden for investor and founder checks
 */

it('founder cannot create a group', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/group')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(groupCreateRequestPayload)
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('investor cannot create a group', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/group')
    .set({ AuthToken: initSpec.getInvestor().token })
    .send(groupCreateRequestPayload)
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('founder cannot update existing group', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/group/${existingGroupId}`)
    .set({ AuthToken: initSpec.getFounder().token })
    .send({
      title: 'My group with updated title',
    })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('investor cannot update existing group', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/group/${existingGroupId}`)
    .set({ AuthToken: initSpec.getInvestor().token })
    .send({
      title: 'My group with updated title',
    })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('founder cannot get existing group', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/group/fakeID`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('investor cannot get existing group', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/group/fakeID`)
    .set({ AuthToken: initSpec.getInvestor().token })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('founder cannot search groups', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/group/search`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('investor cannot search groups', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/group/search`)
    .set({ AuthToken: initSpec.getInvestor().token })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

/**
 * Functional checks
 */

it('admin creates a group', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/group')
    .set({ AuthToken: initSpec.getAdmin().token })
    .send(groupCreateRequestPayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('type').eql(groupCreateRequestPayload.type);
      payload.should.have.property('global').eql(groupCreateRequestPayload.global);
      payload.should.have.property('private').eql(groupCreateRequestPayload.private);
      payload.should.have.property('limitReviewers').eql(groupCreateRequestPayload.limitReviewers);
      payload.should.have.property('reviewers').eql(groupCreateRequestPayload.reviewers);
      payload.should.have.property('title').eql(groupCreateRequestPayload.title);
      payload.should.have.property('organization').eql(groupCreateRequestPayload.organization);

      done();
    });
});

it('admin updates an existing group', (done) => {
  async.waterfall(
    [
      // first step: updating group
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/group/${existingGroupId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .send({
            title: 'My group with updated title',
            global: true,
            private: true,
            limitReviewers: true,
            reviewers: ['5fd61c19631e2d86c5ae9ce6', '5fd61c19631e2d86c5ae9ce7'],
          })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb(null, res.body.payload);
          }),
      // second step: getting the updated group
      (group, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/group/${existingGroupId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('title').eql('My group with updated title');
            payload.should.have.property('global').eql(true);
            payload.should.have.property('private').eql(true);
            payload.should.have.property('limitReviewers').eql(true);
            payload.should.have
              .property('reviewers')
              .eql(['5fd61c19631e2d86c5ae9ce6', '5fd61c19631e2d86c5ae9ce7']);
            cb();
          }),
    ],
    done,
  );
});

/**
 * Search tests
 */

it('admin searches groups with no filter and with default paging', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/group/search')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.should.have.property('paging');
      res.body.payload.should.have.lengthOf(5);

      let paging = res.body.paging;
      paging.should.have.property('totalObjects').eql(5);
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
    .get('/api/group/search?pageSize=1')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.should.have.property('paging');
      res.body.payload.should.have.lengthOf(1);

      let paging = res.body.paging;
      paging.should.have.property('totalObjects').eql(5);
      paging.should.have.property('currentPage').eql(1);
      paging.should.have.property('totalPages').eql(5);
      paging.should.have.property('hasNextPage').eql(true);
      paging.should.have.property('pageSize').eql(1);
      done();
    });
});

it('admin searches groups by title', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/group/search?q=ftx')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].title', 'FTX wide');
      done();
    });
});

it('admin searches groups by organization', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/group/search?organization=60207218df5c94115e857031')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].title', 'Test group');
      payload.should.have.deep.nested.property('[0].organization', '60207218df5c94115e857031');
      done();
    });
});

it('admin searches private groups', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/group/search?private=true`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].title', 'Private test group');
      done();
    });
});

it('admin searches private groups with sub parameter', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/group/search?sub=true&private=true')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].organization.title', 'Non-hidden organization');
      payload.should.have.deep.nested.property('[0].organization.id', '60207218df5c94115e857032');
      done();
    });
});

it('admin searches private groups by query string, with sub parameter', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/group/search?q=test&private=true&sub=true')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload.should.have.deep.nested.property('[0].title', 'Private test group');
      payload.should.have.deep.nested.property('[0].organization.title', 'Non-hidden organization');

      let paging = res.body.paging;
      paging.should.have.property('hasNextPage').eql(false);
      done();
    });
});

it('admin searches groups with sub flag and with limitReviewers flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/group/search?sub=true&limit=true')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);

      for (const e of payload) {
        e.should.have.property('limitReviewers').eql(true);
        e.should.have.property('reviewers').that.is.an('array');

        for (const v of e.reviewers) {
          v.should.have.property('email');
        }
      }

      done();
    });
});
/**
 * Search all tests - admin only
 */
it('admin searches all groups with no filter and with default paging', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/group/search/all')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.should.have.property('paging');
      res.body.payload.should.have.lengthOf(5);

      let paging = res.body.paging;
      paging.should.have.property('totalObjects').eql(5);
      paging.should.have.property('currentPage').eql(1);
      paging.should.have.property('totalPages').eql(1);
      paging.should.have.property('hasNextPage').eql(false);
      paging.should.have.property('pageSize').eql(10);
      done();
    });
});

it('admin searches all groups with page size 1', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/group/search/all?pageSize=1')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.should.have.property('paging');
      res.body.payload.should.have.lengthOf(1);

      let paging = res.body.paging;
      paging.should.have.property('totalObjects').eql(5);
      paging.should.have.property('currentPage').eql(1);
      paging.should.have.property('totalPages').eql(5);
      paging.should.have.property('hasNextPage').eql(true);
      paging.should.have.property('pageSize').eql(1);
      done();
    });
});

it('admin searches all groups by title', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/group/search/all?title=ftx')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.should.have.property('paging');
      res.body.should.have.property('payload');

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have.property('title').eql('FTX wide');
      done();
    });
});

it('admin searches all groups by type', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/group/search/all?type=generic')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.should.have.property('paging');
      res.body.should.have.property('payload');

      let payload = res.body.payload;
      payload.should.have.lengthOf(3);

      for (const e of payload) {
        e.should.have.property('type').to.eq('generic');
      }

      done();
    });
});

it('admin searches all groups by title and with type', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/group/search/all?title=private&type=generic')
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      res.body.should.have.property('payload');
      res.body.payload.should.have.lengthOf(1);
      res.body.should.have.property('paging');

      let payload = res.body.payload;
      payload[0].should.have.property('type').eql('generic');
      payload[0].should.have.property('title').eql('Private test group');
      done();
    });
});
