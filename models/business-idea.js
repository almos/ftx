const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const common = require('./common');
const scopes = require('../config/security').userScopes;
const _ = require('lodash');
const aggregatePaginate = require('mongoose-aggregate-paginate-v2');
const mongoosePaginate = require('mongoose-paginate-v2');
const mongoTenant = require('../ext/node-mongo-tenant');
const defaultLanguageCode = require('../services/language').getDefaultLanguageCode;

let BusinessIdeaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      acl: { set: [] },
      index: true,
    },
    latestAvgPitchRating: { type: Number },
    title: { type: String, index: true },
    pitchCount: { type: Number, default: 0 },
    description: { type: String, index: true },
    tractionDescription: { type: String },
    teamDescription: { type: String },
    language: { type: String, default: defaultLanguageCode() },
    logo: { type: String },
    websiteUrl: { type: String },
    twitterUrl: { type: String },
    facebookUrl: { type: String },
    industries: { type: [String] },
    location: { type: [String] },
    stage: { type: String },
  },
  {
    timestamps: true,
    toObject: {
      transform: common.idTransformer,
    },
  },
);

BusinessIdeaSchema.methods.getOwner = function () {
  return common.getOwner(this.userId);
};

function preSave(obj, next) {
  if (obj.title) {
    obj.title = obj.title.trim();
  }

  if (obj.description) {
    obj.description = obj.description.trim();
  }

  if (obj.stage) {
    obj.stage = obj.stage.trim();
  }

  next();
}

/**
 * Hooks
 */

BusinessIdeaSchema.pre('save', function (next) {
  preSave(this, next);
});

BusinessIdeaSchema.pre('findOneAndUpdate', function (next) {
  preSave(this._update, next);
});

/**
 * Plugins
 */
BusinessIdeaSchema.plugin(aggregatePaginate);
BusinessIdeaSchema.plugin(mongoosePaginate);
BusinessIdeaSchema.plugin(uniqueValidator, { message: 'is already exists.' });
BusinessIdeaSchema.plugin(mongoTenant);

BusinessIdeaSchema.index({
  title: 'text',
  description: 'text',
});

mongoose.model('BusinessIdea', BusinessIdeaSchema);
