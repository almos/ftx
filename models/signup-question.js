const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const common = require('./common');

let AnswerSchema = mongoose.Schema(
  {
    title: { type: String, unique: true, required: [true, "can't be blank"] },
    value: { type: String, unique: true, required: [true, "can't be blank"] },
  },
  { _id: false },
);

let SignupQuestionSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, required: [true, "can't be blank"] },
    question: { type: String, unique: true, required: [true, "can't be blank"] },
    type: { type: String, enum: ['single', 'multi'] },
    answers: [AnswerSchema],
  },
  {
    toObject: {
      transform: common.idTransformer,
    },
  },
);

SignupQuestionSchema.plugin(uniqueValidator, { message: 'is already exists.' });

mongoose.model('SignupQuestion', SignupQuestionSchema);
