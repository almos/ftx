const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const roles = require('../config/security').userRoles;
const rolesList = require('../config/security').userRolesList;
const common = require('./common');
const _ = require('lodash');
const mongoosePaginate = require('mongoose-paginate-v2');

let VideoResourceSchema = mongoose.Schema(
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

let VideoMetadataSchema = mongoose.Schema(
  {
    evaluationCriteria: { type: [String] },
    stage: { type: [String] },
  },
  {
    _id: false,
  },
);

let VideoSchema = new mongoose.Schema(
  {
    localVideoPath: { type: String, acl: { get: [], set: [] } },
    title: { type: String, index: true },
    description: { type: String, index: true },
    previewImageUrl: { type: String },
    tags: { type: [String], index: true },
    authors: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Author' }], index: true },
    likes: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] },
    likesCount: { type: Number },
    accessGroups: { type: [String], enum: ['PREMIUM'], acl: { set: [roles.ADMIN] } },
    uploadDate: { type: Date, default: Date.now, acl: { set: [] } },
    brightcove: { type: Object, acl: { set: [], get: [] } },
    video: { type: VideoResourceSchema, acl: { set: [] } },
    metadata: { type: VideoMetadataSchema, acl: { set: [roles.ADMIN] } },
  },
  {
    timestamps: true,
    toObject: {
      transform: common.idTransformer,
    },
  },
);

function preSave(obj, next) {
  if (obj.tags) {
    obj.tags = common.processTags(obj.tags);
  }

  if (obj.authors) {
    obj.authors = _.uniq(obj.authors);
  }

  if (obj.likes) {
    obj.likes = _.uniq(obj.likes);
    obj.likesCount = obj.likes.length;
  }

  next();
}

/**
 * Hooks
 */

VideoSchema.pre('save', function (next) {
  preSave(this, next);
});

VideoSchema.pre('findOneAndUpdate', function (next) {
  preSave(this._update, next);
});

/**
 * Fulltext indices to search by video name/description
 */
VideoSchema.index({
  title: 'text',
  description: 'text',
});
VideoSchema.index({ 'video.updatedDate': 1 });

/**
 * Plugins
 */
VideoSchema.plugin(mongoosePaginate);
VideoSchema.plugin(uniqueValidator, { message: 'is already exists.' });

mongoose.model('Video', VideoSchema);
