const mongoose = require('mongoose');
const SystemConfig = mongoose.model('SystemConfig');
const genericDal = require('./dal/generic');

/**
 * Creates a system config
 */
function createSystemConfig(systemConfigObject, creatorRole) {
  return genericDal.createOne(SystemConfig, systemConfigObject, creatorRole);
}

/**
 * Finds a system config in database by an internal ID
 */
function findById(id) {
  return genericDal.findOne(SystemConfig, { _id: mongoose.Types.ObjectId(id) });
}

/**
 * Finds a system config in database by an internal ID
 */
function findByItemKeyAndLocale(key, locale) {
  return genericDal.findOne(SystemConfig, { itemKey: key, locale: locale });
}

/**
 * Finds all system configs in a group and locale
 */
function findList(groupKey, locale, skip, limit) {
  return genericDal.findAll(SystemConfig, { groupKey: groupKey, locale: locale }, skip, limit);
}

/**
 * Searches all configs of a given group for a value
 */
function validateField(groupKey, value) {
  return genericDal.findOne(SystemConfig, {
    groupKey: groupKey,
    value: new RegExp('^' + value + '$', 'i'),
  });
}

/**
 * Updates existing system configs
 */
function updateSystemConfig(configId, updatedSystemConfig, updatorRole) {
  return genericDal.updateOne(SystemConfig, configId, updatedSystemConfig, updatorRole);
}

/**
 * Search for system configs
 */
function search(queryString, groupKey, locale, skip, limit) {
  let criteria = [],
    populate = undefined,
    projection = undefined;

  criteria.push({ groupKey: groupKey, locale: locale });
  if (queryString) {
    criteria.push({
      $or: [{ $text: { $search: queryString } }, { value: { $regex: queryString, $options: 'i' } }],
    });
  }

  return genericDal.findAllPaginated(
    SystemConfig,
    criteria.length ? { $and: criteria } : {},
    skip,
    limit,
    null,
    projection,
    populate,
  );
}

module.exports = {
  createSystemConfig: createSystemConfig,
  updateSystemConfig: updateSystemConfig,
  findByItemKeyAndLocale: findByItemKeyAndLocale,
  findById: findById,
  findList: findList,
  validateField: validateField,
  search: search,
};
