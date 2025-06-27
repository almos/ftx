const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const common = require('./common');
const _ = require('lodash');
const roles = require('../config/security').userRoles;
const mongoosePaginate = require('mongoose-paginate-v2');

let GroupSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      index: true,
      required: [true, "can't be blank"],
      acl: { set: [roles.ADMIN] },
    },
    type: {
      type: String,
      enum: ['ft-global', 'org-global', 'generic', 'pair'],
      default: 'generic',
      index: true,
      acl: { set: [roles.ADMIN] },
    },
    global: { type: Boolean, index: true, default: false, acl: { set: [roles.ADMIN] } },
    private: { type: Boolean, index: true, default: false, acl: { set: [roles.ADMIN] } },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      acl: { set: [roles.ADMIN] },
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      acl: { set: [roles.ADMIN] },
    },
    reviewers: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
      acl: { set: [roles.ADMIN] },
    },
    limitReviewers: { type: Boolean, default: false, acl: { set: [roles.ADMIN] } },
  },
  {
    timestamps: true,
    toObject: {
      transform: common.idTransformer,
    },
  },
);

/**
 * Fulltext indices to search by group name
 */
GroupSchema.index({
  title: 'text',
});

/**
 * Plugins
 */
GroupSchema.plugin(mongoosePaginate);
GroupSchema.plugin(uniqueValidator, { message: 'is already exists.' });

mongoose.model('Group', GroupSchema);
