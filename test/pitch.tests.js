const chai = require('chai');
const chaiHttp = require('chai-http');
const initSpec = require('./init.spec');
const async = require('async');
const request = require('request');
const base = require('./helpers/base');
const pitchHelpers = require('./helpers/pitch.helpers');
const _ = require('lodash');

chai.use(chaiHttp);
let expect = chai.expect;

/**
 * Permission checks
 */

let pitchCreateRequestPayload = {
  businessIdeaId: '5fd68a71da1aa9e14920723c',
  title: 'My brand new test pitch',
  tags: ['healthcare', 'genome'],
  description:
    'Sed ut perspiciatis, unde omnis iste natus error sit voluptatem accusantium doloremque laudantium',
};

let tenantedPitchCreateRequestPayload = {
  businessIdeaId: '5fd68a71da1aa9e14920723f',
  title: 'My brand new test pitch',
  tags: ['healthcare', 'genome'],
  description:
    'Sed ut perspiciatis, unde omnis iste natus error sit voluptatem accusantium doloremque laudantium',
};

it('firebase token is required to access pitch creation endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/pitch')
    .send(pitchCreateRequestPayload)
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access pitch removal endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .delete('/api/pitch/5fda324aee1965396cadd0d1')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access pitch search endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/search')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access pitch update endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/pitch/5fda324aee1965396cadd0d1')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access pitch video upload endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/pitch/5fda324aee1965396cadd0d1/video')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access pitch submit endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/5fda324aee1965396cadd0d1/submit')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access pitch revoke endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/5fda324aee1965396cadd0d1/revoke')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access pitch review submit endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/pitch/5fda324aee1965396cadd0d1/review')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access unreviewed pitches retrieval endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/unreviewed')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access internal pitch approval endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/5fda324aee1965396cadd0d1/approve')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access internal pitch rejection endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/pitch/5fda324aee1965396cadd0d1/reject')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access pitch retrieval endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/5fda324aee1965396cadd0d1')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access pitch reviews retrieval endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/5fda324aee1965396cadd0d1/reviews')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access pitch specific review endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/5fda324aee1965396cadd0d1/review/fakeId')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access own pitches endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/my/all')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access own active pitches endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/my/active')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access users active pitches endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/5fda324aee1965396cadd0d1/active')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access pitch deck upload endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/pitch/5fda324aee1965396cadd0d1/deck')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it('firebase token is required to access pitch delete upload  endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .delete('/api/pitch/5fda324aee1965396cadd0d1/deck')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it(`firebase token is required to access update increasing by 1 of pitch's views  endpoint`, (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/pitch/5fda324aee1965396cadd0d1/views')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it(`firebase token is required to access update increasing by 1 of pitch's like  endpoint`, (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/pitch/5fda324aee1965396cadd0d1/like')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it(`firebase token is required to access update decreasing by 1 of pitch's likes  endpoint`, (done) => {
  chai
    .request(initSpec.getServer())
    .post('/api/pitch/5fda324aee1965396cadd0d1/unlike')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

it(`firebase token is required to access get How many pitchs are bookmarked endpoint`, (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/5fda324aee1965396cadd0d1')
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

/**
 * Functional checks
 */

it('founder creates a pitch', (done) => {
  pitchHelpers.createPitch(
    chai,
    pitchCreateRequestPayload,
    initSpec.getFounder(),
    function (payload) {
      payload.should.have.property('visibleTenants').eql(['global']);
      payload.should.have.property('visibleGroups').eql(['602d61a214c6fd937c1ac9a3']);
      payload.should.have.property('language').eql('en');
      done();
    },
  );
});

it('founder uploads and removes their pitch deck', (done) => {
  async.waterfall(
    [
      // first step: uploading a pitch deck
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/pitch/5fda324aee1965396cadd0d1/deck`)
          .set({ AuthToken: initSpec.getFounder().token })
          .attach('pdf', './test/test-pitchDeck.pdf', 'test-pitchDeck.pdf')
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('pitchDeckUrl');
            cb(null, res.body.payload);
          }),
      // second step: checking if the pitch deck has been uploaded to google storage
      (pitch, cb) => {
        request(pitch.pitchDeckUrl, {}, function (err, res) {
          res.should.have.status(200);
          cb(null, pitch);
        });
      },
      // third step: deleting the pitch deck
      (pitch, cb) => {
        chai
          .request(initSpec.getServer())
          .delete(`/api/pitch/5fda324aee1965396cadd0d1/deck`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('pitchDeckUrl').eql(null);
            cb();
          });
      },
    ],
    done,
  );
});

it('hidden organization tenanted founder creates a pitch', (done) => {
  pitchHelpers.createPitch(
    chai,
    tenantedPitchCreateRequestPayload,
    initSpec.getTenantedFounder(),
    function (payload) {
      payload.should.have.property('visibleTenants').eql(['tef']);
      payload.should.have.property('visibleGroups').eql(['602d61a214c6fd937c1ac9a5']);
      done();
    },
  );
});

it('founder creates a pitch, business idea pitch count increases', (done) => {
  pitchHelpers.verifyPitchCountIncrease(
    chai,
    initSpec.getFounder(),
    pitchCreateRequestPayload,
    1,
    done,
  );
});

it('hidden organization tenanted founder creates a pitch, business idea pitch count increases', (done) => {
  pitchHelpers.verifyPitchCountIncrease(
    chai,
    initSpec.getTenantedFounder(),
    tenantedPitchCreateRequestPayload,
    1,
    done,
  );
});

it('founder deletes a pitch, business idea pitch count decreases', (done) => {
  let pitchId = '5fda324aee1965396cadd0d1',
    businessIdeaId = '5fd68a71da1aa9e14920723d',
    user = initSpec.getFounder();

  async.waterfall(
    [
      // 1st step: checking business idea before pitch removal -> pitchCount should be 1
      (cb) => pitchHelpers.validateBusinessIdeaPitchCount(chai, businessIdeaId, 1, user, cb),
      // 2nd step: removing a pitch
      (cb) => pitchHelpers.deletePitch(chai, pitchId, cb),
      // 3rd step - validating business idea, pitchCount should decrease
      (pitch, cb) => pitchHelpers.validateBusinessIdeaPitchCount(chai, businessIdeaId, 0, user, cb),
    ],
    done,
  );
});

it('hidden organization tenanted founder deletes a pitch, business idea pitch count decreases', (done) => {
  let pitchId = null,
    businessIdeaId = tenantedPitchCreateRequestPayload.businessIdeaId,
    user = initSpec.getTenantedFounder();
  async.waterfall(
    [
      // 1st step: creating a new pitch -> pitchCount should increase to 1
      () =>
        pitchHelpers.createPitch(chai, tenantedPitchCreateRequestPayload, user, function (payload) {
          pitchId = payload.id;
          done();
        }),
      // 2nd step: checking business idea before pitch removal -> pitchCount should be 1
      (cb) => pitchHelpers.validateBusinessIdeaPitchCount(chai, businessIdeaId, 1, user, cb),
      // 3rd step: removing a pitch
      (cb) => pitchHelpers.deletePitch(chai, pitchId, cb),
      // 4th step - validating business idea, pitchCount should decrease
      (pitch, cb) => pitchHelpers.validateBusinessIdeaPitchCount(chai, businessIdeaId, 0, user, cb),
    ],
    done,
  );
});

it('founder cannot create a pitch without a business idea', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/pitch/')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(_.omit(pitchCreateRequestPayload, 'businessIdeaId'))
    .end((err, res) => {
      base.checkFailResponse(res, 422, [{ businessIdeaId: 'Invalid value' }]);
      done();
    });
});

it('founder cannot create a pitch without a valid existing business idea', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/pitch/')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(
      _.merge(_.clone(pitchCreateRequestPayload), { businessIdeaId: '00000000111111111fffffff' }),
    )
    .end((err, res) => {
      base.checkFailResponse(res, 404, ['Object of type BusinessIdea has not been found']);
      done();
    });
});

it('founder cannot create a pitch without owning a business idea', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/pitch/')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(
      _.merge(_.clone(pitchCreateRequestPayload), { businessIdeaId: '5fd68a71da1aa9e14920723e' }),
    )
    .end((err, res) => {
      base.checkFailResponse(res, 403);
      done();
    });
});

it('admin goes through pitch rating', (done) => {
  async.waterfall(
    [
      // 1st step: admin creates pitch and doesn't set avgRate or curatedRate, totalRate should be 0
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put('/api/pitch')
          .set({ AuthToken: initSpec.getAdmin().token })
          .send({
            businessIdeaId: '5fd68a71da1ac9e149207234',
            title: 'My brand new test pitch',
            active: true,
            reviewed: true,
            visibleGroups: ['602d61a214c6fd937c1ac9a3'],
          })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('totalRate').eql(0);
            payload.should.have.property('curatedRate').eql(0);
            payload.should.have.property('avgRate').eql(0);
            cb(null, payload.id);
          }),
      // 2nd step: admin updates curated rate, check totalRate because totalRate = avgRate + curatedRate
      (pitchId, cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/pitch/${pitchId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .send({ curatedRate: 5 })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('totalRate').eql(5);
            payload.should.have.property('curatedRate').eql(5);
            payload.should.have.property('avgRate').eql(0);
            cb(null, payload.id);
          }),
      // 3rd step: admin updates curated rate, sets it back to 0
      (pitchId, cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/pitch/${pitchId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .send({ curatedRate: 0 })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('totalRate').eql(0);
            payload.should.have.property('curatedRate').eql(0);
            payload.should.have.property('avgRate').eql(0);
            cb(null, payload.id);
          }),
      // 4th step: admin submit peer review for the pitch
      (pitchId, cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/pitch/${pitchId}/review`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .send({
            feedback: 'Pitch feedback',
            rate: [
              { reviewCategoryId: '6008058be5dfd407004b9600', reviewRating: 5 },
              { reviewCategoryId: '6008058be5dfd407004b9601', reviewRating: 4 },
              { reviewCategoryId: '6008058be5dfd407004b9602', reviewRating: 3 },
            ],
          })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('avgRate').eql(4);
            cb(null, pitchId);
          }),
      // 5th step: admin gets the pitch to check total rate
      (pitchId, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/pitch/${pitchId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('totalRate').eql(4);
            payload.should.have.property('curatedRate').eql(0);
            payload.should.have.property('avgRate').eql(4);
            cb(null, payload.id);
          }),
      // 6th step: admin updates curated rate
      (pitchId, cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/pitch/${pitchId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .send({ curatedRate: 3 })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('totalRate').eql(7);
            payload.should.have.property('curatedRate').eql(3);
            payload.should.have.property('avgRate').eql(4);
            cb(null, payload.id);
          }),
    ],
    done,
  );
});

/**
 * Pitch update
 */

let businessIdeaCreatePayload = {
  title: 'My super-duper business idea',
  description: 'To rule the world',
  logo: 'https://testlogo.com',
  websiteUrl: 'https://testwebsite.com',
  industries: ['test industries'],
  location: ['test location'],
  stage: 'seed',
  language: 'en',
};

it('founder create pitch and business idea', (done) => {
  let v2PitchRequestPayload = _.merge(_.clone(pitchCreateRequestPayload), {
    businessIdea: _.clone(businessIdeaCreatePayload),
  });
  async.waterfall(
    [
      // 1st step: create pitch
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put('/api/pitch/v2/')
          .set({ AuthToken: initSpec.getFounder().token })
          .send(v2PitchRequestPayload)
          .end((err, res) => {
            base.checkSuccessResponse(res);
            const payload = res.body.payload;
            payload.should.have.property('businessIdeaId');
            payload.should.have.property('title').eql(pitchCreateRequestPayload.title);
            payload.should.have.property('description').eql(pitchCreateRequestPayload.description);
            cb(null, payload.businessIdeaId);
          }),
      (businessIdeaId, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/business-idea/${businessIdeaId}`)
          .set({ AuthToken: initSpec.getFounder().token })
          .send(
            _.merge(_.clone(pitchCreateRequestPayload), {
              businessIdea: _.clone(businessIdeaCreatePayload),
            }),
          )
          .end((err, res) => {
            base.checkSuccessResponse(res);
            const payload = res.body.payload;
            payload.should.have.property('title').eql(businessIdeaCreatePayload.title);
            payload.should.have.property('description').eql(businessIdeaCreatePayload.description);
            cb();
          }),
    ],
    done,
  );
});

it('founder update pitch and business idea', (done) => {
  let v2PitchRequestPayload = _.merge(_.clone(pitchCreateRequestPayload), {
    businessIdea: _.clone(businessIdeaCreatePayload),
  });
  async.waterfall(
    [
      // 1st step: create pitch
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post('/api/pitch/v2/5fda324aee1965396cadd0d1')
          .set({ AuthToken: initSpec.getFounder().token })
          .send(v2PitchRequestPayload)
          .end((err, res) => {
            base.checkSuccessResponse(res);
            const payload = res.body.payload;
            payload.should.have.property('businessIdeaId');
            payload.should.have.property('title').eql(pitchCreateRequestPayload.title);
            payload.should.have.property('description').eql(pitchCreateRequestPayload.description);
            cb(null, payload.businessIdeaId);
          }),
      (businessIdeaId, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/business-idea/${businessIdeaId}`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            const payload = res.body.payload;
            payload.should.have.property('title').eql(businessIdeaCreatePayload.title);
            payload.should.have.property('description').eql(businessIdeaCreatePayload.description);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .delete(`/api/pitch/v2/5fda324aee1965396cadd0d1`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            const payload = res.body.payload;
            payload.should.have.property('title').eql(pitchCreateRequestPayload.title);
            payload.should.have.property('description').eql(pitchCreateRequestPayload.description);
            cb(null, payload.businessIdeaId);
          }),
      (businessIdeaId, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/business-idea/${businessIdeaId}`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkFailResponse(res, 404);
            cb();
          }),
    ],
    done,
  );
});

it('founder create pitch and business idea bad business idea', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/pitch/v2')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(
      _.merge(_.clone(pitchCreateRequestPayload), {
        businessIdea: { title: true },
      }),
    )
    .end((err, res) => {
      base.checkFailResponse(res, 422);
      done();
    });
});

it('founder update pitch and business idea bad pitch', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/pitch/v2')
    .set({ AuthToken: initSpec.getFounder().token })
    .send({ businessIdea: _.clone(businessIdeaCreatePayload) })
    .end((err, res) => {
      base.checkFailResponse(res, 422);
      done();
    });
});

it('founder tries to hijack request and set fields that are not available for setup', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/pitch')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(
      _.merge(_.clone(pitchCreateRequestPayload), {
        reviewed: true,
        rejected: true,
        reviewsCount: 10,
        rejectReason: 'Test test ',
        reviewedBy: '5fd61c19631e2d86c5ae9ce8',
        localVideoPath: '/tmp/test.dat',
        brightcove: { a: 'b' },
        video: { c: 'd' },
      }),
    )
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('private').eql(false);
      payload.should.have.property('reviewed').eql(false);
      payload.should.have.property('rejected').eql(false);
      payload.should.have.property('reviewsCount').eql(0);

      payload.should.not.have.property('rejectReason');
      payload.should.not.have.property('reviewedBy');
      payload.should.not.have.property('localVideoPath');
      payload.should.not.have.property('brightcove');
      payload.should.not.have.property('video');

      done();
    });
});

let pitchUpdateRequestPayload = {
  title: 'New title',
  description: 'New description',
  tags: ['tag1', 'tag2'],
};

it('founder updates a pitch', (done) => {
  pitchHelpers.updatePitch(
    chai,
    '5fda324aee1965396cadd0d1',
    pitchUpdateRequestPayload,
    initSpec.getFounder(),
    function (payload) {
      done();
    },
  );
});

it('hidden organization tenanted founder updates a pitch', (done) => {
  pitchHelpers.updatePitch(
    chai,
    '5fda324aee1965396cadd0d4',
    pitchUpdateRequestPayload,
    initSpec.getTenantedFounder(),
    function (payload) {
      done();
    },
  );
});

it('founder removes tags from the pitch', (done) => {
  let pitchUpdateRequestPayload = {
    tags: [],
  };
  chai
    .request(initSpec.getServer())
    .post('/api/pitch/5fda324aee1965396cadd0d1')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(pitchUpdateRequestPayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('tags').eql([]);

      done();
    });
});

it('founder tries to hijack request and set fields that are not available for modification', (done) => {
  let pitchUpdateRequestPayload = {
    reviewed: true,
    rejected: true,
    reviewsCount: 10,
    rejectReason: 'Test test ',
    reviewedBy: '5fd61c19631e2d86c5ae9ce8',
    localVideoPath: '/tmp/test.dat',
    brightcove: { a: 'b' },
    video: { c: 'd' },
  };
  chai
    .request(initSpec.getServer())
    .post('/api/pitch/5fda324aee1965396cadd0d1')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(pitchUpdateRequestPayload)
    .end((err, res) => {
      base.checkFailResponse(res, 422);
      done();
    });
});

it('founder tries to update pitch he does not own', (done) => {
  let pitchUpdateRequestPayload = {
    title: 'Not mine pitch',
  };
  chai
    .request(initSpec.getServer())
    .post('/api/pitch/5fda324aee1965396cadd0d2')
    .set({ AuthToken: initSpec.getFounder().token })
    .send(pitchUpdateRequestPayload)
    .end((err, res) => {
      base.checkFailResponse(res, 403);
      done();
    });
});

it('founder creates/updates/finds review for pitch review', (done) => {
  const pitchId = '5fda324aee1965396cadd0d4',
    reviewId = 'aaaa324aee1965396cadd000';
  async.waterfall(
    [
      // 1st step: founder create review for pitch review
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put(`/api/pitch/${pitchId}/review/${reviewId}/feedback`)
          .set({ AuthToken: initSpec.getTenantedFounder().token })
          .send({ rate: 1 })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('rate').eql(1);
            payload.should.have.property('userId').eql(null);
            cb();
          }),
      // 2nd step: founder update review for pitch review
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/pitch/${pitchId}/review/${reviewId}/feedback`)
          .set({ AuthToken: initSpec.getTenantedFounder().token })
          .send({ rate: -1 })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('rate').eql(-1);
            payload.should.have.property('userId').eql(null);
            cb();
          }),
      // 3rd step: founder finds reviews for pitch review
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/pitch/${pitchId}/review/${reviewId}/feedback`)
          .set({ AuthToken: initSpec.getTenantedFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('rate').eql(-1);
            payload.should.have.property('userId').eql(null);
            cb();
          }),
      // 4th step: founder try to add review for pitch review (he has already added it before)
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put(`/api/pitch/${pitchId}/review/${reviewId}/feedback`)
          .set({ AuthToken: initSpec.getTenantedFounder().token })
          .send({ rate: 1 })
          .end((err, res) => {
            res.body.should.have
              .property('errors')
              .eql(['Object review with this user id already exists']);
            cb();
          }),
    ],
    done,
  );
});

it('User update increase count of Like data via PitchId that does not have like field, Object after update should have like field and euqal 1', (done) => {
  async.waterfall(
    [
      (cb) => {
        pitchHelpers.createPitch(
          chai,
          pitchCreateRequestPayload,
          initSpec.getFounder(),
          function (payload) {
            payload.should.have.property('visibleTenants').eql(['global']);
            payload.should.have.property('visibleGroups').eql(['602d61a214c6fd937c1ac9a3']);
            payload.should.have.property('language').eql('en');

            cb(null, payload);
          },
        );
      },
      (pitch, cb) => {
        let { id } = pitch;
        chai
          .request(initSpec.getServer())
          .post(`/api/pitch/${id}/like`)
          .set({ AuthToken: initSpec.getFounder().token })
          .send()
          .end((err, res) => {
            base.checkSuccessResponse(res);
            let payload = res.body.payload;
            payload.should.have.property('likes').eql(1);
            cb();
          });
      },
    ],
    done,
  );
});

it('User update increase count of Views data via PitchId that does not have like field, Object after update should have views field and euqal 1', (done) => {
  async.waterfall(
    [
      (cb) => {
        pitchHelpers.createPitch(
          chai,
          pitchCreateRequestPayload,
          initSpec.getFounder(),
          function (payload) {
            payload.should.have.property('visibleTenants').eql(['global']);
            payload.should.have.property('visibleGroups').eql(['602d61a214c6fd937c1ac9a3']);
            payload.should.have.property('language').eql('en');

            cb(null, payload);
          },
        );
      },
      (pitch, cb) => {
        let { id } = pitch;
        chai
          .request(initSpec.getServer())
          .post(`/api/pitch/${id}/views`)
          .set({ AuthToken: initSpec.getFounder().token })
          .send()
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('views').eql(1);

            cb();
          });
      },
    ],
    done,
  );
});

it('User update increase count of Like data via PitchId that does not in pitchs collection, It should return 404 ', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/pitch/60619cb4ef80871531de69c3/like')
    .set({ AuthToken: initSpec.getFounder().token })
    .send()
    .end((err, res) => {
      res.should.have.status(404);
      done();
    });
});

it('User update decrease count of Like data via PitchId that does not have like field. It should return pitch object that has likes field as 0', (done) => {
  async.waterfall(
    [
      (cb) => {
        pitchHelpers.createPitch(
          chai,
          pitchCreateRequestPayload,
          initSpec.getFounder(),
          function (payload) {
            payload.should.have.property('visibleTenants').eql(['global']);
            payload.should.have.property('visibleGroups').eql(['602d61a214c6fd937c1ac9a3']);
            payload.should.have.property('language').eql('en');

            cb(null, payload);
          },
        );
      },
      (pitch, cb) => {
        let { id } = pitch;

        chai
          .request(initSpec.getServer())
          .post(`/api/pitch/${id}/unlike`)
          .set({ AuthToken: initSpec.getFounder().token })
          .send()
          .end((err, res) => {
            base.checkSuccessResponse(res);
            let payload = res.body.payload;
            payload.should.have.property('likes').eql(0);
            cb();
          });
      },
    ],
    done,
  );
});

it('User twice update decrease count of Like data via PitchId that has like field is 1. It should return pitch object that has likes field as 0', (done) => {
  async.waterfall(
    [
      (cb) => {
        pitchHelpers.createPitch(
          chai,
          pitchCreateRequestPayload,
          initSpec.getFounder(),
          function (payload) {
            payload.should.have.property('visibleTenants').eql(['global']);
            payload.should.have.property('visibleGroups').eql(['602d61a214c6fd937c1ac9a3']);
            payload.should.have.property('language').eql('en');

            cb(null, payload);
          },
        );
      },
      (pitch, cb) => {
        let { id } = pitch;

        chai
          .request(initSpec.getServer())
          .post(`/api/pitch/${id}/like`)
          .set({ AuthToken: initSpec.getFounder().token })
          .send()
          .end((err, res) => {
            base.checkSuccessResponse(res);
            let payload = res.body.payload;
            payload.should.have.property('likes').eql(1);
            cb(null, payload);
          });
      },
      (pitch, cb) => {
        let { id } = pitch;

        chai
          .request(initSpec.getServer())
          .post(`/api/pitch/${id}/unlike`)
          .set({ AuthToken: initSpec.getFounder().token })
          .send()
          .end((err, res) => {
            base.checkSuccessResponse(res);
            let payload = res.body.payload;
            payload.should.have.property('likes').eql(0);
            cb(null, payload);
          });
      },
      (pitch, cb) => {
        let { id } = pitch;

        chai
          .request(initSpec.getServer())
          .post(`/api/pitch/${id}/unlike`)
          .set({ AuthToken: initSpec.getFounder().token })
          .send()
          .end((err, res) => {
            base.checkSuccessResponse(res);
            let payload = res.body.payload;
            payload.should.have.property('likes').eql(0);
            cb();
          });
      },
    ],
    done,
  );
});

/**
 * Pitch submission
 */

it('founder submits his pitch to a review queue', (done) => {
  async.waterfall(
    [
      // 1st step: submitting a pitch
      (cb) =>
        pitchHelpers.submitPitch(
          chai,
          '5fda324aee1965396cadd0d1',
          '5fd68a71da1aa9e14920723d',
          '5fd61c19631e2d86c5ae9ce7',
          cb,
        ),
      // 2nd step: checking pitch status
      (cb) => pitchHelpers.validatePitchActiveStatus(chai, '5fda324aee1965396cadd0d1', true, cb),
      (cb) => pitchHelpers.checkPitchIsInReviewQueue(chai, '5fda324aee1965396cadd0d1', true, cb),
      // 3rd step - submitting another pitch
      (reviewQueueEntry, cb) =>
        pitchHelpers.submitPitch(
          chai,
          '5fda324aee1965396cadd0d2',
          '5fd68a71da1aa9e14920723d',
          '5fd61c19631e2d86c5ae9ce7',
          cb,
        ),
      // 4th step: checking pitch status
      (cb) => pitchHelpers.validatePitchActiveStatus(chai, '5fda324aee1965396cadd0d1', false, cb),
      (cb) => pitchHelpers.checkPitchIsInReviewQueue(chai, '5fda324aee1965396cadd0d1', false, cb),
      // 5th step: checking pitch status
      (reviewQueueEntry, cb) =>
        pitchHelpers.validatePitchActiveStatus(chai, '5fda324aee1965396cadd0d2', true, cb),
      (cb) => pitchHelpers.checkPitchIsInReviewQueue(chai, '5fda324aee1965396cadd0d2', true, cb),
    ],
    done,
  );
});

it('founder deletes and submits his pitch from a review queue', (done) => {
  async.waterfall(
    [
      // 1st step: deleting a pitch
      (cb) => pitchHelpers.deletePitch(chai, '5fda324aee1965396cadd0d1', cb),
      // 2nd step: checking pitch status
      (pitch, cb) =>
        pitchHelpers.validatePitchActiveStatus(chai, '5fda324aee1965396cadd0d1', false, cb),
      // 3rd step - submitting the pitch
      (cb) =>
        pitchHelpers.trySubmittingDeletedPitch(
          chai,
          '5fda324aee1965396cadd0d1',
          '5fd68a71da1aa9e14920723d',
          '5fd61c19631e2d86c5ae9ce7',
          cb,
        ),
    ],
    done,
  );
});

it('founder submits and then revokes pitch from the review', (done) => {
  async.waterfall(
    [
      // 1st step: submitting a pitch
      (cb) =>
        pitchHelpers.submitPitch(
          chai,
          '5fda324aee1965396cadd0d1',
          '5fd68a71da1aa9e14920723d',
          '5fd61c19631e2d86c5ae9ce7',
          cb,
        ),
      // 2nd step: checking pitch status
      (cb) => pitchHelpers.validatePitchActiveStatus(chai, '5fda324aee1965396cadd0d1', true, cb),
      (cb) => pitchHelpers.checkPitchIsInReviewQueue(chai, '5fda324aee1965396cadd0d1', true, cb),
      // 3rd step - revoke the pitch
      (reviewQueueEntry, cb) => pitchHelpers.revokePitch(chai, '5fda324aee1965396cadd0d1', cb),
      // 4th step: checking pitch status
      (cb) => pitchHelpers.validatePitchActiveStatus(chai, '5fda324aee1965396cadd0d1', false, cb),
      (cb) => pitchHelpers.checkPitchIsInReviewQueue(chai, '5fda324aee1965396cadd0d1', false, cb),
    ],
    done,
  );
});

it('founder tries to revoke inexisting pitch', (done) => {
  pitchHelpers.revokeInexistingPitch(chai, '5fda324aee1965396c111111', function (arg) {
    done();
  });
});

it('founder 1 submits pitch owned by founder 2', (done) => {
  async.waterfall(
    [
      // 1st step: deleting a pitch
      (cb) =>
        pitchHelpers.submitPitchUserDoesntOwn(
          chai,
          '5fda324aee1965396cadd0d3',
          '5fd68a71da1aa9e14920723e',
          '5fd61c19631e2d86c5ae9ce7',
          cb,
        ),
      // 2nd step: checking pitch status
      (cb) => pitchHelpers.checkPitchIsInReviewQueue(chai, '5fda324aee1965396cadd0d3', false, cb),
    ],
    done,
  );
});

/**
 * Pitch approval / rejection
 */

it('founder gets a pitch approved by admin staff', (done) => {
  async.waterfall(
    [
      // 1st step: submitting a pitch
      (cb) =>
        pitchHelpers.submitPitch(
          chai,
          '5fda324aee1965396cadd0d1',
          '5fd68a71da1aa9e14920723d',
          '5fd61c19631e2d86c5ae9ce7',
          cb,
        ),
      // 2nd step: checking submitted pitch status
      (cb) => pitchHelpers.validatePitchActiveStatus(chai, '5fda324aee1965396cadd0d1', true, cb),
      (cb) => pitchHelpers.checkPitchIsInReviewQueue(chai, '5fda324aee1965396cadd0d1', true, cb),
      // 3rd step: admin approves the pitch
      (reviewQueue, cb) => pitchHelpers.approvePitchByAdmin(chai, '5fda324aee1965396cadd0d1', cb),
      // 4th step: checking approved pitch status
      (cb) =>
        pitchHelpers.validatePitchStatus(
          chai,
          '5fda324aee1965396cadd0d1',
          { active: true, deleted: false, reviewed: true, rejected: false, rejectReason: null },
          cb,
        ),
      (cb) => pitchHelpers.checkPitchIsInReviewQueue(chai, '5fda324aee1965396cadd0d1', false, cb),
    ],
    done,
  );
});

it('non-admin user tries to approve a pitch', (done) => {
  pitchHelpers.tryApprovePitchByFounder(chai, '5fda324aee1965396cadd0d1', function (obj) {
    done();
  });
});

it('founder gets a pitch rejected by admin staff', (done) => {
  async.waterfall(
    [
      // 1st step: submitting a pitch
      (cb) =>
        pitchHelpers.submitPitch(
          chai,
          '5fda324aee1965396cadd0d1',
          '5fd68a71da1aa9e14920723d',
          '5fd61c19631e2d86c5ae9ce7',
          cb,
        ),
      // 2nd step: checking submitted pitch status
      (cb) => pitchHelpers.validatePitchActiveStatus(chai, '5fda324aee1965396cadd0d1', true, cb),
      (cb) => pitchHelpers.checkPitchIsInReviewQueue(chai, '5fda324aee1965396cadd0d1', true, cb),
      // 3rd step: admin approves the pitch
      (reviewQueue, cb) =>
        pitchHelpers.rejectPitchByAdmin(chai, '5fda324aee1965396cadd0d1', 'Irrelevant content', cb),
      // 4th step: checking approved pitch status
      (cb) =>
        pitchHelpers.validatePitchStatus(
          chai,
          '5fda324aee1965396cadd0d1',
          {
            active: false,
            deleted: false,
            reviewed: true,
            rejected: true,
            rejectReason: 'Irrelevant content',
          },
          cb,
        ),
      // 5th step: checking pitch queue presense
      (cb) => pitchHelpers.checkPitchIsInReviewQueue(chai, '5fda324aee1965396cadd0d1', false, cb),
    ],
    done,
  );
});

it('founder tries to resubmit rejected pitch', (done) => {
  async.waterfall(
    [
      // 1st step: submitting a pitch
      (cb) =>
        pitchHelpers.submitPitch(
          chai,
          '5fda324aee1965396cadd0d1',
          '5fd68a71da1aa9e14920723d',
          '5fd61c19631e2d86c5ae9ce7',
          cb,
        ),
      // 2nd step: admin approves the pitch
      (cb) =>
        pitchHelpers.rejectPitchByAdmin(chai, '5fda324aee1965396cadd0d1', 'Irrelevant content', cb),
      // 3rd step: founder tries to submit rejected pitch
      (cb) =>
        pitchHelpers.trySubmittingRejectedPitch(
          chai,
          '5fda324aee1965396cadd0d1',
          '5fd68a71da1aa9e14920723d',
          '5fd61c19631e2d86c5ae9ce7',
          cb,
        ),
    ],
    done,
  );
});

it('founder tries to resubmit approved pitch', (done) => {
  async.waterfall(
    [
      // 1st step: submitting a pitch
      (cb) =>
        pitchHelpers.submitPitch(
          chai,
          '5fda324aee1965396cadd0d1',
          '5fd68a71da1aa9e14920723d',
          '5fd61c19631e2d86c5ae9ce7',
          cb,
        ),
      // 2nd step: admin approves the pitch
      (cb) => pitchHelpers.approvePitchByAdmin(chai, '5fda324aee1965396cadd0d1', cb),
      // 3rd step: founder tries to submit rejected pitch
      (cb) =>
        pitchHelpers.trySubmittingApprovedPitch(
          chai,
          '5fda324aee1965396cadd0d1',
          '5fd68a71da1aa9e14920723d',
          '5fd61c19631e2d86c5ae9ce7',
          cb,
        ),
    ],
    done,
  );
});

it('non-admin user tries to reject a pitch', (done) => {
  pitchHelpers.tryRejectPitchByFounder(chai, '5fda324aee1965396cadd0d1', function (obj) {
    done();
  });
});

/**
 * Pitch searching
 */

it('admin searches pitches with curated flag (true by default), sort order should be desc by totalRate', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload[0].should.have.property('totalRate').eql(5);
      payload[1].should.have.property('totalRate').eql(4);
      payload[2].should.have.property('totalRate').eql(3);
      done();
    });
});

it('admin searches pitches curated flag is false, sort order should be desc by avgRate', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search?curated=false`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload[0].should.have.property('avgRate').eql(5);
      payload[1].should.have.property('avgRate').eql(4);
      payload[2].should.have.property('avgRate').eql(3);
      done();
    });
});

