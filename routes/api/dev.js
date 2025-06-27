const router = require('express').Router();
const baseHandler = require('./base');
const errors = require('../../services/error');
const validate = require('../validate');
const authn = require('../auth/authn');
const { body, check, query, param } = require('express-validator');
const config = require('../../config');
const firebase = require('../../services/firebase');

router.get('/ping', [], async function (req, res, next) {
  return res.json({ payload: 'pong' });
});

router.get('/errors/404', [], function (req, res, next) {
  return new Promise((resolve, reject) => {
    throw new errors.EntityNotFoundError();
  }).catch((error) => {
    baseHandler.handleError(error, `Unable to handle review categorties retrieval request`, next);
  });
});

router.get('/errors/500', [], function (req, res, next) {
  return new Promise((resolve, reject) => {
    throw new errors.InternalServerError();
  }).catch((error) => {
    baseHandler.handleError(error, `Unable to handle review categorties retrieval request`, next);
  });
});

router.get('/errors/409', [], function (req, res, next) {
  return new Promise((resolve, reject) => {
    throw new errors.ObjectAlreadyExists();
  }).catch((error) => {
    baseHandler.handleError(error, `Unable to handle review categorties retrieval request`, next);
  });
});

router.get('/errors/403', [], function (req, res, next) {
  return new Promise((resolve, reject) => {
    throw new errors.PermissionAccessViolation();
  }).catch((error) => {
    baseHandler.handleError(error, `Unable to handle review categorties retrieval request`, next);
  });
});

router.get('/errors/422', [query('q').isString(), validate.request], function (req, res, next) {
  return res.json({ payload: {} });
});

router.get(
  '/errors/401',
  [
    // firebase authentication
    authn.firebase,
  ],
  function (req, res, next) {
    return new Promise((resolve, reject) => {
      throw new errors.PermissionAccessViolation();
    }).catch((error) => {
      baseHandler.handleError(error, `Unable to handle review categorties retrieval request`, next);
    });
  },
);

router.get('/status/database-name', function (req, res, next) {
  res.json({
    databaseName: config.mongo.getApiDatabaseName(),
  });
});

module.exports = router;
