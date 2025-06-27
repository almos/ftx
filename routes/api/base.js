const logger = require('../../services/logger').instance;
const config = require('../../config');
const _ = require('lodash');

function handleError(error, message, next) {
  let cause = findCause(error);

  if (cause.custom) {
    logger.error(`${message}. Error: ${cause.message}. Stack: ${cause.stack}`);
  } else {
    logger.error(`${message}. Cause: ${error.message}`);
  }

  next(cause);
}

function findCause(sourceError) {
  let error = sourceError;
  while (error.parent && error.custom) {
    error = error.parent;
  }

  return error;
}

function parseBool(val) {
  return !!JSON.parse(String(val).toLowerCase());
}

function processPage(req) {
  // setting default request values
  _.defaults(req.query, { pageSize: config.pageSize });
  _.defaults(req.query, { page: 1 });

  let page = parseInt(req.query.page),
    pageSize = parseInt(req.query.pageSize),
    skip = (page - 1) * pageSize;

  return { page: page, pageSize: pageSize, skip: skip };
}

module.exports = {
  handleError: handleError,
  parseBool: parseBool,
  processPage: processPage,
};
