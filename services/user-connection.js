const mongoose = require('mongoose');
const UserConnection = mongoose.model('UserConnection');
const genericDal = require('./dal/generic');
const userService = require('./user');
const {
  NotificationBuilder,
  createNotificationWithConfirmation,
  checkActionNotificationNotExist,
} = require('./notification');
const logger = require('./logger').instance;
const errors = require('./error');
const { userConnectionTypes } = require('../config/user-connection');
const { actionResponses, notificationTypes } = require('../config/notification');
const roles = require('../config/security').userRoles;

const buildConnectionObject = (userId, otherUserId, type) => {
  return {
    users: [userId, otherUserId],
    type: type,
  };
};

function validateCreateMentorConnection(user, otherUser, type) {
  return (
    type === userConnectionTypes.MENTOR && // Makes sure only mentor and founder can connect using mentor connection type
    ((user.role === roles.FOUNDER && otherUser.role === roles.MENTOR) ||
      (user.role === roles.MENTOR && otherUser.role === roles.FOUNDER))
  );
}

/*function validateCreateInvestorConnection(user, otherUser, type) {
  return (
    type === userConnectionTypes.INVESTOR && // Makes sure only investor and founder can connect using mentor connection type
    ((user.role === roles.FOUNDER && otherUser.role === roles.INVESTOR) ||
      (user.role === roles.INVESTOR && otherUser.role === roles.FOUNDER))
  );
}

function validateCreateFounderConnection(user, otherUser, type) {
  return (
    type === userConnectionTypes.FOUNDER &&
    user.role === roles.FOUNDER &&
    otherUser.role === roles.FOUNDER
  );
}*/

function checkConnectionNotExist(user, otherUserId) {
  return genericDal
    .findOne(UserConnection, {
      $and: [{ users: user.id }, { users: otherUserId }],
    })
    .then(() => {
      const errorMessage =
        `User cannot create connection with user id: ${otherUserId}` +
        ` as there is an open connection between these users`;
      logger.error(`Connection creation for user ${user.email} failed: ${errorMessage}`);
      throw new errors.InvalidArgumentError(errorMessage);
    })
    .catch((error) => {
      if (error.code === 404) {
        return Promise.resolve();
      } else {
        return Promise.reject(error);
      }
    });
}

function createMentorRequestNotifications(user, otherUserId) {
  const isMentee = user.role === roles.FOUNDER;
  return checkConnectionNotExist(user, otherUserId)
    .then(() => {
      return checkActionNotificationNotExist(
        user,
        otherUserId,
        notificationTypes.CONNECTION_REQUEST_MENTOR,
      );
    })
    .then(() => {
      const requesteeNotification = new NotificationBuilder()
        .setUsers(otherUserId, user.id)
        .setType(notificationTypes.CONNECTION_REQUEST_MENTOR)
        .setTemplateKeyWithCondition(isMentee, notificationTypes.CONNECTION_REQUEST_MENTEE)
        .setActionRequired()
        .sendPushNotification();
      const requesterNotification = new NotificationBuilder()
        .setUsers(user.id, otherUserId)
        .setType(notificationTypes.CONNECTION_REQUEST_MENTOR_SENT)
        .setTemplateKeyWithCondition(isMentee, notificationTypes.CONNECTION_REQUEST_MENTEE_SENT);
      return createNotificationWithConfirmation(requesteeNotification, requesterNotification);
    });
}

function createConnectionRequest(user, otherUserId, type) {
  if (user.id == otherUserId) {
    const errorMessage = `User cannot create ${type} connection with themselves`;
    logger.error(`Connection creation for user ${user.email} failed: ${errorMessage}`);
    throw new errors.InvalidArgumentError(errorMessage);
  }
  return userService
    .findById(otherUserId)
    .then((otherUser) => {
      if (validateCreateMentorConnection(user, otherUser, type)) {
        return otherUser;
      } else {
        const errorMessage = `User with role: ${user.role} cannot create ${type} connection with users with role: ${otherUser.role}`;
        logger.error(`Connection accept for user ${user.email} failed: ${errorMessage}`);
        throw new errors.InvalidArgumentError(errorMessage);
      }
    })
    .then(() => createMentorRequestNotifications(user, otherUserId));
}