it(`founder searches the pitches, response should have 'canReview' property`, (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/search')
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(2);

      let objectsExtraction = _.map(res.body.payload, (v) => {
        return {
          id: v.id,
          userId: v.userId,
          businessIdeaId: v.businessIdeaId,
          canReview: v.canReview,
        };
      });

      expect(objectsExtraction).to.have.deep.members([
        {
          businessIdeaId: '5fd68a71da1aa9e14920723e',
          canReview: true,
          id: '5fda324aee1965396cadd0d3',
          userId: '5fd61c19631e2d86c5ae9ce6',
        },
        {
          businessIdeaId: '5fd68a71da1aa9e14920723e',
          canReview: true,
          id: '1cba324aee1965396cabb012',
          userId: '5fd61c19631e2d86c5ae9ce6',
        },
      ]);

      done();
    });
});

it('founder searches pitches by query string', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search?q=quelque+plaisanteri`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have
        .property('title')
        .eql('Quelques plaisanteries ont galvanisé le faux jury');
      done();
    });
});

it('founder searches the pitches, response should have reviews property with only userId', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/search?excludeOwn=false&excludeReviewed=false')
    .set({ AuthToken: initSpec.getTenantedFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have.property('reviews').eql([{ userId: '5fd61c19631e2d86c5ae9ab3' }]);
      done();
    });
});

it('founder that is joined to a group searches all the pitches including own ones', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/search?excludeOwn=false&excludeReviewed=false')
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      res.body.payload.should.have.lengthOf(3);

      let objectsExtraction = _.map(res.body.payload, (v) => {
        return {
          id: v.id,
          userId: v.userId,
          businessIdeaId: v.businessIdeaId,
        };
      });

      expect(objectsExtraction).to.have.deep.members([
        {
          id: '5fda324aee1965396cadd0d3',
          userId: '5fd61c19631e2d86c5ae9ce6',
          businessIdeaId: '5fd68a71da1aa9e14920723e',
        },
        {
          id: '5fda324aee1965396cadd0d5',
          userId: '5fd61c19631e2d86c5ae9ce7',
          businessIdeaId: '5fd68a71da1aa9e149207242',
        },
        {
          id: '1cba324aee1965396cabb012',
          userId: '5fd61c19631e2d86c5ae9ce6',
          businessIdeaId: '5fd68a71da1aa9e14920723e',
        },
      ]);

      done();
    });
});

it('founder that is joined to a group searches all the pitches within a specific group', (done) => {
  chai
    .request(initSpec.getServer())
    .get(
      '/api/pitch/search?excludeOwn=false&excludeReviewed=false&groups[]=602d61a214c6fd937c1ac9a6',
    )
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      res.body.payload.should.have.lengthOf(2);

      let objectsExtraction = _.map(res.body.payload, (v) => {
        return {
          id: v.id,
          userId: v.userId,
          businessIdeaId: v.businessIdeaId,
          visibleGroups: v.visibleGroups,
        };
      });

      expect(objectsExtraction).to.have.deep.members([
        {
          id: '5fda324aee1965396cadd0d5',
          userId: '5fd61c19631e2d86c5ae9ce7',
          businessIdeaId: '5fd68a71da1aa9e149207242',
          visibleGroups: ['602d61a214c6fd937c1ac9a6'],
        },
        {
          id: '1cba324aee1965396cabb012',
          userId: '5fd61c19631e2d86c5ae9ce6',
          businessIdeaId: '5fd68a71da1aa9e14920723e',
          visibleGroups: ['602d61a214c6fd937c1ac9a6'],
        },
      ]);

      done();
    });
});

it('founder searches the pitches with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/search?sub=true')
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let expectedObject = _.find(res.body.payload, { id: '5fda324aee1965396cadd0d3' });
      expectedObject.should.have.property('userId');
      expectedObject.should.have.property('businessIdeaId');
      expectedObject.userId.should.not.have.property('marketingConsentTimestamp');
      expectedObject.userId.should.not.have.property('theme');
      expectedObject.userId.should.not.have.property('watchedVideos');
      expectedObject.userId.should.not.have.property('hasMarketingConsent');
      expectedObject.userId.should.not.have.property('paid');
      expectedObject.userId.should.not.have.property('firebaseId');
      expectedObject.userId.should.not.have.property('email');

      done();
    });
});

it('hidden organization tenanted founder searches the pitches', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/pitch/search?excludeOwn=false')
    .set({ AuthToken: initSpec.getTenantedFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let objectsExtraction = _.map(res.body.payload, (v) => {
        return { id: v.id };
      });

      expect(objectsExtraction).to.have.deep.members([{ id: '5fda324aee1965396cadd0d4' }]);

      done();
    });
});

it('admin searches for the unreviewed pitches', (done) => {
  async.waterfall(
    [
      // 1st step: submitting a pitch
      (cb) =>
        pitchHelpers.submitPitch(
          chai,
          '5fda324aee1965396cadd0d1',
          '5fd68a71da1aa9e14920723d',
          '5fd61c19631e2d86c5ae9ce7',
          cb,
        ),
      // 2nd step: admin searches for the pitch as unreviewed one
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get('/api/pitch/unreviewed')
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let objectsExtraction = _.map(res.body.payload, (v) => {
              return { id: v.pitchId.id };
            });

            expect(objectsExtraction).to.have.deep.members([{ id: '5fda324aee1965396cadd0d1' }]);

            cb();
          }),
      // 3rd step: admin approves the pitch
      (cb) => pitchHelpers.approvePitchByAdmin(chai, '5fda324aee1965396cadd0d1', cb),
      // 4th step: admin checks again for unreviewed pitches, pitch should be gone
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get('/api/pitch/unreviewed')
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            res.body.should.have.property('payload').eql([]);
            cb();
          }),
    ],
    done,
  );
});

it('get how many PitchId is bookmarked if PitchId does not found  in bookmark collection, it will return bookmark as 0', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/60619cb4ef80871531de69c3/bookmark-count`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      payload.should.have.property('bookmarkCount').eql(0);

      done();
    });
});

