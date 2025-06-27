const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const roles = require('../config/security').userRoles;
const common = require('./common');
const mongoosePaginate = require('mongoose-paginate-v2');

let CommunityFeedPostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      acl: { set: [roles.ADMIN] },
      index: true,
      required: true,
    },
    description: {
      type: String,
      acl: { set: [roles.ADMIN] },
    },
    tags: [
      {
        type: String,
        acl: { set: [roles.ADMIN] },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      acl: { set: [roles.ADMIN] },
    },
    url: {
      type: String,
      acl: { set: [roles.ADMIN] },
    },
    coverImageUrl: {
      type: String,
      acl: { set: [roles.ADMIN] },
    },
    deleted: {
      type: Boolean,
      default: false,
      acl: { set: [roles.ADMIN], get: [roles.ADMIN] },
    },
    pushNotifications: {
      type: Boolean,
      acl: { set: [roles.ADMIN] },
    },
  },
  {
    timestamps: true,
    toObject: {
      transform: common.idTransformer,
    },
  },
);

CommunityFeedPostSchema.plugin(mongoosePaginate);
CommunityFeedPostSchema.plugin(uniqueValidator, { message: 'is already exists.' });

mongoose.model('CommunityFeedPost', CommunityFeedPostSchema);
