const mongoose = require('mongoose');
const common = require('./common');
const _ = require('lodash');
const {
  notificationTypesList,
  notificationStatus,
  notificationStatusList,
  actionStatusList,
  actionStatuses,
} = require('../config/notification');
const mongoosePaginate = require('mongoose-paginate-v2');

let NotificationReferenceObjectSchema = new mongoose.Schema({
  reference: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceModel',
  },
  referenceModel: {
    type: String,
    enum: ['Pitch', 'PitchReview', 'UserConnection'],
  },
});

let NotificationPayloadSchema = new mongoose.Schema(
  {
    value: { type: String },
  },
  { _id: false },
);

let NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      required: [true, "can't be blank"],
      ref: 'User',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: notificationTypesList,
      index: true,
    },
    templateKey: { type: String, enum: notificationTypesList },
    status: {
      type: String,
      enum: notificationStatusList,
      default: notificationStatus.UNREAD,
      index: true,
    },
    actionStatus: {
      type: String,
      enum: actionStatusList,
      index: true,
    },
    referenceObject: { type: NotificationReferenceObjectSchema },
    payload: { type: NotificationPayloadSchema },
    deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toObject: {
      transform: common.idTransformer,
    },
  },
);

/**
 * Index
 */
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });
NotificationSchema.index({ userId: 1, createdBy: 1, type: 1, status: 1 });
NotificationSchema.index({ userId: 1, deleted: 1 });

NotificationSchema.methods.getOwner = function () {
  return common.getOwner(this.userId);
};

/**
 * Plugins
 */
NotificationSchema.plugin(mongoosePaginate);

mongoose.model('Notification', NotificationSchema);
