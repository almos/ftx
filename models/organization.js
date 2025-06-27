const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const common = require('./common');
const _ = require('lodash');
const roles = require('../config/security').userRoles;
const mongoosePaginate = require('mongoose-paginate-v2');

let OrganizationSchema = new mongoose.Schema(
  {
    title: { type: String, index: true, unique: true },
    tenantAlias: { type: String, unique: true, required: [true, "can't be blank"] },
    hidden: { type: Boolean },
    owner: {
      type: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
 * Fulltext indices to search by video name/description
 */
OrganizationSchema.index({
  title: 'text',
});

/**
 * Plugins
 */
OrganizationSchema.plugin(mongoosePaginate);
OrganizationSchema.plugin(uniqueValidator, { message: 'is already exists.' });

mongoose.model('Organization', OrganizationSchema);
