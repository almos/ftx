const chai = require('chai');
const chaiHttp = require('chai-http');
const initSpec = require('./init.spec');
const async = require('async');
const base = require('./helpers/base');
const _ = require('lodash');

chai.use(chaiHttp);

/**
 * Functional checks
 */

const existFirstPitchId = '5fda324aee1965396cadd0d4',
  existsFirstPitchReviewId = 'aaaa324aee1965396cadd000',
  existSecondPitchId = '1cba324aee1965396cabb012',
  existsSecondPitchReviewId = 'bbbb324aee1965396cadd111',
  existThirdPitchId = '5fda324aee1965396cadd0d1',
  existsThirdPitchReviewId = 'bbbb324aee1965396cadd222';

/**
 * search criteria:
 * user.signupQuestion.answer: ['idea']
 * business-idea.stage: 'seed'
 * pitch.review.rate has two categories: ['problem','solution'] with rating under 3
 */
it('tenanted founder searches learning-content, for pitch ${existThirdPitchId} review ${existsThirdPitchReviewId}', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/match/learning-content/${existFirstPitchId}/${existsFirstPitchReviewId}`)
    .set({ AuthToken: initSpec.getTenantedFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(2);

      for (const e of payload) {
        e.should.have.property('metadata').that.is.an('object');
        e.metadata.should.have.property('evaluationCriteria').that.is.an('array');
        e.metadata.should.have.property('stage').that.is.an('array');
        for (const v of e.metadata.evaluationCriteria) {
          v.should.to.contain.oneOf(['problem', 'solution', 'purpose']);
        }
        for (const v of e.metadata.stage) {
          v.should.to.contain.oneOf(['idea', 'seed']);
        }
      }
      done();
    });
});

/**
 * search criteria:
 * user.signupQuestion.answer: ['idea']
 * business-idea.stage: 'idea'
 * pitch.review.rate has category: ['problem'] with rating equal 3
 */
it('search learning content', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/match/learning-content/${existSecondPitchId}/${existsSecondPitchReviewId}`)
    .set({ AuthToken: initSpec.getSecondFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);

      for (const e of payload) {
        e.should.have.property('metadata').that.is.an('object');
        e.metadata.should.have.property('evaluationCriteria').that.is.an('array');
        e.metadata.should.have.property('stage').that.is.an('array');
        for (const v of e.metadata.evaluationCriteria) {
          v.should.to.contain.oneOf(['problem']);
        }
        for (const v of e.metadata.stage) {
          v.should.to.contain.oneOf(['idea', 'seed']);
        }
      }
      done();
    });
});

/**
 * search criteria:
 * 1) pitches business-idea don't have stage
 * 2) user who owns this pith don't have signupQuestion with type myStage
 * 3) pitch.review.rate.reviewRating > 3
 */
it(`founder searches learning-content, for pitch ${existThirdPitchId} review ${existsThirdPitchReviewId}`, (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/match/learning-content/${existThirdPitchId}/${existsThirdPitchReviewId}`)
    .set({ AuthToken: initSpec.getSecondFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(0);
      done();
    });
});
