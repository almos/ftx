const base = require('./base');
const initSpec = require('../init.spec');
const _ = require('lodash');
const async = require('async');

function createPitch(chai, pitchPayload, user, cb) {
  chai
    .request(initSpec.getServer())
    .put('/api/pitch')
    .set({ AuthToken: user.token })
    .send(pitchPayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('id');
      payload.should.have.property('userId').eql(user.id);
      payload.should.have.property('businessIdeaId').eql(pitchPayload.businessIdeaId);
      payload.should.have.property('title').eql(pitchPayload.title);
      payload.should.have.property('tags').eql(pitchPayload.tags);
      payload.should.have.property('description').eql(pitchPayload.description);

      payload.should.have.property('active').eql(false);
      payload.should.have.property('deleted').eql(false);
      payload.should.have.property('private').eql(false);
      payload.should.have.property('reviewed').eql(false);
      payload.should.have.property('rejected').eql(false);
      payload.should.have.property('reviewsCount').eql(0);

      payload.should.not.have.property('rejectReason');
      payload.should.not.have.property('reviewedBy');
      payload.should.not.have.property('localVideoPath');
      payload.should.not.have.property('brightcove');
      payload.should.not.have.property('video');

      cb(payload);
    });
}

function updatePitch(chai, pitchId, pitchPayload, user, cb) {
  chai
    .request(initSpec.getServer())
    .post(`/api/pitch/${pitchId}`)
    .set({ AuthToken: user.token })
    .send(pitchPayload)
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('title').eql(pitchPayload.title);
      payload.should.have.property('description').eql(pitchPayload.description);
      payload.should.have.property('tags').eql(pitchPayload.tags);

      cb(payload);
    });
}

function submitPitch(chai, pitchId, businessIdeaId, userId, cb) {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/${pitchId}/submit`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('id');
      payload.should.have.property('pitchId').eql(pitchId);
      payload.should.have.property('businessIdeaId').eql(businessIdeaId);
      payload.should.have.property('userId').eql(userId);

      cb();
    });
}

function verifyPitchCountIncrease(chai, user, pitch, expectedPitchCount, cb) {
  async.waterfall(
    [
      // first step: creating a pitch
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put('/api/pitch')
          .set({ AuthToken: user.token })
          .send(pitch)
          .end((err, res) => {
            base.checkSuccessResponse(res);
            cb(null, res.body.payload);
          }),
      // second step: checking if business idea's pitchCount has been incremented
      (pitch, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/business-idea/${pitch.businessIdeaId}`)
          .set({ AuthToken: initSpec.getAdmin().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('pitchCount').eql(expectedPitchCount);
            cb();
          }),
    ],
    cb,
  );
}

function submitPitchUserDoesntOwn(chai, pitchId, businessIdeaId, userId, cb) {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/${pitchId}/submit`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkFailResponse(res, 403, ['User does not have access to the requested resource']);
      cb();
    });
}

function revokePitch(chai, pitchId, cb) {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/${pitchId}/revoke`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      cb();
    });
}

function revokeInexistingPitch(chai, pitchId, cb) {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/${pitchId}/revoke`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkFailResponse(res, 404);
      cb();
    });
}

function trySubmittingDeletedPitch(chai, pitchId, businessIdeaId, userId, cb) {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/${pitchId}/submit`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkFailResponse(res, 406, ['Cannot submit deleted pitch']);
      cb();
    });
}

function trySubmittingRejectedPitch(chai, pitchId, businessIdeaId, userId, cb) {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/${pitchId}/submit`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkFailResponse(res, 406, ['Pitch has been already reviewed and rejected']);
      cb();
    });
}

function trySubmittingApprovedPitch(chai, pitchId, businessIdeaId, userId, cb) {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/${pitchId}/submit`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkFailResponse(res, 406, ['Pitch has been already reviewed']);
      cb();
    });
}

function validatePitchStatus(chai, pitchId, fields, cb) {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/${pitchId}`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;

      for (const [key, value] of Object.entries(fields)) {
        payload.should.have.property(key).eql(value);
      }

      cb();
    });
}

function validatePitchActiveStatus(chai, pitchId, shouldHaveStatus, cb) {
  validatePitchStatus(chai, pitchId, { active: shouldHaveStatus }, cb);
}

function validateBusinessIdeaPitchCount(chai, businessIdeaId, expectedPitchCount, user, cb) {
  chai
    .request(initSpec.getServer())
    .get(`/api/business-idea/${businessIdeaId}`)
    .set({ AuthToken: user.token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('pitchCount').eql(expectedPitchCount);
      cb();
    });
}

function deletePitch(chai, pitchId, cb) {
  chai
    .request(initSpec.getServer())
    .delete(`/api/pitch/${pitchId}`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.property('deleted').eql(true);

      cb(null, res.body.payload);
    });
}

function checkPitchIsInReviewQueue(chai, pitchId, shouldBeInQueue, cb) {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/unreviewed`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let expect = chai.expect;
      let payload = res.body.payload;

      let pitchIds = _.map(res.body.payload, function (v) {
        return v.pitchId.id;
      });

      if (shouldBeInQueue) {
        expect(pitchIds).to.include.members([pitchId]);
      } else {
        expect(pitchIds).to.not.have.members([pitchId]);
      }

      cb(null, res.body.payload);
    });
}

function approvePitchByAdmin(chai, pitchId, cb) {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/${pitchId}/approve`)
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      cb();
    });
}

function rejectPitchByAdmin(chai, pitchId, reason, cb) {
  chai
    .request(initSpec.getServer())
    .post(`/api/pitch/${pitchId}/reject`)
    .send({ rejectReason: reason })
    .set({ AuthToken: initSpec.getAdmin().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      cb();
    });
}

function tryApprovePitchByFounder(chai, pitchId, cb) {
  chai
    .request(initSpec.getServer())
    .get(`/api/pitch/${pitchId}/approve`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkFailResponse(res, 403);
      cb();
    });
}

function tryRejectPitchByFounder(chai, pitchId, cb) {
  chai
    .request(initSpec.getServer())
    .post(`/api/pitch/${pitchId}/reject`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkFailResponse(res, 403);
      cb();
    });
}

module.exports = {
  submitPitch: submitPitch,
  approvePitchByAdmin: approvePitchByAdmin,
  tryApprovePitchByFounder: tryApprovePitchByFounder,
  tryRejectPitchByFounder: tryRejectPitchByFounder,
  trySubmittingApprovedPitch: trySubmittingApprovedPitch,
  rejectPitchByAdmin: rejectPitchByAdmin,
  trySubmittingRejectedPitch: trySubmittingRejectedPitch,
  submitPitchUserDoesntOwn: submitPitchUserDoesntOwn,
  revokePitch: revokePitch,
  revokeInexistingPitch: revokeInexistingPitch,
  trySubmittingDeletedPitch: trySubmittingDeletedPitch,
  validatePitchActiveStatus: validatePitchActiveStatus,
  validatePitchStatus: validatePitchStatus,
  validateBusinessIdeaPitchCount: validateBusinessIdeaPitchCount,
  deletePitch: deletePitch,
  checkPitchIsInReviewQueue: checkPitchIsInReviewQueue,
  createPitch: createPitch,
  updatePitch: updatePitch,
  verifyPitchCountIncrease: verifyPitchCountIncrease,
};
