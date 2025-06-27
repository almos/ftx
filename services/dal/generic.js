const mongoose = require('mongoose');
const errors = require('../error');
const dataAcl = require('../../models/acl');
const acl = require('../../models/acl');
const logger = require('../../services/logger').instance;
const _ = require('lodash');

function findAll(model, searchCriteria, sortingOptions, projection, populate) {
  let findQuery = model.find(searchCriteria ? searchCriteria : {}, projection);
  if (populate) {
    _.forOwn(populate, function (value, key) {
      findQuery = findQuery.populate(value);
    });
  }

  if (sortingOptions) findQuery = findQuery.sort(sortingOptions);

  return new Promise((resolve, reject) => {
    findQuery.exec(function (err, data) {
      if (err) {
        reject(new errors.DatabaseError(err));
      } else if (!data) {
        resolve([]);
      } else {
        let result = _.map(data, function (item) {
          return attachFilters(model, item.toObject());
        });
        resolve(result);
      }
    });
  });
}

function count(model, searchCriteria) {
  return new Promise((resolve, reject) => {
    model.count(searchCriteria, function (err, count) {
      if (err) {
        reject(new errors.DatabaseError(err));
      } else {
        resolve(count);
      }
    });
  });
}

function findOne(model, searchCriteria, projection, populate) {
  return new Promise((resolve, reject) => {
    let query = model.findOne(searchCriteria, projection);
    if (populate) {
      if (Array.isArray(populate)) {
        _.forEach(populate, function (o) {
          query = query.populate(o);
        });
      } else {
        query = query.populate(populate);
      }
    }
    query.exec(function (err, object) {
      findOneCallbackImpl(model, resolve, reject, err, object);
    });
  });
}

function findOneCallbackImpl(model, resolve, reject, err, object) {
  if (err) {
    reject(new errors.DatabaseError(err));
  } else if (!object) {
    reject(new errors.EntityNotFoundError(model.modelName));
  } else {
    resolve(attachFilters(model, object.toObject()));
  }
}

function createOne(model, inObject, creatorRole) {
  let payload = filterIn(model, inObject, creatorRole);
  validateUpdateFields(model, inObject);

  return new Promise((resolve, reject) => {
    model
      .create(payload)
      .then((record) => {
        resolve(attachFilters(model, record.toObject()));
      })
      .catch((error) => {
        logger.error(`${model.modelName} creation failed: ${error.message}`);
        reject(new errors.DatabaseError(error));
      });
  });
}

function deleteOne(model, oid) {
  return new Promise((resolve, reject) => {
    model.findOneAndDelete({ _id: oid }, {}, function (err, doc) {
      if (err) {
        reject(new errors.DatabaseError(err));
      } else if (!doc) {
        reject(new errors.EntityNotFoundError(model.modelName));
      } else {
        resolve(attachFilters(model, doc.toObject()));
      }
    });
  });
}

function upsertOne(model, query, inObject, updatorRole) {
  let payload = filterIn(model, inObject, updatorRole);
  validateUpdateFields(model, inObject);

  return new Promise((resolve, reject) => {
    model.findOneAndUpdate(query, payload, { upsert: true, new: true }, function (err, doc) {
      if (err) {
        reject(new errors.DatabaseError(err));
      } else if (!doc) {
        reject(new errors.EntityNotFoundError(model.modelName));
      } else {
        resolve(attachFilters(model, doc.toObject()));
      }
    });
  });
}

/**
 * Verifies object ownership before making any changes to the database
 * If updator user id is not specified, ownership is not checked.
 * This function relies on a fact that ownership is checked agains Model.userId field
 * @param model
 * @param oid
 * @param updateFields
 * @param updatorRole
 * @param updatorUserId
 */
