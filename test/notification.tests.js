const chai = require('chai');
const chaiHttp = require('chai-http');
const _ = require('lodash');
chai.use(chaiHttp);
const initSpec = require('./init.spec');
const base = require('./helpers/base');
const async = require('async');
const { notificationTypes, notificationStatus, actionStatuses } = require('../config/notification');

const AcceptRequestPayload = { value: 'https://link.to.pdf' };

/**
 * Permission checks
 */

it('firebase token is required to get notification', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/notification`)
    .end((err, res) => {
      base.checkFailResponse(res, 401);
      done();
    });
});

/**
 * Functional checks
 */

it('Get all notifications', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/notification`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);
      let payload = res.body.payload;
      payload.should.have.lengthOf(3);
      chai.assert.equal(res.body.badgeCount, 3);
      payload[0].should.have.property('message').eql('investor first wants to be your mentor');
      done();
    });
});

it('Update notification action not found', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/notification/${initSpec.getMentor().id}/accepted`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkFailResponse(res, 404);
      done();
    });
});

it('Accept pitch deck request', (done) => {
  async.waterfall(
    [
      // 1st step: create pitch deck request
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put(`/api/pitch/5fda324aee1965396cadd0d3/deck/request`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getSecondFounder().id);
            payload.should.have.property('type').eql(notificationTypes.PITCH_DECK_REQUEST_SENT);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            payload.referenceObject.should.have.property('reference');
            cb();
          }),
      // 2nd Step: Check the notifications are correct
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getSecondFounder().id);
            payload.should.have.property('type').eql(notificationTypes.PITCH_DECK_REQUEST_SENT);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getSecondFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have.property('type').eql(notificationTypes.PITCH_DECK_REQUEST);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            payload.should.have.property('actionStatus').eql(actionStatuses.REQUIRED);
            cb(null, payload.id);
          }),

      // 3rd step: Accept pitch deck request as founder
      (notificationId, cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/notification/${notificationId}/accepted`)
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .send(AcceptRequestPayload)
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getSecondFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.PITCH_DECK_REQUEST_ACCEPTED_CONFIRMATION);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      // 4th Step: Check the notification lists are correct
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getSecondFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.PITCH_DECK_REQUEST_ACCEPTED_CONFIRMATION);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getSecondFounder().id);
            payload.should.have.property('type').eql(notificationTypes.PITCH_DECK_REQUEST_ACCEPTED);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            payload.payload.should.have.property('value').eql(AcceptRequestPayload.value);

            payload = res.body.payload[1];
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getSecondFounder().id);
            payload.should.have.property('type').eql(notificationTypes.PITCH_DECK_REQUEST_SENT);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);

            cb();
          }),
    ],
    done,
  );
});

it('Reject pitch deck request', (done) => {
  async.waterfall(
    [
      // 1st step: create connection as founder
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put(`/api/pitch/5fda324aee1965396cadd0d3/deck/request`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getSecondFounder().id);
            payload.should.have.property('type').eql(notificationTypes.PITCH_DECK_REQUEST_SENT);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            payload.referenceObject.should.have.property('reference');
            cb();
          }),
      // 2nd Step: Check the notifications are correct
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getSecondFounder().id);
            payload.should.have.property('type').eql(notificationTypes.PITCH_DECK_REQUEST_SENT);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getSecondFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have.property('type').eql(notificationTypes.PITCH_DECK_REQUEST);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            payload.should.have.property('actionStatus').eql(actionStatuses.REQUIRED);
            cb(null, payload.id);
          }),
      // 3rd step: Reject pitch deck request as founder
      (notificationId, cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/notification/${notificationId}/rejected`)
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .send(AcceptRequestPayload)
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getSecondFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.PITCH_DECK_REQUEST_REJECTED_CONFIRMATION);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      // 4th Step: Check the notification lists are correct
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getSecondFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.PITCH_DECK_REQUEST_REJECTED_CONFIRMATION);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getSecondFounder().id);
            payload.should.have.property('type').eql(notificationTypes.PITCH_DECK_REQUEST_REJECTED);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);

            payload = res.body.payload[1];
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getSecondFounder().id);
            payload.should.have.property('type').eql(notificationTypes.PITCH_DECK_REQUEST_SENT);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);

            cb();
          }),
    ],
    done,
  );
});

it('Accept notification action not owned', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/notification/60facde23a3c4df582f5940b/accepted`)
    .set({ AuthToken: initSpec.getFounder().token })
    .send(AcceptRequestPayload)
    .end((err, res) => {
      base.checkFailResponse(res, 403);
      done();
    });
});

it('Unknown response notification action', (done) => {
  chai
    .request(initSpec.getServer())
    .post(`/api/notification/60facde23a3c4df582f5940a/garbage`)
    .set({ AuthToken: initSpec.getFounder().token })
    .send(AcceptRequestPayload)
    .end((err, res) => {
      base.checkFailResponse(res, 422);
      done();
    });
});

it('Duplicate pitch deck request', (done) => {
  async.waterfall(
    [
      // 1st step: create pitch deck request
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put(`/api/pitch/5fda324aee1965396cadd0d3/deck/request`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getSecondFounder().id);
            payload.should.have.property('type').eql(notificationTypes.PITCH_DECK_REQUEST_SENT);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            payload.referenceObject.should.have.property('reference');
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put(`/api/pitch/5fda324aee1965396cadd0d3/deck/request`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkFailResponse(res, 422);
            cb();
          }),
      // 2nd Step: Check the notifications are correct
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getSecondFounder().id);
            payload.should.have.property('type').eql(notificationTypes.PITCH_DECK_REQUEST_SENT);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getSecondFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have.property('type').eql(notificationTypes.PITCH_DECK_REQUEST);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            payload.should.have.property('actionStatus').eql(actionStatuses.REQUIRED);
            cb(null, payload.id);
          }),

      // 3rd step: Accept pitch deck request as founder
      (notificationId, cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/notification/${notificationId}/accepted`)
          .set({ AuthToken: initSpec.getSecondFounder().token })
          .send(AcceptRequestPayload)
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getSecondFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.PITCH_DECK_REQUEST_ACCEPTED_CONFIRMATION);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
    ],
    done,
  );
});

it('Mark as read', (done) => {
  async.waterfall(
    [
      (cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/notification/60facde23a3c4df582f5940c/read`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);
            let payload = res.body.payload;
            payload.should.have.property('status').eql('read');
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            chai.assert.equal(res.body.badgeCount, 1);
            payload.should.have.lengthOf(3);
            payload[0].should.have.property('status').eql(notificationStatus.UNREAD);
            payload[1].should.have.property('status').eql(notificationStatus.READ);
            payload[2].should.have.property('status').eql(notificationStatus.READ);
            cb(null, payload.id);
          }),
    ],
    done,
  );
});
