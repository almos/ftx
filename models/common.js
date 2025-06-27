const _ = require('lodash');
const typeUtils = require('../utils/typeutils');

function idTransformer(doc, ret) {
  if (ret._id) {
    ret.id = ret._id.toString();
    delete ret._id;
  }

  if (ret.__v) {
    delete ret.__v;
  }
}

/**
 * Processes tags so that they are unique, lowercase and
 * don't contain any trailing/leading whitespaces
 * @param sourceTags
 * @returns {unknown[]|*}
 */
function processTags(sourceTags) {
  if (sourceTags) {
    let resultTags = _.map(sourceTags, function (e) {
      return e ? _.trimEnd(_.trimStart(e)).toLowerCase() : e;
    });
    return _.uniq(resultTags);
  } else {
    return sourceTags;
  }
}

function processUsers(sourceUsers) {
  if (sourceUsers) {
    return _.uniq(sourceUsers);
  } else {
    return sourceUsers;
  }
}

function getOwner(userField) {
  return typeUtils.isObject(userField) ? userField.id : userField;
}

function parseInteger(value) {
  return value === undefined || value === null ? 0 : value;
}

module.exports = {
  idTransformer: idTransformer,
  processTags: processTags,
  processUsers: processUsers,
  getOwner: getOwner,
  parseInteger: parseInteger,
};
