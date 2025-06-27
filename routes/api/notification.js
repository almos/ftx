const router = require('express').Router();

const authn = require('../auth/authn');
const authz = require('../auth/authz');
const logger = require('../../services/logger').instance;
const validate = require('../validate');
const objects = require('../../config/security').objects;
const acl = require('../../config/security').permissions;
const baseHandler = require('./base');
const _ = require('lodash');
const notificationService = require('../../services/notification');
const processMentorConnectionResponse = require('../../services/user-connection')
  .processMentorConnectionResponse;
const processPitchDeckRequestResponse = require('../../services/pitch')
  .processPitchDeckRequestResponse;
const { processUserMeetingRequestResponse } = require('../../services/user');
const errors = require('../../services/error');
const {
  notificationTypes,
  actionStatuses,
  actionResponseList,
  notificationStatus,
} = require('../../config/notification');

router.get(
  '/',
  [
    authn.firebase,
    validate.request,

    // rbac check
    authz.check(acl.READ_OWN, objects.NOTIFICATION),
  ],
  async function (req, res, next) {
    let currentUser = req.locals.user_object,
      paging = baseHandler.processPage(req);

    logger.info(`Got request to get all notifications for user: ${currentUser.email}`);

    try {
      notificationService
        .findAllPaginated(currentUser, paging.skip, paging.pageSize)
        .then((result) => {
          let objects = _.map(result.objects, function (item) {
            return item.filterOut(currentUser);
          });
          result.paging.pageSize = paging.pageSize;

          res.json({ payload: objects, paging: result.paging, badgeCount: result.badgeCount });
        });
    } catch (error) {
      baseHandler.handleError(
        error,
        `Get notification list: ${currentUser.email} has failed`,
        next,
      );
    }
  },
);

/**
 * Reads all notifications from given id's date
 */
router.post(
  '/:notificationId/read',
  [
    authn.firebase,
    validate.request,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.NOTIFICATION),
  ],
  function (req, res, next) {
    let currentUser = req.locals.user_object,
      notificationId = req.params.notificationId;
    logger.info(
      `Got request to update read status for notification and all before it from: ${currentUser.email}`,
    );

    return notificationService
      .updateNotificationsAsRead(currentUser, notificationId)
      .then((result) => {
        res.json({ payload: result.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Set notification status to read notification: ${notificationId} and all before it for user ${currentUser.email} has failed`,
          next,
        );
      });
  },
);

router.post(
  '/:notificationId/:actionResponse',
  [
    authn.firebase,
    validate.request,

    // rbac check
    authz.check(acl.UPDATE_OWN, objects.NOTIFICATION),
  ],
  async function (req, res, next) {
    let currentUser = req.locals.user_object,
      notificationId = req.params.notificationId,
      actionResponse = req.params.actionResponse;

    logger.info(`Got request to update action notification: ${notificationId}`);

    updateActionNotification(currentUser, notificationId, actionResponse, req.body)
      .then((result) => {
        return res.json({ payload: result.filterOut(currentUser) });
      })
      .catch((error) => {
        baseHandler.handleError(
          error,
          `Response to this action notification for user ${currentUser.email} has failed`,
          next,
        );
      });
  },
);

function updateActionNotification(user, notificationId, actionResponse, payload) {
  let promise;
  return notificationService.findById(notificationId).then((notification) => {
    if (user.id != notification.userId) {
      throw new errors.PermissionAccessViolation(
        'User does not have permission to perform this action.',
      );
    } else if (notification.actionStatus !== actionStatuses.REQUIRED) {
      throw new errors.InvalidArgumentError('This notification does not require an action');
    } else if (!actionResponseList.includes(actionResponse)) {
      throw new errors.InvalidArgumentError(
        `Notification response: ${actionResponse} is not valid`,
      );
    }

    switch (notification.type) {
      case notificationTypes.CONNECTION_REQUEST_MENTOR:
        promise = processMentorConnectionResponse(user, notification, actionResponse);
        break;
      case notificationTypes.PITCH_DECK_REQUEST:
        promise = processPitchDeckRequestResponse(user, notification, actionResponse, payload);
        break;
      case notificationTypes.MEETING_REQUEST:
        promise = processUserMeetingRequestResponse(user, notification, actionResponse);
        break;
      default:
        throw new errors.InvalidArgumentError('This notification type is not supported');
    }

    return promise.then((result) => {
      return notificationService
        .updateNotification(user, notificationId, {
          actionStatus: actionResponse,
          status: notificationStatus.READ,
          deleted: true,
        })
        .then(() => {
          return result;
        });
    });
  });
}

module.exports = router;
