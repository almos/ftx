const mongoose = require('mongoose');
const Notification = mongoose.model('Notification');
const UserSchema = mongoose.model('User');
const genericDal = require('./dal/generic');
const systemConfigService = require('./system-config');
const _ = require('lodash');
const errors = require('./error');

const {
  notificationStatus,
  templateGroupKey,
  pushTemplateGroupKey,
  notificationTypesList,
  actionStatuses,
} = require('../config/notification');
const logger = require('./logger').instance;
const firebase = require('./firebase');
const mustache = require('mustache');

function buildTemplateKey(groupKey, notification) {
  const key = notification.templateKey || notification.type;
  return `${groupKey}:${key}`;
}

function checkActionNotificationNotExist(user, otherUserId, responderNotificationType) {
  return findOneByUsersTypeAndActionStatus(
    user,
    otherUserId,
    responderNotificationType,
    actionStatuses.REQUIRED,
  )
    .then(() => {
      const errorMessage =
        `User with id: ${user.id} cannot create request with user id: ${otherUserId}` +
        ` as there is an open request between these users`;
      logger.error(`Request creation for user ${user.email} failed: ${errorMessage}`);
      throw new errors.InvalidArgumentError(errorMessage);
    })
    .catch((error) => {
      if (error instanceof errors.EntityNotFoundError) {
        return Promise.resolve();
      } else {
        return Promise.reject(error);
      }
    });
}

function createNotification(notification) {
  if (!notificationTypesList.includes(notification.notification.type)) {
    throw errors.InvalidArgumentError(
      `The notification type: ${notification.notification.type} is not supported`,
    );
  }
  return genericDal
    .createOne(Notification, notification.notification)
    .then((result) => {
      return genericDal.findOne(Notification, { _id: result.id }, undefined, [
        'userId',
        'createdBy',
        'referenceId',
      ]);
    })
    .then(async (notificationPopulated) => {
      // Prepare object to be sent
      attachFilters(notificationPopulated);
      notification.notification = notificationPopulated;
      notification.notification.message = await populateMessageWithBuilder(
        notification,
        templateGroupKey,
      );
      if (notification.pushNotification.sendPushNotification) {
        let message = await populateMessageWithBuilder(notification, pushTemplateGroupKey);
        notification.pushNotification.setBody(message);
        /*const imageUrl = notification.notification.createdBy.avatarUrl;
        if (!notification.pushNotification.imageUrl && imageUrl) {
          notification.pushNotification.setImage(imageUrl);
        }*/
      }
    })
    .then(() => {
      const user = notification.notification.userId;
      notification.notification.userId = user.id;
      return pushNotificationToDevice(user, notification);
    })
    .then(() => {
      return notification.notification;
    });
}

function populateMessageWithBuilder(notificationBuilder, groupKey) {
  return populateMessage(
    notificationBuilder.notification.userId,
    notificationBuilder.notification,
    groupKey,
  );
}
function populateMessage(user, notification, groupKey) {
  return systemConfigService
    .findByItemKeyAndLocale(buildTemplateKey(groupKey, notification), user.language)
    .then((templateConfig) => {
      const template = templateConfig.value;
      return mustache.render(template, notification);
    })
    .catch((error) => {
      if (error instanceof errors.EntityNotFoundError) {
        logger.error(
          `Notification template not found: ${buildTemplateKey(
            groupKey,
            notification,
          )} for language: ${user.language}`,
        );
      } else {
        throw error;
      }
    });
}

async function pushNotificationToDevice(user, notification) {
  return firebase
    .pushNotificationToDevice(
      user,
      notification.notification,
      notification.pushNotification,
      await countUnreadNotifications(user),
    )
    .catch((error) => {
      logger.log(
        `Unable to push notification to the user ${user.id} devices. Error: ${error.message}`,
      );
      return Promise.resolve();
    });
}

function createNotificationWithConfirmation(notification, confirmationNotification) {
  return createNotification(notification).then(() => {
    return createNotification(confirmationNotification);
  });
}

function findById(notificationId) {
  return genericDal.findOne(Notification, { _id: notificationId });
}

function findOneByUsersTypeAndActionStatus(user, otherUserId, type, actionStatus) {
  return genericDal.findOne(Notification, {
    $or: [
      {
        userId: user.id,
        createdBy: otherUserId,
        type: type,
        actionStatus: actionStatus,
      },
      {
        userId: otherUserId,
        createdBy: user.id,
        type: type,
        actionStatus: actionStatus,
      },
    ],
  });
}

