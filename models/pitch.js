const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const common = require('./common');
const roles = require('../config/security').userRoles;
const scopes = require('../config/security').userScopes;
const _ = require('lodash');
const aggregatePaginate = require('mongoose-aggregate-paginate-v2');
const mongoosePaginate = require('mongoose-paginate-v2');
const mongoTenant = require('../ext/node-mongo-tenant');
const { userScopes } = require('../config/security');
const defaultLanguageCode = require('../services/language').getDefaultLanguageCode;

let PitchRateSchema = mongoose.Schema(
  {
    reviewCategoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ReviewCategory',
      index: true,
    },
    reviewRating: { type: Number, min: 0, max: 10 },
  },
  {
    _id: false,
  },
);

let PitchVideoSchema = mongoose.Schema(
  {
    thumbnailUrl: { type: String },
    posterUrl: { type: String },
    videoUrl: { type: String },
    updateDate: { type: Date, default: Date.now, acl: { set: [] } },
  },
  {
    _id: false,
  },
);

let ReviewFeedbackSchema = mongoose.Schema(
  {
    rate: { type: Number },
    date: { type: Date, default: Date.now, acl: { set: [] } },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      acl: { set: [] },
      index: true,
    },
  },
  {
    _id: false,
  },
);

let PitchReviewSchema = mongoose.Schema(
  {
    feedback: { type: String, required: [true, "can't be blank"] },
    avgRate: { type: Number, default: 0, acl: { set: [] } },
    rate: [PitchRateSchema],
    reviewFeedback: [ReviewFeedbackSchema],
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      acl: { set: [] },
      index: true,
    },
    submitDate: { type: Date, default: Date.now, acl: { set: [] } },
  },
  {
    timestamps: true,
    toObject: {
      transform: common.idTransformer,
    },
  },
);

PitchReviewSchema.methods.getOwner = function () {
  return common.getOwner(this.userId);
};

let PitchSchema = new mongoose.Schema(
  {
    businessIdeaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessIdea',
      index: true,
      acl: { set: [] },
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      acl: { set: [] },
      index: true,
    },
    title: { type: String, required: [true, "can't be blank"], index: true },
    description: { type: String, index: true },
    pitchDeckUrl: { type: String },
    language: { type: String, default: defaultLanguageCode() },
    version: { type: Number },
    tags: { type: [String], index: true },
    investmentAmountRequired: { type: Number, default: 0 },
    helpAreas: { type: [String] },
    active: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    private: { type: Boolean, default: false },
    avgRate: { type: Number, default: 0, acl: { set: [] }, index: true },
    curatedRate: {
      type: Number,
      default: 0,
      acl: { set: [roles.ADMIN] },
      index: true,
    },
    totalRate: { type: Number, default: 0, acl: { set: [] }, index: true },
    // Internal review status
    inReview: { type: Boolean, default: false },
    reviewed: {
      type: Boolean,
      default: false,
      acl: { set: [roles.ADMIN] },
    },
    // Flag that indicates if pitch has been rejected during the internal review stage
    rejected: {
      type: Boolean,
      default: false,
      acl: { set: [roles.ADMIN] },
    },
    // Internal review reject reason (is set only if rejected is true)
    rejectReason: {
      type: String,
      acl: { set: [roles.ADMIN] },
    },
    // Internal review user ID
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      acl: { set: [roles.INVESTOR, roles.ADMIN] },
    },
    networkType: {
      type: String,
      enum: ['none', 'mentor', 'investor'],
      default: 'none',
      acl: { get: [scopes.OWNER, roles.ADMIN], set: [roles.ADMIN] },
    },
    network: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        acl: { get: [scopes.OWNER, roles.ADMIN], set: [roles.ADMIN] },
      },
    ],
    publishedDate: { type: Date, index: true, acl: { set: [roles.ADMIN] } },
    // pitch reviews (non-internal, sent by other founders/investors)
    reviews: { type: [PitchReviewSchema], select: false, acl: { set: [] } },
    // pitch reviews count (cached reviews.length)
    reviewsCount: { type: Number, default: 0, acl: { set: [] } },
    localVideoPath: { type: String, acl: { get: [], set: [] } },
    brightcove: { type: Object, acl: { set: [], get: [] } },
    posterImageUrl: { type: String },
    // Brightcove metadata
    video: { type: PitchVideoSchema, acl: { set: [] } },
    likes: {
      type: Number,
      default: 0,
      min: 0,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toObject: {
      transform: common.idTransformer,
    },
  },
);

PitchSchema.methods.getOwner = function () {
  return common.getOwner(this.userId);
};

function preSave(obj, next) {
  if (obj.tags) {
    obj.tags = common.processTags(obj.tags);
  }

  next();
}

/**
 * Hooks
 */

PitchSchema.pre('save', function (next) {
  preSave(this, next);
});

PitchSchema.pre('findOneAndUpdate', function (next) {
  preSave(this._update, next);
});

/**
 * Plugins
 */
PitchSchema.plugin(aggregatePaginate);
PitchSchema.plugin(mongoosePaginate);
PitchSchema.plugin(uniqueValidator, { message: 'is already exists.' });
PitchSchema.plugin(mongoTenant);

/**
 * Indices
 */
PitchSchema.index({ userId: 1, active: 1, deleted: 1 });
PitchSchema.index({ businessIdeaId: 1, deleted: 1 });
PitchSchema.index({ 'video.updatedDate': 1 });

PitchSchema.index({
  title: 'text',
  description: 'text',
});

PitchSchema.index({ createdAt: 1 });
PitchSchema.index({ updatedAt: 1 });

mongoose.model('PitchReview', PitchReviewSchema);
mongoose.model('Pitch', PitchSchema);