it('get how many PitchId is bookmarked if PitchId does not found  in bookmark collection, it will return bookmark more than 0', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/5fda324aee1965396cadd0d1/bookmark-count`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      payload.should.have.property('bookmarkCount').not.eql(0);

      done();
    });
});

it('get Pitch via pitchId that contain likes and views data. It should return pitch object that contain likes and views field', (done) => {
  async.waterfall(
    [
      // 1. Insert new pitch
      (cb) => {
        pitchHelpers.createPitch(
          chai,
          pitchCreateRequestPayload,
          initSpec.getFounder(),
          function (payload) {
            payload.should.have.property('visibleTenants').eql(['global']);
            payload.should.have.property('visibleGroups').eql(['602d61a214c6fd937c1ac9a3']);
            payload.should.have.property('language').eql('en');

            cb(null, payload);
          },
        );
      },
      (pitch, cb) => {
        let { id } = pitch;

        chai
          .request(initSpec.getServer())
          .post(`/api/pitch/${id}/like`)
          .set({ AuthToken: initSpec.getFounder().token })
          .send()
          .end((err, res) => {
            base.checkSuccessResponse(res);
            let payload = res.body.payload;
            payload.should.have.property('likes').eql(1);
            cb(null, payload.id);
          });
      },
      // 3. update views data
      (pitchId, cb) => {
        chai
          .request(initSpec.getServer())
          .post(`/api/pitch/${pitchId}/views`)
          .set({ AuthToken: initSpec.getFounder().token })
          .send()
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('views').eql(1);

            cb(null, payload.id);
          });
      },
      (pitchId, cb) => {
        chai
          .request(initSpec.getServer())
          .get(`/api/pitch/${pitchId}`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('views');
            payload.should.have.property('likes');

            cb(null, payload);
          });
      },
    ],
    done,
  );
});

/**
 * Pitch reviews
 */

it('founder tries to leave review, checking group limit reviewers functionality', (done) => {
  async.waterfall(
    [
      // 1st step: founder can leave review, limit reviewers is true and user in the reviewers list
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post('/api/pitch/1cba324aee1965396cabb012/review')
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .send({
            feedback: 'Pitch feedback 1',
            rate: [{ reviewCategoryId: '6008058be5dfd407004b9600', reviewRating: 10 }],
          })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb();
          }),
      // 2nd step: admin deletes user's id from reviewers array
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/group/602d61a214c6fd937c1ac9a6`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .send({
            limitReviewers: true,
            reviewers: [],
          })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            res.body.payload.should.have.property('limitReviewers').eql(true);
            res.body.payload.should.have.property('reviewers').eql([]);
            cb();
          }),
      // 3rd step: founder cannot leave review, limit reviewers is true and founder not in reviewers list, response should be 403
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post('/api/pitch/1cba324aee1965396cabb012/review')
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .send({
            feedback: 'Pitch feedback 2',
            rate: [{ reviewCategoryId: '6008058be5dfd407004b9601', reviewRating: 8 }],
          })
          .end((err, res) => {
            base.checkBaseUserRestrictionResponse(res);
            cb();
          }),
      // 4th step: admin changes limit reviewing flag to false, reviewers array is empty
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/group/602d61a214c6fd937c1ac9a6`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .send({
            limitReviewers: false,
            reviewers: [],
          })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            res.body.payload.should.have.property('limitReviewers').eql(false);
            res.body.payload.should.have.property('reviewers').eql([]);
            cb();
          }),
      // 5th step: same founder can't leave review - he already did before
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post('/api/pitch/1cba324aee1965396cabb012/review')
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .send({
            feedback: 'Pitch feedback 3',
            rate: [{ reviewCategoryId: '6008058be5dfd407004b9602', reviewRating: 3 }],
          })
          .end((err, res) => {
            res.should.have.status(406);
            res.should.be.json;
            cb();
          }),
      // 6th step: another founder can leave review, limit reviewers flag is false
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post('/api/pitch/1cba324aee1965396cabb012/review')
          .set({ AuthToken: initSpec.getFounder().token })
          .send({
            feedback: 'Pitch feedback 3',
            rate: [{ reviewCategoryId: '6008058be5dfd407004b9602', reviewRating: 3 }],
          })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb();
          }),
    ],
    done,
  );
});

it('founder submits peer review for the pitch', (done) => {
  let reviewId = null;
  async.waterfall(
    [
      // 1st step: checking reviews submitted on the pitch, initially there should be none of them
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get('/api/pitch/5fda324aee1965396cadd0d3/reviews')
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            res.body.should.have.property('payload').eql([]);
            cb();
          }),
      // 2nd step: submitting a peer review for the pitch
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post('/api/pitch/5fda324aee1965396cadd0d3/review')
          .set({ AuthToken: initSpec.getFounder().token })
          .send({
            feedback: 'Pitch feedback',
            rate: [
              { reviewCategoryId: '6008058be5dfd407004b9600', reviewRating: 10 },
              { reviewCategoryId: '6008058be5dfd407004b9601', reviewRating: 8 },
              { reviewCategoryId: '6008058be5dfd407004b9602', reviewRating: 3 },
            ],
          })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;

            reviewId = payload.id;
            payload.should.have.property('avgRate').eql(7);
            payload.should.have.property('feedback').eql('Pitch feedback');
            payload.rate.should.have.lengthOf(3);
            payload.should.have.property('userId').eql(initSpec.getFounder().id);

            cb();
          }),
      // 3rd step: checking reviews one more time, there should be one available
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get('/api/pitch/5fda324aee1965396cadd0d3/reviews?sub=true')
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            res.body.payload.should.have.lengthOf(1);
            cb();
          }),
      // 4th step: checking review by its ID
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/pitch/5fda324aee1965396cadd0d3/review/${reviewId}`)
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;

            reviewId = payload.id;
            payload.should.have.property('avgRate').eql(7);
            payload.should.have.property('feedback').eql('Pitch feedback');
            payload.rate.should.have.lengthOf(3);
            payload.should.have.property('userId').eql(initSpec.getFounder().id);

            cb();
          }),
    ],
    done,
  );
});

