/* eslint-disable prettier/prettier */
const mongoose = require('mongoose');
const types = mongoose.Schema.Types;

let WeightSchema = mongoose.Schema(
  {
    industry: { type: String, required: [true, "can't be blank"] },
    Value: { type: Number, default: 0, acl: { set: [] } },
  },
  {
    _id: false,
  },
);

let ReviewCategoryWeightSchema = new mongoose.Schema(
  {
    categoryId: {
      type: types.ObjectId,
      ref: 'ReviewCategory',
      acl: { set: [] },
      index: true,
    },
    title: { type: Number, required: true },
    alias: { type: String, required: true },
    weights: { type: [WeightSchema], select: true },
  },
  {
    versionKey: false,
  },
);

mongoose.model(
  'ReviewCategoryWeight',
  ReviewCategoryWeightSchema,
  (mongoose.Collection = 'ReviewWeightCategories'),
);
