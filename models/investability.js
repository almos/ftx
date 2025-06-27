/* eslint-disable prettier/prettier */
const mongoose = require('mongoose');
const types = mongoose.Schema.Types;
const mongoosePaginate = require('mongoose-paginate-v2');

let InvestabilitySchema = new mongoose.Schema(
  {
    pitchId: {
      type: types.ObjectId,
      ref: 'Pitch',
      acl: { set: [] },
      index: true,
    },
    score: { type: Number, required: true },
    result: { type: String, required: true },
    totalReviews: { type: Number, required: true },
    isCompleted: { type: Boolean },
    completedOn: { type: Date, required: false, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

InvestabilitySchema.plugin(mongoosePaginate);

mongoose.model('Investability', InvestabilitySchema, (mongoose.Collection = 'Investabilities'));