it('different founders submit peer review for the pitch', (done) => {
  let reviewId = null;
  async.waterfall(
    [
      // 1st step: checking reviews submitted on the pitch, initially there should be none of them
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get('/api/pitch/5fda324aee1965396cadd0d3/reviews')
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            res.body.should.have.property('payload').eql([]);
            cb();
          }),
      // 2nd step: submitting a peer review for the pitch
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post('/api/pitch/5fda324aee1965396cadd0d3/review')
          .set({ AuthToken: initSpec.getFounder().token })
          .send({
            feedback: 'Pitch feedback',
            rate: [
              { reviewCategoryId: '6008058be5dfd407004b9600', reviewRating: 10 },
              { reviewCategoryId: '6008058be5dfd407004b9601', reviewRating: 8 },
              { reviewCategoryId: '6008058be5dfd407004b9602', reviewRating: 3 },
            ],
          })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb();
          }),
      // 3rd step: submitting a 2nd peer review for the pitch
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post('/api/pitch/5fda324aee1965396cadd0d3/review')
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .send({
            feedback: 'Pitch feedback 2',
            rate: [
              { reviewCategoryId: '6008058be5dfd407004b9600', reviewRating: 4 },
              { reviewCategoryId: '6008058be5dfd407004b9601', reviewRating: 5 },
              { reviewCategoryId: '6008058be5dfd407004b9602', reviewRating: 7 },
            ],
          })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb();
          }),
      // 4th step: checking reviews one more time, there should be two available
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get('/api/pitch/5fda324aee1965396cadd0d3/reviews')
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            res.body.payload.should.have.lengthOf(2);
            cb();
          }),
      // 5th step: checking pitch avg rating
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/pitch/5fda324aee1965396cadd0d3`)
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            let payload = res.body.payload;
            payload.should.have.property('avgRate').eql(6.17);
            cb();
          }),
      // 6th step: checking business idea avg rating
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/business-idea/5fd68a71da1aa9e14920723e`)
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            let payload = res.body.payload;
            payload.should.have.property('latestAvgPitchRating').eql(6.17);
            cb();
          }),
    ],
    done,
  );
});

