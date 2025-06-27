const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const roles = require('../config/security').userRoles;
const common = require('./common');
const mongoosePaginate = require('mongoose-paginate-v2');

let AuthorSchema = new mongoose.Schema(
  {
    name: { type: String, acl: { set: [roles.ADMIN] }, index: true },
    surname: { type: String, acl: { set: [roles.ADMIN] }, index: true },
    title: { type: String, acl: { set: [roles.ADMIN] }, index: true },
    description: { type: String, acl: { set: [roles.ADMIN] }, index: true },
    avatarUrl: { type: String, acl: { set: [roles.ADMIN] } },
  },
  {
    timestamps: true,
    toObject: {
      transform: common.idTransformer,
    },
  },
);

/**
 * Fulltext indices to search by author fields
 */
AuthorSchema.index({
  name: 'text',
  surname: 'text',
  title: 'text',
  description: 'text',
});

AuthorSchema.plugin(mongoosePaginate);
AuthorSchema.plugin(uniqueValidator, { message: 'is already taken.' });

mongoose.model('Author', AuthorSchema);
