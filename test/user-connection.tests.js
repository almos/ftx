const chai = require('chai');
const chaiHttp = require('chai-http');
const initSpec = require('./init.spec');
const async = require('async');
const base = require('./helpers/base');
const _ = require('lodash');
chai.use(chaiHttp);
const { userConnectionTypes } = require('../config/user-connection');
const { notificationTypes, notificationStatus, actionStatuses } = require('../config/notification');

/**
 * Permission checks
 */
it('firebase token is required to access user-connection creation endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .put('/api/connection/mentor/60fjasdfkasjfk43n')
    .end((err, res) => {
      res.should.have.status(401);
      done();
    });
});

it('firebase token is required to access user-connection get connections endpoint', (done) => {
  chai
    .request(initSpec.getServer())
    .get('/api/connection/')
    .end((err, res) => {
      res.should.have.status(401);
      done();
    });
});

it('Get mentors connections', (done) => {
  chai
    .request(initSpec.getServer())
    .put(`/api/connection/${initSpec.getMentor().id}/mentor-founder`)
    .end((err, res) => {
      res.should.have.status(401);
      done();
    });
});

/**
 * Functional checks
 */

it('Accept mentor-founder connection as mentor', (done) => {
  async.waterfall(
    [
      // 1st step: create connection as founder
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put(`/api/connection/${userConnectionTypes.MENTOR}/${initSpec.getMentor().id}`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_SENT);
            payload.should.have
              .property('templateKey')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTEE_SENT);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      // 2nd Step: Check the connected, incoming and outgoing lists are correct
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_SENT);
            payload.should.have
              .property('templateKey')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTEE_SENT);
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
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have.property('type').eql(notificationTypes.CONNECTION_REQUEST_MENTOR);
            payload.should.have
              .property('templateKey')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTEE);
            payload.should.have.property('message').eql('founder first wants to be your mentee');
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            payload.should.have.property('actionStatus').eql(actionStatuses.REQUIRED);
            cb(null, payload.id);
          }),

      // 3rd step: Accept connection as mentor
      (notificationId, cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/notification/${notificationId}/accepted`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_MENTOR_ACCEPTED_CONFIRMATION);
            payload.should.have
              .property('templateKey')
              .eql(notificationTypes.CONNECTION_MENTEE_ACCEPTED_CONFIRMATION);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      // 4th Step: Check the notification lists are correct
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_ACCEPTED);
            payload.should.have
              .property('templateKey')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTEE_ACCEPTED);
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
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_MENTOR_ACCEPTED_CONFIRMATION);
            payload.should.have
              .property('templateKey')
              .eql(notificationTypes.CONNECTION_MENTEE_ACCEPTED_CONFIRMATION);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);

            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/connection/${userConnectionTypes.MENTOR}`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.user.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have.property('type').eql(userConnectionTypes.MENTOR);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/connection/${userConnectionTypes.MENTOR}`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.user.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have.property('type').eql(userConnectionTypes.MENTOR);
            cb();
          }),
    ],
    done,
  );
});

it('Reject mentor-founder connection', (done) => {
  async.waterfall(
    [
      // 1st step: create connection as founder
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put(`/api/connection/${userConnectionTypes.MENTOR}/${initSpec.getMentor().id}`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_SENT);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      // 2nd Step: Check the connected, incoming and outgoing lists are correct
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_SENT);
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
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have.property('type').eql(notificationTypes.CONNECTION_REQUEST_MENTOR);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            payload.should.have.property('actionStatus').eql(actionStatuses.REQUIRED);
            cb(null, payload.id);
          }),

      // 3rd step: Reject connection as mentor
      (notificationId, cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/notification/${notificationId}/rejected`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_MENTOR_REJECTED_CONFIRMATION);
            cb();
          }),
      // 4th Step: Check the notification lists are correct
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_REJECTED);
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
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_MENTOR_REJECTED_CONFIRMATION);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);

            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/connection/${userConnectionTypes.MENTOR}`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            chai.assert.isEmpty(payload);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/connection/${userConnectionTypes.MENTOR}`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.lengthOf(1);
            cb();
          }),
    ],
    done,
  );
});