it('User can not multiple reviews for the same pitch', (done) => {
  async.waterfall(
    [
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post('/api/pitch/1cba324aee1965396cabb012/review')
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .send({
            feedback: 'Pitch feedback 1',
            rate: [{ reviewCategoryId: '6008058be5dfd407004b9600', reviewRating: 10 }],
          })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post('/api/pitch/1cba324aee1965396cabb012/review')
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .send({
            feedback: 'Pitch feedback 2',
            rate: [{ reviewCategoryId: '6008058be5dfd407004b9600', reviewRating: 8 }],
          })
          .end((err, res) => {
            base.checkFailResponse(res, 406);
            cb();
          }),
    ],
    done,
  );
});

/**
 * Search pitches all - Admin only endpoint
 */

it('admin searches pitches by title', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?title=small+town`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have.property('userId').that.is.a('string');
      payload[0].should.have.property('businessIdeaId').that.is.a('string');
      payload[0].should.have
        .property('title')
        .eql('It is Spring, moonless night in the small town');
      done();
    });
});

it('admin searches pitches by title in french', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?title=galvanis+faux`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have
        .property('title')
        .eql('Quelques plaisanteries ont galvanisé le faux jury');
      done();
    });
});

it('admin searches pitches by language', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?language[]=en&language[]=fr`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(4);

      for (const e of payload) {
        e.should.have.property('language').to.contain.oneOf(['en', 'fr']);
      }

      done();
    });
});

it('admin searches pitches by title and by language with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?sub=true&title=small+town&language[]=en`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have.property('userId').that.is.an('object');
      payload[0].should.have.property('businessIdeaId').that.is.an('object');
      payload[0].should.have.property('language').eql('en');
      payload[0].should.have
        .property('title')
        .eql('It is Spring, moonless night in the small town');
      done();
    });
});