function findAllPaginated(user, skip, limit) {
  return genericDal
    .findAllPaginated(
      Notification,
      { userId: user.id, deleted: false },
      skip,
      limit,
      { createdAt: -1 },
      undefined,
      ['createdBy', 'referenceId'],
    )
    .then(async (result) => {
      result.objects = await Promise.all(
        _.map(result.objects, async (notification) => {
          notification.message = await populateMessage(user, notification, templateGroupKey);
          return Promise.resolve(notification);
        }),
      );
      result.badgeCount = await countUnreadNotifications(user);
      return result;
    });
}

function updateNotification(user, notificationId, updatePayload) {
  return genericDal.updateOne(Notification, notificationId, updatePayload, user.role, user.id);
}

function countUnreadNotifications(user) {
  return genericDal.count(Notification, {
    userId: user.id,
    status: notificationStatus.UNREAD,
    deleted: false,
  });
}

class NotificationBuilder {
  constructor() {
    this.notification = { status: notificationStatus.UNREAD };
    this.pushNotification = new PushNotificationBuilder();
  }
  setUserId(userId) {
    this.notification.userId = userId;
    return this;
  }
  setCreatedBy(createdBy) {
    this.notification.createdBy = createdBy;
    return this;
  }
  setUsers(userId, createdBy) {
    this.notification.userId = userId;
    this.notification.createdBy = createdBy;
    return this;
  }
  setType(type) {
    this.notification.type = type;
    return this;
  }

  /**
   * Template key is an override for type when fetching the message template from system configurable collection
   * @param templateKey
   */
  setTemplateKey(templateKey) {
    if (templateKey) {
      this.notification.templateKey = templateKey;
    }
    return this;
  }
  setTemplateKeyWithCondition(condition, templateKey) {
    if (condition) {
      return this.setTemplateKey(templateKey);
    }
    return this;
  }
  setStatus(status) {
    this.notification.status = status;
    return this;
  }
  setActionRequired() {
    this.notification.actionStatus = actionStatuses.REQUIRED;
    return this;
  }
  setReferenceObject(reference, model) {
    this.notification.referenceObject = {
      reference: reference,
      referenceModel: model,
    };
    return this;
  }
  setPayload(value) {
    this.notification.payload = { value: value };
    return this;
  }
  sendPushNotification() {
    this.pushNotification.send();
    return this;
  }
}

class PushNotificationBuilder {
  constructor() {
    this.notification = { title: 'FTX' };
    this.sendPushNotification = false;
    /*this.android = {};*/
    /* this.apns = {
      payload: {
        aps: {
          'mutable-content': 1,
        },
      },
    };*/
  }
  send() {
    this.sendPushNotification = true;
    return this;
  }
  setBody(message) {
    this.notification.body = message;
    return this;
  }
  setImage(imageUrl) {
    /*this.imageUrl = imageUrl;
    this.android.notification = {
      imageUrl: imageUrl,
    };*/
    /*    this.apns.fcm_options = {
      image: imageUrl,
    };*/
    return this;
  }
}

function attachFilters(notificationPopulated) {
  if (notificationPopulated.createdBy) {
    genericDal.attachFilters(UserSchema, notificationPopulated.createdBy);
  }
  if (notificationPopulated.referenceObject) {
    genericDal.attachFilters(
      mongoose.model(notificationPopulated.referenceObject.referenceModel),
      notificationPopulated.createdBy,
    );
  }
}

function updateNotificationsAsRead(user, notificationId) {
  return findById(notificationId)
    .then((notification) => {
      return genericDal.updateMulti(
        Notification,
        {
          userId: user.id,
          createdAt: { $lte: notification.createdAt },
          status: notificationStatus.UNREAD,
        },
        { status: notificationStatus.READ },
      );
    })
    .then(() => {
      return findById(notificationId);
    });
}

module.exports = {
  findById: findById,
  findOneByUsersTypeAndStatus: findOneByUsersTypeAndActionStatus,
  findAllPaginated: findAllPaginated,
  checkActionNotificationNotExist: checkActionNotificationNotExist,
  createNotification: createNotification,
  createNotificationWithConfirmation: createNotificationWithConfirmation,
  updateNotification: updateNotification,
  updateNotificationsAsRead: updateNotificationsAsRead,
  NotificationBuilder: NotificationBuilder,
};
