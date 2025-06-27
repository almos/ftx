const chai = require('chai');
const assert = require('chai').assert;
const chaiHttp = require('chai-http');
const initSpec = require('./init.spec');
const async = require('async');
const base = require('./helpers/base');
const _ = require('lodash');

chai.use(chaiHttp);
let expect = chai.expect;

const existingVideoId = '5fd6279d7ecb79a13e2e8ec1';
const existingLikedVideoId = '5fd6279d7ecb79a13e2e8ec2';
const existingAuthorId = '600168bcaae4412eec424ec1';

const users = [
  {
    userType: 'admin',
    AuthToken: () => initSpec.getAdmin().token,
    userIdThatLikedVideo: '5fd61c19631e2d86c5ae9ce9',
    userVideoViewmark: 25,
  },
  {
    userType: 'founder',
    AuthToken: () => initSpec.getFounder().token,
    userIdThatLikedVideo: '5fd61c19631e2d86c5ae9ce7',
    userVideoViewmark: 3,
  },
  // When we would need to test investor, just uncomment this lines
  // {
  //   userType: 'investor',
  //   AuthToken: () => initSpec.getInvestor().token,
  //   userIdThatLikedVideo: '5fd61c19631e2d86c5ae9ce8',
  //   userVideoViewMark: 12,
  // },
];

/**
 * Authentification checks
 */

it('firebase token is required to upload a video', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/video')
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to get existing video', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/video/fakeID')
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to update existing video', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/video/fakeID')
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to like video', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/video/fakeID/like`)
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to dislike video', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/video/fakeID/dislike`)
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to get video viewmark', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/video/fakeID/viewmark')
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to set video viewmark', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/video/fakeID/viewmark')
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

it('firebase token is required to access the video search endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/video/search')
    .end((err, res) => {
      base.checkBaseUnathorizeResponse(res);
      done();
    });
});

/**
 * Endpoints forbidden for investor and founder checks
 */

it('founder cannot upload a video', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/video')
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('investor cannot upload a video', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/video')
    .set({ AuthToken: initSpec.getInvestor().token })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('founder cannot update existing video', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/video/${existingVideoId}`)
    .set({ AuthToken: initSpec.getFounder().token })
    .send()
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

it('investor cannot update existing video', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/video/${existingVideoId}`)
    .set({ AuthToken: initSpec.getInvestor().token })
    .send({ title: 'My video with updated title' })
    .end((err, res) => {
      base.checkBaseUserRestrictionResponse(res);
      done();
    });
});

/**
 * Functional checks
 */

describe('getting the video by ID', () => {
  users.forEach(({ userType, AuthToken }) => {
    it(`${userType} gets the video by ID`, (done) => {
      chai
        .request(initSpec.getServer())
        .get(`/api/video/${existingVideoId}`)
        .set({ AuthToken: AuthToken() })
        .end((err, res) => {
          base.checkSuccessResponse(res);

          let payload = res.body.payload;
          payload.should.have.property('title').eql('Turnkey on startup development');
          payload.should.have
            .property('description')
            .eql('In this video we discuss all the awesome business opportunities out there');
          done();
        });
    });
  });
});