it('admin searches pitches by title', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?title=small+town`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have.property('userId').that.is.a('string');
      payload[0].should.have.property('businessIdeaId').that.is.a('string');
      payload[0].should.have
        .property('title')
        .eql('It is Spring, moonless night in the small town');
      done();
    });
});

it('admin searches pitches by title with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?sub=true&title=small+town`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have.property('userId').that.is.an('object');
      payload[0].should.have.property('businessIdeaId').that.is.an('object');
      payload[0].should.have
        .property('title')
        .eql('It is Spring, moonless night in the small town');
      done();
    });
});

it('admin searches pitches by user name with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?sub=true&name=clark`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have.property('userId');
      payload[0].userId.should.have.property('name', 'Clark');
      done();
    });
});

it('admin searches pitches by user surname with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?sub=true&surname=kent`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have.property('userId');
      payload[0].userId.should.have.property('surname', 'Kent');
      done();
    });
});

it('admin searches pitches by user email with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?sub=true&email=founder@`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(2);

      for (const e of payload) {
        e.should.have.property('userId');
        e.userId.should.have.property('email').to.contain('founder@');
      }

      done();
    });
});

it('admin searches pitches by user role with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?sub=true&role=founder`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(6);

      for (const e of payload) {
        e.should.have.property('userId');
        e.userId.should.have.property('role').to.eq('founder');
      }

      done();
    });
});

