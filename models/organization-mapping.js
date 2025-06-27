const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const common = require('./common');

let OrganizationMappingSchema = new mongoose.Schema(
  {
    email: { type: String, index: true, required: [true, "can't be blank"] },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
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
OrganizationMappingSchema.plugin(uniqueValidator, { message: 'is already exists.' });

mongoose.model('OrganizationMappings', OrganizationMappingSchema);
