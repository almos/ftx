const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const common = require('./common');

let GroupMappingSchema = new mongoose.Schema(
  {
    email: { type: String, index: true, required: [true, "can't be blank"] },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, "can't be blank"],
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
 * Plugins
 */
GroupMappingSchema.plugin(uniqueValidator, { message: 'is already exists.' });

mongoose.model('GroupMappings', GroupMappingSchema);