it('admin searches pitches by user name, surname, role with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?sub=true&name=clark&surname=kent&role=founder`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have.property('userId');
      payload[0].userId.should.have.property('role').to.eq('founder');
      payload[0].userId.should.have.property('name').to.eq('Clark');
      payload[0].userId.should.have.property('surname').to.eq('Kent');
      done();
    });
});

it('admin searches pitches by user ID with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?sub=true&userid=5fd61c19631e2d86c5ae9ce7`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(2);

      for (const e of payload) {
        e.should.have.property('userId').that.is.an('object');
        e.should.have.nested.property('userId.id').eql('5fd61c19631e2d86c5ae9ce7');
      }

      done();
    });
});

it('admin searches pitches by user ID', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?userid=5fd61c19631e2d86c5ae9ce7`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(2);

      for (const e of payload) {
        e.should.have.property('userId').to.eq('5fd61c19631e2d86c5ae9ce7');
        e.should.have
          .property('title')
          .to.contain.oneOf([
            'Soaring through all the galaxies',
            'Few quips galvanized the mock jury box',
            'Pitch reviewing forbidden by group reviewers limit',
          ]);
      }

      done();
    });
});

it('admin searches pitches by business idea title with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?sub=true&businessideatitle=tenanted`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have.property('businessIdeaId').that.is.an('object');
      payload[0].businessIdeaId.should.have
        .property('title')
        .to.eq('Business idea 2 of a tenanted founder user 1');
      done();
    });
});

it('admin searches pitches by business idea ID with sub flag', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?sub=true&businessideaid=5fd68a71da1aa9e149207241`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have.property('businessIdeaId').that.is.an('object');
      payload[0].businessIdeaId.should.have.property('id').eql('5fd68a71da1aa9e149207241');
      done();
    });
});

it('admin searches pitches by business idea ID', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/search/all?businessideaid=5fd68a71da1aa9e149207241`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have.property('businessIdeaId').eql('5fd68a71da1aa9e149207241');
      done();
    });
});

it('Find users active pitched', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/${initSpec.getFounder().id}/active`)
    .set({ AuthToken: initSpec.getSecondFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].should.have.property('id').eql('5fda324aee1965396cadd0d5');
      payload[0].should.have.property('title').eql('Few quips galvanized the mock jury box');
      done();
    });
});
