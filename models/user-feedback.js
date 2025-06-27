const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const roles = require('../config/security').userRoles;
const scopes = require('../config/security').userScopes;
const rolesList = require('../config/security').userRolesList;
const common = require('./common');
const aggregatePaginate = require('mongoose-aggregate-paginate-v2');
const mongoosePaginate = require('mongoose-paginate-v2');
const mongoTenant = require('../ext/node-mongo-tenant');
const defaultLanguageCode = require('../services/language').getDefaultLanguageCode;

let UserFeedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    feedbackText: {
      type: String,
    },
  },
  {
    timestamps: true,
    toObject: {
      transform: common.idTransformer,
    },
  },
);

UserFeedbackSchema.plugin(mongoosePaginate);
UserFeedbackSchema.plugin(uniqueValidator, { message: 'is already taken.' });

mongoose.model('UserFeedback', UserFeedbackSchema);