function updateOneWithOwnership(
  model,
  oid,
  updateFields,
  updatorRole,
  updatorUserId,
  findCallback,
) {
  let payload = filterIn(model, updateFields, updatorRole);
  validateUpdateFields(model, updateFields);

  return new Promise((resolve, reject) => {
    findOne(model, { _id: oid })
      .then((result) => {
        // ownership check
        if (!updatorUserId) return result;
        if (!result.userId) return result;
        if (result.userId == updatorUserId) return result;

        reject(new errors.PermissionAccessViolation());
      })
      .then((result) => {
        if (findCallback) findCallback(result, updateFields);
        return result;
      })
      .then((result) => {
        return model.findByIdAndUpdate(mongoose.Types.ObjectId(oid), payload, { new: true });
      })
      .then((record) => {
        resolve(attachFilters(model, record.toObject()));
      })
      .catch((error) => {
        logger.error(`Database object ${model.modelName}/${oid} update failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

function updateOne(model, oid, updateFields, updatorRole, updatorUserId, findCallback) {
  return updateOneWithOwnership(model, oid, updateFields, updatorRole, updatorUserId, findCallback);
}

function updateMulti(model, filter, updateRequest) {
  return new Promise((resolve, reject) => {
    model
      .updateMany(filter, updateRequest)
      .then((res) => resolve(res))
      .catch((error) => {
        logger.error(`Failed update on ${model.modelName}: ${error.message}`);
        reject(new errors.DatabaseError(error));
      });
  });
}

/**
 * Used to update one with filter
 * @param model
 * @param uid
 * @param filter
 * @param updateRequest
 * @param updatorRole
 * @param updatorUserId
 * @returns {Promise<unknown>}
 */
function updateOneWithFilter(model, uid, filter, updateRequest, updaterRole, updaterUserId) {
  let objectFilter = {
    _id: uid,
    ...filter,
  };
  let payload = filterIn(model, updateRequest, updaterRole);
  validateUpdateFields(model, updateRequest);

  return new Promise((resolve, reject) => {
    findOne(model, { _id: uid })
      .then((result) => {
        // ownership check
        if (!updaterUserId) return result;
        if (!result.userId) return result;
        if (result.userId === updaterUserId) return result;

        reject(new errors.PermissionAccessViolation());
      })
      .then((result) => {
        return model.updateOne(objectFilter, payload);
      })
      .then((result) => {
        return model.findById(uid);
      })
      .then((record) => resolve(attachFilters(model, record.toObject())))
      .catch((error) => {
        logger.error(`Failed update on ${model.modelName}: ${error.message}`);
        reject(new errors.DatabaseError(error));
      });
  });
}

/**
 * Finds and paginates through objects with a complex filter, sorting scenario
 * @param model mongoose model to query
 * @param searchCriteria search criteria
 * @param skip items to skip from the top (pagination)
 * @param limit max items to return (pagination)
 * @param sortingOptions fields to sort by
 * @param projection query projection
 * @param populate populate options items according to https://mongoosejs.com/docs/api.html#query_Query-populate
 * @returns {Promise<unknown>}
 */
function findAllPaginated(
  model,
  searchCriteria,
  skip,
  limit,
  sortingOptions,
  projection,
  populate,
) {
  let paginateOptions = {};

  if (projection) {
    paginateOptions.projection = projection;
  }

  if (sortingOptions) {
    paginateOptions.sort = sortingOptions;
  }

  if (skip) {
    paginateOptions.offset = skip;
  }

  if (limit) {
    paginateOptions.limit = limit;
  }

  if (populate) {
    paginateOptions.populate = populate;
  }

  return new Promise((resolve, reject) => {
    model.paginate(searchCriteria, paginateOptions, function (err, data) {
      if (err) {
        reject(new errors.DatabaseError(err));
      } else if (!data) {
        resolve({ objects: [], total: 0 });
      } else {
        let result = _.map(data.docs, function (item) {
          return attachFilters(model, item.toObject());
        });
        resolve({
          objects: result,
          paging: {
            totalObjects: data.totalDocs,
            currentPage: data.page,
            totalPages: data.totalPages,
            hasNextPage: data.hasNextPage,
          },
        });
      }
    });
  });
}

function aggregatePaginated(model, aggregate, skip, limit, sortingOptions, lookups) {
  let paginateOptions = {};

  if (sortingOptions) {
    paginateOptions.sort = sortingOptions;
  }

  if (skip) {
    paginateOptions.offset = skip;
  }

  if (limit) {
    paginateOptions.limit = limit;
  }

  return new Promise((resolve, reject) => {
    model.aggregatePaginate(model.aggregate(aggregate), paginateOptions, function (err, data) {
      if (err) {
        reject(new errors.DatabaseError(err));
      } else if (!data) {
        resolve({ objects: [], total: 0 });
      } else {
        let result = _.map(data.docs, function (item) {
          runAggregateTransformation(model, item, lookups);
          return attachFilters(model, item);
        });
        resolve({
          objects: result,
          paging: {
            totalObjects: data.totalDocs,
            currentPage: data.page,
            totalPages: data.totalPages,
            hasNextPage: data.hasNextPage,
          },
        });
      }
    });
  });
}

/**
 * When running an aggregate query with lookups, Mongoose won't execute
 * transformation functions defined in schema, hence we have to do it ourselves
 * @param model
 * @param item
 * @param lookups
 */
function runAggregateTransformation(model, item, lookups) {
  // executing transformation for the top-level object
  model.schema.options.toObject.transform(model, item);

  // executing transformations for looked-up objects
  for (const [key, value] of Object.entries(lookups)) {
    let subSchemaName = model.schema.paths[key].options.ref
      ? model.schema.paths[key].options.ref
      : model.schema.paths[key].options.type[0].ref;
    let subSchema = mongoose.model(subSchemaName);

    if (!item[value]) continue;

    if (Array.isArray(item[value])) {
      item[value].forEach((e) => {
        subSchema.schema.options.toObject.transform(subSchema, e);
      });
    } else {
      subSchema.schema.options.toObject.transform(subSchema, item[value]);
    }
  }
}

/**
 * Checks if update fields is not empty
 */
function validateUpdateFields(model, updateFields) {
  if (!_.isEmpty(updateFields)) {
    return;
  }

  logger.warn(`Create/update/upsert request for ${model.modelName} is empty. Nothing to update`);
  throw new errors.InvalidArgumentError('Nothing to update');
}

/**
 * Filters inbound payload from values user is not allowed to update
 */
function filterIn(model, updateFields, updatorRole) {
  let payload = updateFields;
  if (updatorRole) {
    payload = dataAcl.filterIn(payload, model, updatorRole);
  }
  return payload;
}

function attachFilters(model, object) {
  if (!object) return object;

  object.filterOut = function (user) {
    return acl.filterOut(object, model, user);
  };

  return object;
}

module.exports = {
  findAll: findAll,
  findAllPaginated: findAllPaginated,
  aggregatePaginated: aggregatePaginated,
  createOne: createOne,
  upsertOne: upsertOne,
  findOne: findOne,
  updateOne: updateOne,
  deleteOne: deleteOne,
  updateMulti: updateMulti,
  updateOneWithFilter: updateOneWithFilter,
  count: count,
  attachFilters: attachFilters,
};
