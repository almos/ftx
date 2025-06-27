const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const roles = require('../config/security').userRoles;
const scopes = require('../config/security').userScopes;
const rolesList = require('../config/security').userRolesList;
const common = require('./common');
const mongoosePaginate = require('mongoose-paginate-v2');
const defaultLanguageCode = require('../services/language').getDefaultLanguageCode;
const UserSchema = require('./user').obj;

let PreUserSchema = new mongoose.Schema(
  {
    userData: UserSchema,
    inviteCode: { type: String, unique: true, index: true },
    inviteCodeSent: { type: Boolean, default: false },
    inviteCodeSentDt: { type: Date },
    createdAt: { type: Date, default: Date.now, acl: { set: [] } },
  },
  {
    timestamps: true,
    toObject: {
      transform: common.idTransformer,
    },
  },
);

/**
 * Fulltext indices to search by user name, surname, email
 */
PreUserSchema.index({
  'userData.name': 'text',
  'userData.surname': 'text',
  'userData.email': 'text',
});

PreUserSchema.plugin(mongoosePaginate);
PreUserSchema.plugin(uniqueValidator, { message: 'is already exists.' });

mongoose.model('PreUser', PreUserSchema);
