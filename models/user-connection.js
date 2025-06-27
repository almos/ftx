const mongoose = require('mongoose');
const common = require('./common');
const mongoosePaginate = require('mongoose-paginate-v2');
const uniqueValidator = require('mongoose-unique-validator');
const { userConnectionTypesList } = require('../config/user-connection');

let UserConnectionSchema = mongoose.Schema(
  {
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
    type: {
      type: String,
      enum: userConnectionTypesList,
    },
  },
  {
    timestamps: true,
    toObject: {
      transform: common.idTransformer,
    },
  },
);

UserConnectionSchema.plugin(mongoosePaginate);
UserConnectionSchema.plugin(uniqueValidator);

function preSave(obj, next) {
  if (obj.tags) {
    obj.tags = common.processUsers(obj.users);
  }
  next();
}

/**
 * Hooks
 */

UserConnectionSchema.pre('save', function (next) {
  preSave(this, next);
});

mongoose.model('UserConnection', UserConnectionSchema);
