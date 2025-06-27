const router = require('express').Router();

const logger = require('../../services/logger').instance;
const reviewCategoryService = require('../../services/review-category');
const baseHandler = require('./base');

/**
 * Review categories retrieval
 */
router.get('/', [], function (req, res, next) {
  logger.info(`Got request to return all review categories`);

  reviewCategoryService
    .findAll()
    .then((questions) => {
      return res.json({ payload: questions });
    })
    .catch((error) => {
      baseHandler.handleError(error, `Unable to handle review categorties retrieval request`, next);
    });
});

module.exports = router;