it('Accept mentor-founder connection as founder', (done) => {
  async.waterfall(
    [
      // 1st step: create connection as founder
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put(`/api/connection/${userConnectionTypes.MENTOR}/${initSpec.getFounder().id}`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_SENT);
            payload.should.not.have.property('templateKey');
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      // 2nd Step: Check the connected, incoming and outgoing lists are correct
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_SENT);
            payload.should.not.have.property('templateKey');
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have.property('type').eql(notificationTypes.CONNECTION_REQUEST_MENTOR);
            payload.should.not.have.property('templateKey');
            payload.should.have.property('message').eql('Bill Gates wants to be your mentor');
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            payload.should.have.property('actionStatus').eql(actionStatuses.REQUIRED);
            cb(null, payload.id);
          }),

      // 3rd step: Accept connection as founder
      (notificationId, cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/notification/${notificationId}/accepted`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_MENTOR_ACCEPTED_CONFIRMATION);
            payload.should.not.have.property('templateKey');
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      // 4th Step: Check the notification lists are correct
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_ACCEPTED);
            payload.should.not.have.property('templateKey');
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_MENTOR_ACCEPTED_CONFIRMATION);
            payload.should.not.have.property('templateKey');
            payload.should.have.property('status').eql(notificationStatus.UNREAD);

            payload = res.body.payload[1];
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getInvestor().id);
            payload.should.have.property('type').eql(notificationTypes.CONNECTION_REQUEST_MENTOR);
            payload.should.not.have.property('templateKey');
            payload.should.have.property('status').eql(notificationStatus.UNREAD);

            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/connection/${userConnectionTypes.MENTOR}`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.user.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have.property('type').eql(userConnectionTypes.MENTOR);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/connection/${userConnectionTypes.MENTOR}`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.user.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have.property('type').eql(userConnectionTypes.MENTOR);
            cb();
          }),
    ],
    done,
  );
});

it('Reject mentor-founder connection', (done) => {
  async.waterfall(
    [
      // 1st step: create connection as founder
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put(`/api/connection/${userConnectionTypes.MENTOR}/${initSpec.getMentor().id}`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_SENT);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      // 2nd Step: Check the connected, incoming and outgoing lists are correct
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_SENT);
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
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have.property('type').eql(notificationTypes.CONNECTION_REQUEST_MENTOR);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            payload.should.have.property('actionStatus').eql(actionStatuses.REQUIRED);
            cb(null, payload.id);
          }),

      // 3rd step: Reject connection as mentor
      (notificationId, cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/notification/${notificationId}/rejected`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_MENTOR_REJECTED_CONFIRMATION);
            cb();
          }),
      // 4th Step: Check the notification lists are correct
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_REJECTED);
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
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_MENTOR_REJECTED_CONFIRMATION);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/connection/${userConnectionTypes.MENTOR}`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            chai.assert.isEmpty(payload);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/connection/${userConnectionTypes.MENTOR}`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.lengthOf(1);
            cb();
          }),
    ],
    done,
  );
});

