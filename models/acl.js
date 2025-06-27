let _ = require('lodash');
let scopes = require('../config/security').userScopes;
const mongoose = require('mongoose');

function filterIn(obj, entity, role) {
  // this is needed in order to not make
  // MongoDB persist 'id' field (since it's internal MongoDB's name is _id)
  delete obj['id'];

  return filterImpl(obj, entity, role, 'set');
}

/**
 * Filters object to remove fields based on ACL rules before sending to the end user
 * @param obj object to filter
 * @param entity mongoose entity that has acl marks
 * @param user user to filter by
 * @returns {*}
 */
function filterOut(obj, entity, user) {
  return filterImpl(obj, entity, user.role, 'get', user);
}

function filterImpl(obj, entity, role, operation, user) {
  /**
   * We remove all fields that start with __lookup_ as they are used by Mongo aggregates
   * for searching by nested objects. They should not get into the output
   */
  _.forOwn(obj, function (value, key) {
    if (key && key.indexOf('__lookup_') == 0) {
      delete obj[key];
    }
  });

  _.each(entity.schema.paths, (val, key) => {
    // nested ref objects we process recursively
    if (val.options.ref) {
      let subModel = mongoose.model(val.options.ref),
        objValue = obj[val.path],
        objIsNestedObject = typeof objValue === 'object' && objValue !== null;

      if (objValue && objIsNestedObject) {
        filterImpl(objValue, subModel, role, operation);
        return;
      }
    }

    // nested refPath objects we process recursively
    if (val.options.refPath && obj[val.options.refPath]) {
      let subModel = mongoose.model(obj[val.options.refPath]),
        objValue = obj[val.path],
        objIsNestedObject = typeof objValue === 'object' && objValue !== null;

      if (objValue && objIsNestedObject) {
        filterImpl(objValue, subModel, role, operation);
        return;
      }
    }

    // nested array of refs
    if (Array.isArray(val.options.type) && val.options.type[0].ref) {
      let subModel = mongoose.model(val.options.type[0].ref),
        objects = obj[val.path] ? obj[val.path] : [];

      objects.forEach((o) => {
        filterImpl(o, subModel, role, operation);
      });

      return;
    }

    // nested array (not ref, but inlined objects)
    if (Array.isArray(val.options.type) && val.options.type[0].paths) {
      let subModel = val,
        objects = obj[val.path] ? obj[val.path] : [];

      objects.forEach((o) => {
        filterImpl(o, subModel, role, operation);
      });

      return;
    }

    // skipping fields if acl is not set
    if (!val.options.acl) {
      return;
    }

    let path = operation == 'set' ? val.options.acl.set : val.options.acl.get;
    if (path && !path.includes(role)) {
      delete obj[key];
    }

    if (
      path &&
      path.includes(scopes.OWNER) &&
      obj.hasOwnProperty('getOwner') &&
      obj.getOwner() != user.id
    ) {
      delete obj[key];
    }
  });

  return obj;
}

module.exports = {
  filterIn: filterIn,
  filterOut: filterOut,
};
