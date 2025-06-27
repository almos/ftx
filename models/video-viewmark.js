const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const common = require('./common');
const _ = require('lodash');

let VideoViewMarkSchema = new mongoose.Schema(
  {
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Video',
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastWatchedAtSec: { type: Number },
    completed: { type: Boolean, default: false },
  },

  {
    toObject: {
      transform: common.idTransformer,
    },
  },
);

/**
 * Indices
 */
VideoViewMarkSchema.index({ videoId: 1, userId: 1 }, { unique: true });

/**
 * Plugins
 */
VideoViewMarkSchema.plugin(uniqueValidator, { message: 'is already exists.' });

mongoose.model('VideoViewMark', VideoViewMarkSchema);
