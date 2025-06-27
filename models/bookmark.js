const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const common = require('./common');
const _ = require('lodash');
const mongoosePaginate = require('mongoose-paginate-v2');
const bookmarkTypesList = require('../config/bookmark').bookmarkTypesList;
const bookmarkTypeModelList = require('../config/bookmark').bookmarkTypeModelList;

let BookmarkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      index: true,
      required: [true, "can't be blank"],
    },
    type: {
      type: String,
      index: true,
      enum: bookmarkTypesList,
      required: [true, "can't be blank"],
    },
    onModel: {
      type: String,
      index: true,
      enum: bookmarkTypeModelList,
      required: [true, "can't be blank"],
    },
    bookmarkedObjectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      refPath: 'onModel',
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
 * Unique index for bookmarks
 */
BookmarkSchema.index(
  {
    userId: 1,
    type: 1,
    bookmarkedObjectId: 1,
  },
  { unique: true },
);

BookmarkSchema.methods.getOwner = function () {
  return common.getOwner(this.userId);
};

/**
 * Plugins
 */
BookmarkSchema.plugin(mongoosePaginate);
BookmarkSchema.plugin(uniqueValidator, { message: 'is already exists.' });

mongoose.model('Bookmark', BookmarkSchema);
