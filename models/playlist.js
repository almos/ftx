const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const common = require('./common');
const _ = require('lodash');
const roles = require('../config/security').userRoles;
const mongoosePaginate = require('mongoose-paginate-v2');

let PlaylistSchema = new mongoose.Schema(
  {
    title: { type: String, index: true },
    description: { type: String, index: true },
    tags: { type: [String], index: true },
    public: { type: Boolean, default: false },
    previewImageUrl: { type: String, acl: { set: [roles.ADMIN] } },
    videos: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Video' }], index: true },
    autoPlay: { type: Boolean, default: false },
    playlistAuthor: {
      type: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    companyPlaylist: { type: Boolean, default: false },
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

  next();
}

/**
 * Hooks
 */

PlaylistSchema.pre('save', function (next) {
  preSave(this, next);
});

PlaylistSchema.pre('findOneAndUpdate', function (next) {
  preSave(this._update, next);
});

/**
 * Fulltext indices to search by video name/description
 */
PlaylistSchema.index({
  title: 'text',
  description: 'text',
});

PlaylistSchema.index({ public: 1 });

/**
 * Plugins
 */
PlaylistSchema.plugin(mongoosePaginate);
PlaylistSchema.plugin(uniqueValidator, { message: 'is already exists.' });

mongoose.model('Playlist', PlaylistSchema);
