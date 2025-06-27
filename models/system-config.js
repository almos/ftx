const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const common = require('./common');
const _ = require('lodash');
const roles = require('../config/security').userRoles;
const languageCodeList = require('../config/languages').languageCodeList;
const mongoosePaginate = require('mongoose-paginate-v2');

let SystemConfigSchema = new mongoose.Schema(
  {
    groupKey: {
      type: String,
      index: true,
      required: [true, "can't be blank"],
      acl: { get: [roles.ADMIN], set: [roles.ADMIN] },
    },
    itemKey: {
      type: String,
      index: true,
      required: [true, "can't be blank"],
      acl: { set: [roles.ADMIN] },
    },
    language: { type: String },
    locale: {
      type: String,
      enum: ['all', ...languageCodeList],
      index: true,
      required: [true, "can't be blank"],
      acl: { get: [roles.ADMIN], set: [roles.ADMIN] },
    },
    value: {
      type: String,
      index: true,
      required: [true, "can't be blank"],
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

/**
 * Fulltext indices to search by group name
 */
SystemConfigSchema.index(
  {
    groupKey: 1,
    itemKey: 1,
    locale: 1,
  },
  { unique: true },
);

SystemConfigSchema.index({
  value: 'text',
  groupKey: 1,
  locale: 1,
});

/**
 * Plugins
 */
SystemConfigSchema.plugin(mongoosePaginate);
SystemConfigSchema.plugin(uniqueValidator, { message: 'is already exists.' });

mongoose.model('SystemConfig', SystemConfigSchema);
