const mongoose = require('mongoose');
const SignupQuestion = mongoose.model('SignupQuestion');
const genericDal = require('./dal/generic');

/**
 * Finds all signup questions
 */
function findAll() {
  return genericDal.findAll(SignupQuestion);
}

/**
 *  Finds signup question by key
 */
function findByKey(key) {
  return new Promise((resolve, reject) => {
    findAll()
      .then((signupQuestions) => {
        resolve(signupQuestions.filter((obj) => obj.key == key).find((obj) => obj.key == key));
      })
      .catch((error) => {
        reject(error);
      });
  });
}

/**
 *  Finds signup question answer values by key
 */
function findAnswerValuesByKey(key) {
  return new Promise((resolve, reject) => {
    findByKey(key)
      .then((signupQuestion) => {
        resolve(signupQuestion.answers.map((el) => el.value));
      })
      .catch((error) => {
        reject(error);
      });
  });
}

module.exports = {
  findAll: findAll,
  findByKey: findByKey,
  findAnswerValuesByKey: findAnswerValuesByKey,
};
