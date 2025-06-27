const mongoose = require('mongoose');
const common = require('./common');
const _ = require('lodash');
const mongoosePaginate = require('mongoose-paginate-v2');

let PitchReviewQueueSchema = new mongoose.Schema(
  {
    pitchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pitch',
      index: true,
    },
    businessIdeaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BusinessIdea',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      acl: { set: [] },
      index: true,
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
 * Indices
 */
PitchReviewQueueSchema.index({ pitchId: 1, businessIdeaId: 1 }, { unique: true });

/**
 * Plugins
 */
PitchReviewQueueSchema.plugin(mongoosePaginate);

mongoose.model('PitchReviewQueue', PitchReviewQueueSchema);
