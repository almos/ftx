const router = require('express').Router();

const logger = require('../../services/logger').instance;
const signupQuestionService = require('../../services/signup-question');
const baseHandler = require('./base');

/**
 * Signup questions retrieval
 */
router.get('/', [], function (req, res, next) {
  logger.info(`Got request to return all signup questions`);

  signupQuestionService
    .findAll()
    .then((questions) => {
      return res.json({ payload: questions });
    })
    .catch((error) => {
      baseHandler.handleError(error, `Unable to handle signup questions retrieval request`, next);
    });
});

module.exports = router;
