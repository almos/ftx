const mongoose = require('mongoose');
const ReviewCategory = mongoose.model('ReviewCategory');
const genericDal = require('./dal/generic');

/**
 * Finds all review categories
 */
function findAll() {
  return genericDal.findAll(ReviewCategory);
}

function findAllAliases() {
  return new Promise((resolve, reject) => {
    findAll()
      .then((reviewCategories) => {
        resolve(reviewCategories.map((obj) => obj.alias));
      })
      .catch((error) => {
        reject(error);
      });
  });
}

module.exports = {
  findAll: findAll,
  findAllAliases: findAllAliases,
};