function createConnection(user, otherUserId, type) {
  return checkConnectionNotExist(user, otherUserId).then(() => {
    return genericDal.createOne(UserConnection, buildConnectionObject(otherUserId, user.id, type));
  });
}

function processMentorConnectionResponse(user, notification, response) {
  const requesterNotification = new NotificationBuilder().setUsers(notification.createdBy, user.id);
  const requesteeNotification = new NotificationBuilder().setUsers(user.id, notification.createdBy);
  const isMentee = user.role === roles.MENTOR;
  if (response === actionResponses.ACCEPTED) {
    return createConnection(user, notification.createdBy, userConnectionTypes.MENTOR).then(() => {
      return createNotificationWithConfirmation(
        requesterNotification
          .setType(notificationTypes.CONNECTION_REQUEST_MENTOR_ACCEPTED)
          .setTemplateKeyWithCondition(
            isMentee,
            notificationTypes.CONNECTION_REQUEST_MENTEE_ACCEPTED,
          )
          .sendPushNotification(),
        requesteeNotification
          .setType(notificationTypes.CONNECTION_MENTOR_ACCEPTED_CONFIRMATION)
          .setTemplateKeyWithCondition(
            isMentee,
            notificationTypes.CONNECTION_MENTEE_ACCEPTED_CONFIRMATION,
          ),
      );
    });
  } else if (response === actionResponses.REJECTED) {
    return createNotificationWithConfirmation(
      requesterNotification
        .setType(notificationTypes.CONNECTION_REQUEST_MENTOR_REJECTED)
        .setTemplateKeyWithCondition(
          isMentee,
          notificationTypes.CONNECTION_REQUEST_MENTEE_REJECTED,
        ),
      requesteeNotification
        .setType(notificationTypes.CONNECTION_MENTOR_REJECTED_CONFIRMATION)
        .setTemplateKeyWithCondition(
          isMentee,
          notificationTypes.CONNECTION_MENTEE_REJECTED_CONFIRMATION,
        ),
    );
  }
}

function findAllPaginatedImpl(user, query, skip, limit) {
  return genericDal.findAllPaginated(
    UserConnection,
    query,
    skip,
    limit,
    { createdAt: -1 },
    undefined,
    ['users'],
  );
}

function findConnections(user, connectionType, skip, limit) {
  let query = { users: user.id };
  if (connectionType) {
    query = { $and: [{ type: connectionType, ...query }] };
  }
  return findAllPaginatedImpl(user, query, skip, limit);
}

function findUsersConnections(user, otherUserId, connectionType, skip, limit) {
  let query = { users: otherUserId };
  if (connectionType) {
    query = { $and: [{ type: connectionType, ...query }] };
  }
  return findAllPaginatedImpl(user, query, skip, limit);
}

function findConnection(user, otherUserId) {
  return genericDal.findOne(UserConnection, { users: { $all: [user.id, otherUserId] } });
}

function deleteConnection(user, connectionId) {
  return genericDal
    .findOne(UserConnection, { _id: connectionId, users: user.id })
    .then(() => {
      return genericDal.deleteOne(UserConnection, connectionId);
    })
    .catch((errors) => {
      const errorMessage = `Cannot delete connection ${connectionId}`;
      logger.error(`Connection delete for user ${user.email} failed: ${errorMessage}`);
      throw new errors.IllegalStateError(errorMessage);
    });
}

module.exports = {
  createConnectionRequest: createConnectionRequest,
  processMentorConnectionResponse: processMentorConnectionResponse,
  findConnections: findConnections,
  findConnection: findConnection,
  findUsersConnections: findUsersConnections,
  deleteConnection: deleteConnection,
};