it('admin try to update information about video with incorrect evaluationCriteria and stages', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/video/${existingVideoId}`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .send({
      metadata: {
        evaluationCriteria: ['poblem', 'solution'],
        stage: ['idea', 'pr-seed'],
      },
    })
    .end((err, res) => {
      let errors = res.body.errors;
      errors.should.have.lengthOf(2);

      expect(errors).to.have.deep.members([
        { 'metadata.evaluationCriteria': 'invalid value' },
        { 'metadata.stage': 'invalid value' },
      ]);
      done();
    });
});

it('admin updates information about video', (done) => {
  async.waterfall(
    [
      // first step: updating information about video
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/video/${existingVideoId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .send({
            title: 'Video with updated title',
            description: 'Video with updated description',
            metadata: {
              evaluationCriteria: ['problem', 'solution'],
              stage: ['idea', 'seed'],
            },
          })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb(null, res.body.payload);
          }),
      // second step: getting updated information
      (video, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/video/${existingVideoId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('title').eql('Video with updated title');
            payload.should.have.property('description').eql('Video with updated description');
            payload.should.have.property('metadata');
            payload.metadata.should.have
              .property('evaluationCriteria')
              .eql(['problem', 'solution']);
            payload.metadata.should.have.property('stage').eql(['idea', 'seed']);
            cb();
          }),
    ],
    done,
  );
});

describe('liking a video', () => {
  users.forEach(({ userType, AuthToken, userIdThatLikedVideo }) => {
    it(`${userType} likes a video `, (done) => {
      async.waterfall(
        [
          // first step: liking the video
          (cb) =>
            chai
              .request(initSpec.getServer())
              .get(`/api/video/${existingVideoId}/like`)
              .set({ AuthToken: AuthToken() })
              .end((err, res) => {
                res.should.have.status(200);
                cb(null, res.body);
              }),
          // second step: getting liked video
          (video, cb) =>
            chai
              .request(initSpec.getServer())
              .get(`/api/video/${existingVideoId}`)
              .set({ AuthToken: AuthToken() })
              .end((err, res) => {
                base.checkSuccessResponse(res);

                let payload = res.body.payload;
                payload.should.have.property('likes').lengthOf(1);
                assert.equal(payload.likes[0], userIdThatLikedVideo);
                cb();
              }),
        ],
        done,
      );
    });
  });
});

describe('disliking a video', () => {
  users.forEach(({ userType, AuthToken, userIdThatLikedVideo }) => {
    it(`${userType} dislikes a video`, (done) => {
      async.waterfall(
        [
          // first step: getting liked video
          (cb) =>
            chai
              .request(initSpec.getServer())
              .get(`/api/video/${existingLikedVideoId}`)
              .set({ AuthToken: AuthToken() })
              .end((err, res) => {
                base.checkSuccessResponse(res);

                let payload = res.body.payload;
                payload.should.have.property('likes').that.includes(userIdThatLikedVideo);
                cb(null, payload);
              }),
          // second step: disliking the video
          (likedVideo, cb) =>
            chai
              .request(initSpec.getServer())
              .get(`/api/video/${existingLikedVideoId}/dislike`)
              .set({ AuthToken: AuthToken() })
              .end((err, res) => {
                res.should.have.property('status').eql(200);
                cb(null, res);
              }),
          // third step: getting disliked video
          (video, cb) =>
            chai
              .request(initSpec.getServer())
              .get(`/api/video/${existingLikedVideoId}`)
              .set({ AuthToken: AuthToken() })
              .end((err, res) => {
                base.checkSuccessResponse(res);

                let payload = res.body.payload;
                payload.should.have.property('likes').that.not.contains(userIdThatLikedVideo);
                cb();
              }),
        ],
        done,
      );
    });
  });
});

describe('searching videos with no filter and with default paging', () => {
  users.forEach(({ userType, AuthToken }) => {
    it(`${userType} searches videos with no filter and with default paging`, (done) => {
      chai
        .request(initSpec.getServer())
        .get('/api/video/search')
        .set({ AuthToken: AuthToken() })
        .end((err, res) => {
          base.checkSuccessResponse(res);

          res.body.should.have.property('paging');
          res.body.payload.should.have.lengthOf(2);

          let paging = res.body.paging;
          paging.should.have.property('totalObjects').eql(2);
          paging.should.have.property('currentPage').eql(1);
          paging.should.have.property('totalPages').eql(1);
          paging.should.have.property('hasNextPage').eql(false);
          paging.should.have.property('pageSize').eql(10);
          done();
        });
    });
  });
});

describe('searching videos with page size 1', () => {
  users.forEach(({ userType, AuthToken }) => {
    it(`${userType} searches videos with page size 1`, (done) => {
      chai
        .request(initSpec.getServer())
        .get('/api/video/search?pageSize=1')
        .set({ AuthToken: AuthToken() })
        .end((err, res) => {
          base.checkSuccessResponse(res);

          res.body.should.have.property('paging');
          res.body.payload.should.have.lengthOf(1);

          let paging = res.body.paging;
          paging.should.have.property('totalObjects').eql(2);
          paging.should.have.property('currentPage').eql(1);
          paging.should.have.property('totalPages').eql(2);
          paging.should.have.property('hasNextPage').eql(true);
          paging.should.have.property('pageSize').eql(1);
          done();
        });
    });
  });
});

describe('searching videos by author', () => {
  users.forEach(({ userType, AuthToken }) => {
    it(`${userType} searches videos by author`, (done) => {
      chai
        .request(initSpec.getServer())
        .get(`/api/video/search?author=${existingAuthorId}`)
        .set({ AuthToken: AuthToken() })
        .end((err, res) => {
          base.checkSuccessResponse(res);

          let payload = res.body.payload;
          payload.should.have.lengthOf(1);
          for (const e of payload) {
            e.should.have.deep.nested.property('authors[0].id').eql(existingAuthorId);
            e.should.have.deep.nested.property('authors[0].name').eql('David');
            e.should.have.deep.nested.property('authors[0].surname').eql('Smith');
          }
          done();
        });
    });
  });
});

describe('searching videos by query string', () => {
  users.forEach(({ userType, AuthToken }) => {
    it(`${userType} searches videos by query string`, (done) => {
      chai
        .request(initSpec.getServer())
        .get('/api/video/search?q=business')
        .set({ AuthToken: AuthToken() })
        .end((err, res) => {
          base.checkSuccessResponse(res);

          let payload = res.body.payload;
          payload.should.have.lengthOf(1);
          payload.should.have.deep.nested.property(
            '[0].description',
            'In this video we discuss all the awesome business opportunities out there',
          );
          done();
        });
    });
  });
});

describe('searching videos by tags', () => {
  users.forEach(({ userType, AuthToken }) => {
    it(`${userType} searches videos by tags`, (done) => {
      chai
        .request(initSpec.getServer())
        .get('/api/video/search?tags[]=sales')
        .set({ AuthToken: AuthToken() })
        .end((err, res) => {
          base.checkSuccessResponse(res);
          res.body.payload.should.have.lengthOf(2);

          let objectsExtraction = _.map(res.body.payload, function (v) {
            return { title: v.title, tags: v.tags };
          });

          expect(objectsExtraction).to.have.deep.members([
            {
              title: 'Turnkey on startup development',
              tags: ['business', 'development', 'sales', 'marketing'],
            },
            { title: 'Sales strategies', tags: ['sales', 'marketing'] },
          ]);

          let paging = res.body.paging;
          paging.should.have.property('hasNextPage').eql(false);
          done();
        });
    });
  });
});

describe('searching videos by query string and by tags', () => {
  users.forEach(({ userType, AuthToken }) => {
    it(`${userType} searches videos by query string and by tags`, (done) => {
      chai
        .request(initSpec.getServer())
        .get('/api/video/search?q=development&tags[]=sales&tags[]=business')
        .set({ AuthToken: AuthToken() })
        .end((err, res) => {
          base.checkSuccessResponse(res);

          let payload = res.body.payload;
          payload.should.have.lengthOf(1);
          payload.should.have.deep.nested.property('[0].title', 'Turnkey on startup development');
          payload.should.have.deep.nested.property('[0].tags', [
            'business',
            'development',
            'sales',
            'marketing',
          ]);

          let paging = res.body.paging;
          paging.should.have.property('hasNextPage').eql(false);
          done();
        });
    });
  });
});

describe('getting video view mark', () => {
  users.forEach(({ userType, AuthToken, userVideoViewmark }) => {
    it(`${userType} gets video viewmark`, (done) => {
      chai
        .request(initSpec.getServer())
        .get(`/api/video/${existingVideoId}/viewmark`)
        .set({ AuthToken: AuthToken() })
        .end((err, res) => {
          base.checkSuccessResponse(res);

          let payload = res.body.payload;
          payload.should.have.property('lastWatchedAtSec').eql(userVideoViewmark);
          payload.should.have.property('completed').eql(false);
          done();
        });
    });
  });
});

describe('setting video view mark', () => {
  users.forEach(({ userType, AuthToken }) => {
    it(`${userType} sets video view mark`, (done) => {
      async.waterfall(
        [
          // first step: setting video viewmark
          (cb) =>
            chai
              .request(initSpec.getServer())
              .post(`/api/video/${existingVideoId}/viewmark`)
              .set({ AuthToken: AuthToken() })
              .send({ lastWatchedAtSec: 32, completed: false })
              .end((err, res) => {
                base.checkSuccessResponse(res);

                cb(null, res.body.payload);
              }),
          // second step: getting video viewmark
          (video, cb) =>
            chai
              .request(initSpec.getServer())
              .get(`/api/video/${existingVideoId}/viewmark`)
              .set({ AuthToken: AuthToken() })
              .end((err, res) => {
                base.checkSuccessResponse(res);

                let payload = res.body.payload;
                payload.should.have.property('lastWatchedAtSec').eql(32);
                payload.should.have.property('completed').eql(false);
                cb();
              }),
        ],
        done,
      );
    });
  });
});
