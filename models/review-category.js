const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const common = require('./common');

let ReviewCategorySchema = new mongoose.Schema(
  {
    alias: { type: String, unique: true, required: [true, "can't be blank"] },
    title: { type: String, required: [true, "can't be blank"] },
  },
  {
    toObject: {
      transform: common.idTransformer,
    },
  },
);

ReviewCategorySchema.plugin(uniqueValidator, { message: 'is already exists.' });

mongoose.model('ReviewCategory', ReviewCategorySchema);