it('Duplicate mentor-founder connection', (done) => {
  async.waterfall(
    [
      // 1st step: create connection as mentor
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put(`/api/connection/${userConnectionTypes.MENTOR}/${initSpec.getFounder().id}`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_SENT);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put(`/api/connection/${userConnectionTypes.MENTOR}/${initSpec.getFounder().id}`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkFailResponse(res, 422);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put(`/api/connection/${userConnectionTypes.MENTOR}/${initSpec.getMentor().id}`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkFailResponse(res, 422);
            cb();
          }),
      // 2nd Step: Check the connected, incoming and outgoing lists are correct
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_SENT);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have.property('type').eql(notificationTypes.CONNECTION_REQUEST_MENTOR);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            payload.should.have.property('actionStatus').eql(actionStatuses.REQUIRED);
            cb(null, payload.id);
          }),

      // 3rd step: Accept connection as mentor
      (notificationId, cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/notification/${notificationId}/accepted`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkFailResponse(res, 403);
            cb(null, notificationId);
          }),
      // 4th Step: Check the notification lists are correct
      (notificationId, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have.property('type').eql(notificationTypes.CONNECTION_REQUEST_MENTOR);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);
            payload.should.have.property('actionStatus').eql(actionStatuses.REQUIRED);
            cb(null, notificationId);
          }),
      (notificationId, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_SENT);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);

            cb(null, notificationId);
          }),
      (notificationId, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/connection/${userConnectionTypes.MENTOR}`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            chai.assert.isEmpty(payload);
            cb(null, notificationId);
          }),
      (notificationId, cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/connection/${userConnectionTypes.MENTOR}`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.lengthOf(1);
            cb(null, notificationId);
          }),
      // 4th step: Accept connection as founder
      (notificationId, cb) =>
        chai
          .request(initSpec.getServer())
          .post(`/api/notification/${notificationId}/accepted`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload;
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_MENTOR_ACCEPTED_CONFIRMATION);
            cb();
          }),
      // Check lists are correct
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/notification`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.should.have.property('userId').eql(initSpec.getFounder().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_MENTOR_ACCEPTED_CONFIRMATION);
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
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_ACCEPTED);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);

            payload = res.body.payload[1];
            payload.should.have.property('userId').eql(initSpec.getMentor().id);
            payload.createdBy.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have
              .property('type')
              .eql(notificationTypes.CONNECTION_REQUEST_MENTOR_SENT);
            payload.should.have.property('status').eql(notificationStatus.UNREAD);

            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/connection/${userConnectionTypes.MENTOR}`)
          .set({ AuthToken: initSpec.getFounder().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.user.should.have.property('id').eql(initSpec.getMentor().id);
            payload.should.have.property('type').eql(userConnectionTypes.MENTOR);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .get(`/api/connection/${userConnectionTypes.MENTOR}`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkSuccessResponse(res);

            let payload = res.body.payload[0];
            payload.user.should.have.property('id').eql(initSpec.getFounder().id);
            payload.should.have.property('type').eql(userConnectionTypes.MENTOR);
            cb();
          }),
      (cb) =>
        chai
          .request(initSpec.getServer())
          .put(`/api/connection/${userConnectionTypes.MENTOR}/${initSpec.getFounder().id}`)
          .set({ AuthToken: initSpec.getMentor().token })
          .end((err, res) => {
            base.checkFailResponse(res, 422);
            cb();
          }),
    ],
    done,
  );
});

it('Get mentors connections', (done) => {
  chai
    .request(initSpec.getServer())
    .get(`/api/connection/${initSpec.getMentor().id}/mentor-founder`)
    .set({ AuthToken: initSpec.getFounder().token })
    .end((err, res) => {
      base.checkSuccessResponse(res);

      let payload = res.body.payload;
      payload.should.have.lengthOf(1);
      payload[0].user.should.have.property('id').eql('5fd61c19631e2d86c5ae9cf0');
      payload[0].should.have.property('type').eql(userConnectionTypes.MENTOR);
    });
  done();
});

it('Create mentor connection type between mentor and themselves', (done) => {
  chai
    .request(initSpec.getServer())
    .put(`/api/connection/mentor-founder/${initSpec.getMentor().id}`)
    .set({ AuthToken: initSpec.getMentor().token })
    .end((err, res) => {
      base.checkFailResponse(res, 422);
    });
  done();
});

it('Create mentor connection type between mentor and investor', (done) => {
  chai
    .request(initSpec.getServer())
    .put(`/api/connection/mentor-founder/${initSpec.getInvestor().id}`)
    .set({ AuthToken: initSpec.getMentor().token })
    .end((err, res) => {
      base.checkFailResponse(res, 422);
    });
  done();
});

it('Create investor connection type between mentor and investor', (done) => {
  chai
    .request(initSpec.getServer())
    .put(`/api/connection/investor-founder/${initSpec.getInvestor().id}`)
    .set({ AuthToken: initSpec.getMentor().token })
    .end((err, res) => {
      base.checkFailResponse(res, 422);
    });
  done();
});
