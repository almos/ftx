const _ = require('lodash');
const errors = require('./error');
const codeGenerator = require('voucher-code-generator');

function getUserVisibilityGroups(user) {
  if (user.getActiveTenant() == 'root') return [];

  let aggregatedGroups = [];
  if (user.groups) aggregatedGroups = aggregatedGroups.concat(user.groups);
  if (user.globalGroups) aggregatedGroups = aggregatedGroups.concat(user.globalGroups);

  return _.map(aggregatedGroups, (v) => v.id);
}

function validateVisibilityGroups(user, visibilityGroups) {
  if (user.getActiveTenant() == 'root') return [];
  if (!visibilityGroups) return [];

  let groups = getUserVisibilityGroups(user);
  _.forEach(visibilityGroups, function (v) {
    if (!groups.includes(v))
      throw new errors.InvalidArgumentError(`User is not allowed to post to ${v} group`);
  });

  return visibilityGroups;
}

/**
 * Generate unique alphanumeric sequence
 * @param length - length of generated sequence
 * @param count - number of generated sequence
 * @param charset - could be one of: "numbers","alphabetic","alphanumeric"
 * Returns [String]
 */
function generateRandomAlphanumeric(length = 4, count = 1, charset = 'alphanumeric') {
  return codeGenerator.generate({
    length: length,
    count: count,
    charset: charset,
    pattern: '#'.repeat(length),
  });
}

module.exports = {
  validateVisibilityGroups: validateVisibilityGroups,
  getUserVisibilityGroups: getUserVisibilityGroups,
  generateRandomAlphanumeric: generateRandomAlphanumeric,
};
