/**
 * mongo-tenant - Multi-tenancy for mongoose on document level.
 *
 * @copyright   Copyright (c) 2016-2017, craftup
 * @license     https://github.com/craftup/node-mongo-tenant/blob/master/LICENSE MIT
 */

const mongoose = require('mongoose');

('use strict');

/**
 * MongoTenant is a class aimed for use in mongoose schema plugin scope.
 * It adds support for multi-tenancy on document level (adding a tenant reference field and include this in unique indexes).
 * Furthermore it provides an API for tenant bound models.
 *
 * @property {object} _modelCache
 * @property {object} schema
 */
class MongoTenant {
  /**
   * Create a new mongo tenant from a given schema.
   *
   * @param {Object} [options] - A hash of configuration options.
   * @param {boolean} [options.enabled] - Whether the mongo tenant plugin is enabled. Default: **true**.
   * @param {string} [options.tenantIdKey] - The name of the tenant id field. Default: **tenantId**.
   * @param {string|*} [options.tenantIdType] - The type of the tenant id field. Default: **String**.
   * @param {string} [options.tenantIdGetter] - The name of the tenant id getter method. Default: **getTenantId**.
   * @param {string} [options.accessorMethod] - The name of the tenant bound model getter method. Default: **byTenant**.
   * @param {boolean} [options.requireTenantId] - Whether tenant id field should be required. Default: **false**.
   */
  constructor(schema, options) {
    this.options = options || {};

    const modelCache = {};
    Object.defineProperties(this, {
      _modelCache: {
        get: () => modelCache,
      },
      schema: {
        get: () => schema,
      },
    });
  }

  /**
   * Apply the mongo tenant plugin to the given schema.
   *
   * @returns {MongoTenant}
   */
  apply() {
    this.extendSchema().compoundIndexes().injectApi().installMiddleWare();
  }

  /**
   * Returns the boolean flag whether the mongo tenant is enabled.
   *
   * @returns {boolean}
   */
  isEnabled() {
    return !!(typeof this.options.enabled === 'undefined' ? true : this.options.enabled);
  }

  /**
   * Return the name of the tenant id field. Defaults to **tenantId**.
   *
   * @returns {string}
   */
  getTenantIdKey() {
    return this.options.tenantIdKey || 'visibleTenants';
  }

  getGroupIdKey() {
    return this.options.groupIdKey || 'visibleGroups';
  }

  /**
   * Return the type of the tenant id field. Defaults to **String**.
   *
   * @returns {*|String}
   */
  getTenantIdType() {
    return this.options.tenantIdType || String;
  }

  getGroupIdType() {
    return this.options.groupIdType || mongoose.Schema.Types.ObjectId;
  }

  /**
   * Return the method name for accessing tenant-bound models.
   *
   * @returns {*|string}
   */
  getAccessorMethod() {
    return this.options.accessorMethod || 'byTenant';
  }

  /**
   * Return the name of the tenant id getter method.
   *
   * @returns {*|string}
   */
  getTenantIdGetter() {
    return this.options.tenantIdGetter || 'getTenantId';
  }

  getGroupIdGetter() {
    return this.options.groupIdsGetter || 'getGroupIds';
  }

  /**
   * Check if tenant id is a required field.
   *
   * @return {boolean}
   */
  isTenantIdRequired() {
    return this.options.requireTenantId === true;
  }

  isGroupIdRequired() {
    return this.options.requireGroupId === true;
  }

  /**
   * Checks if instance is compatible to other plugin instance
   *
   * For population of referenced models it's necessary to detect if the tenant
   * plugin installed in these models is compatible to the plugin of the host
   * model. If they are compatible they are one the same "level".
   *
   * @param {MongoTenant} plugin
   */
  isCompatibleTo(plugin) {
    return (
      plugin &&
      typeof plugin.getAccessorMethod === 'function' &&
      typeof plugin.getTenantIdKey === 'function' &&
      this.getTenantIdKey() === plugin.getTenantIdKey()
    );
  }

  /**
   * Inject tenantId field into schema definition.
   *
   * @returns {MongoTenant}
   */
  extendSchema() {
    if (this.isEnabled()) {
      let tenantField = {
        [this.getTenantIdKey()]: {
          index: true,
          type: [this.getTenantIdType()],
          required: this.isTenantIdRequired(),
        },
      };

      let groupField = {
        [this.getGroupIdKey()]: {
          index: true,
          type: [this.getGroupIdType()],
          required: false,
        },
      };

      this.schema.add(tenantField);
      this.schema.add(groupField);
    }

    return this;
  }

  /**
   * Consider the tenant id field in all unique indexes (schema- and field level).
   * Take the optional **preserveUniqueKey** option into account for oupting out the default behaviour.
   *
   * @returns {MongoTenant}
   */
  compoundIndexes() {
    if (this.isEnabled()) {
      // apply tenancy awareness to schema level unique indexes
      this.schema._indexes.forEach((index) => {
        // extend uniqueness of indexes by tenant id field
        // skip if perserveUniqueKey of the index is set to true
        if (index[1].unique === true && index[1].preserveUniqueKey !== true) {
          let tenantAwareIndex = {
            [this.getTenantIdKey()]: 1,
            [this.getGroupIdKey()]: 1,
          };

          for (let indexedField in index[0]) {
            tenantAwareIndex[indexedField] = index[0][indexedField];
          }

          index[0] = tenantAwareIndex;
        }
      });

      // apply tenancy awareness to field level unique indexes
      this.schema.eachPath((key, path) => {
        let pathOptions = path.options;

        // skip if perserveUniqueKey of an unique field is set to true
        if (pathOptions.unique === true && pathOptions.preserveUniqueKey !== true) {
          // delete the old index
          path._index = null;
          delete path.options.unique;

          // prepare new options
          let indexOptions = {
            unique: true,
          };

          // add sparse option if set in options
          if (pathOptions.sparse) {
            indexOptions.sparse = true;
          }

          // add partialFilterExpression option if set in options
          if (pathOptions.partialFilterExpression) {
            indexOptions.partialFilterExpression = pathOptions.partialFilterExpression;
          }

          // create a new one that includes the tenant id field
          this.schema.index(
            {
              [this.getTenantIdKey()]: 1,
              [key]: 1,
            },
            indexOptions,
          );

          this.schema.index(
            {
              [this.getGroupIdKey()]: 1,
            },
            indexOptions,
          );
        }
      });
    }

    return this;
  }

  /**
   * Inject the user-space entry point for mongo tenant.
   * This method adds a static Model method to retrieve tenant bound sub-classes.
   *
   * @returns {MongoTenant}
   */
  injectApi() {
    let me = this;

    Object.assign(this.schema.statics, {
      [this.getAccessorMethod()]: function (tenantId, groups) {
        if (!me.isEnabled()) {
          return this.model(this.modelName);
        }

        // let modelCache = me._modelCache[this.modelName] || (me._modelCache[this.modelName] = {});
        //
        // // lookup tenant-bound model in cache
        // if (!modelCache[tenantId]) {
        //   let Model = this.model(this.modelName);
        //
        //   // Cache the tenant bound model class.
        //   modelCache[tenantId] = me.createTenantAwareModel(Model, tenantId);
        // }
        // return Object.assign(modelCache[tenantId], { groups: groups });

        let Model = this.model(this.modelName);
        let ExtendedModel = me.createTenantAwareModel(Model, tenantId, groups);
        return Object.assign(ExtendedModel, { groups: groups });
      },

      get mongoTenant() {
        return me;
      },
    });

    return this;
  }

  /**
   * Create a model class that is bound the given tenant.
   * So that all operations on this model prohibit leaving the tenant scope.
   *
   * @param BaseModel
   * @param tenantId
   * @returns {MongoTenantModel}
   */
  createTenantAwareModel(BaseModel, tenantId, groups) {
    let tenantIdGetter = this.getTenantIdGetter(),
      groupIdsGetter = this.getGroupIdGetter(),
      tenantIdKey = this.getTenantIdKey();

    const db = this.createTenantAwareDb(BaseModel.db, tenantId);

    class MongoTenantModel extends BaseModel {
      static get hasTenantContext() {
        return true;
      }

      static [tenantIdGetter]() {
        return tenantId;
      }

      static [groupIdsGetter]() {
        return groups;
      }

      /**
       * @see Mongoose.Model.aggregate
       * @param {...Object|Array} [operations] aggregation pipeline operator(s) or operator array
       * @param {Function} [callback]
       * @return {Mongoose.Aggregate|Promise}
       */
      static aggregate() {
        let operations = Array.prototype.slice.call(arguments);
        let pipeline = operations;

        if (Array.isArray(operations[0])) {
          pipeline = operations[0];
        } else if (arguments.length === 1 || typeof arguments[1] === 'function') {
          // mongoose 5.x compatibility
          pipeline = operations[0] = [operations[0]];
        }

        pipeline.unshift({
          $match: {
            [tenantIdKey]: this[tenantIdGetter](),
          },
        });

        return super.aggregate.apply(this, operations);
      }

      static deleteOne(conditions, callback) {
        conditions[tenantIdKey] = this[tenantIdGetter]();

        return super.deleteOne(conditions, callback);
      }

      static deleteMany(conditions, options, callback) {
        conditions[tenantIdKey] = this[tenantIdGetter]();

        return super.deleteMany(conditions, options, callback);
      }

      static remove(conditions, callback) {
        if (arguments.length === 1 && typeof conditions === 'function') {
          callback = conditions;
          conditions = {};
        }

        conditions[tenantIdKey] = this[tenantIdGetter]();

        return super.remove(conditions, callback);
      }

      static insertMany(docs, callback) {
        let me = this,
          tenantId = this[tenantIdGetter]();

        // Model.inserMany supports a single document as parameter
        if (!Array.isArray(docs)) {
          docs[tenantIdKey] = tenantId;
        } else {
          docs.forEach(function (doc, key) {
            doc[tenantIdKey] = tenantId;
          });
        }

        // ensure the returned docs are instanced of the bould multi tenant model
        return super.insertMany(docs, (err, docs) => {
          if (err) {
            return callback && callback(err);
          }

          return (
            callback &&
            callback(
              null,
              docs.map((doc) => new me(doc)),
            )
          );
        });
      }

      static get db() {
        return db;
      }

      get hasTenantContext() {
        return true;
      }

      [tenantIdGetter]() {
        return tenantId;
      }
    }

    // inherit all static properties from the mongoose base model
    for (let staticProperty of Object.getOwnPropertyNames(BaseModel)) {
      if (
        MongoTenantModel.hasOwnProperty(staticProperty) ||
        ['arguments', 'caller'].indexOf(staticProperty) !== -1
      ) {
        continue;
      }

      let descriptor = Object.getOwnPropertyDescriptor(BaseModel, staticProperty);
      Object.defineProperty(MongoTenantModel, staticProperty, descriptor);
    }

    // create tenant models for discriminators if they exist
    if (BaseModel.discriminators) {
      MongoTenantModel.discriminators = {};

      for (let key in BaseModel.discriminators) {
        MongoTenantModel.discriminators[key] = this.createTenantAwareModel(
          BaseModel.discriminators[key],
          tenantId,
        );
      }
    }

    return MongoTenantModel;
  }

  /**
   * Create db connection bound to a specific tenant
   *
   * @param {Connection} unawareDb
   * @param {*} tenantId
   * @returns {Connection}
   */
  createTenantAwareDb(unawareDb, tenantId) {
    const me = this;
    const awareDb = Object.create(unawareDb);
    awareDb.model = (name) => {
      const unawareModel = unawareDb.model(name);
      const otherPlugin = unawareModel.mongoTenant;

      if (!me.isCompatibleTo(otherPlugin)) {
        return unawareModel;
      }

      return unawareModel[otherPlugin.getAccessorMethod()](tenantId);
    };
    return awareDb;
  }

  /**
   * Install schema middleware to guard the tenant context of models.
   *
   * @returns {MongoTenant}
   */
  installMiddleWare() {
    let me = this,
      tenantIdGetter = this.getTenantIdGetter(),
      tenantIdKey = this.getTenantIdKey(),
      groupIdKey = this.getGroupIdKey(),
      groupIdGetter = this.getGroupIdGetter();

    this.schema.pre('count', function (next) {
      if (this.model.hasTenantContext) {
        this._conditions[tenantIdKey] = this.model[tenantIdGetter]();
      }

      next();
    });

    this.schema.pre('find', function (next) {
      if (this.model.hasTenantContext) {
        this._conditions[tenantIdKey] = this.model[tenantIdGetter]();

        if (this.model[groupIdGetter]() && this.model[groupIdGetter]().length) {
          this._conditions[groupIdKey] = { $in: this.model[groupIdGetter]() };
        }
      }

      next();
    });

    this.schema.pre('countDocuments', function (next) {
      if (this.model.hasTenantContext) {
        this._conditions[tenantIdKey] = this.model[tenantIdGetter]();
        if (this.model[groupIdGetter]() && this.model[groupIdGetter]().length) {
          this._conditions[groupIdKey] = { $in: this.model[groupIdGetter]() };
        }
      }

      next();
    });

    this.schema.pre('findOne', function (next) {
      if (this.model.hasTenantContext) {
        this._conditions[tenantIdKey] = this.model[tenantIdGetter]();
        if (this.model[groupIdGetter]() && this.model[groupIdGetter]().length) {
          this._conditions[groupIdKey] = { $in: this.model[groupIdGetter]() };
        }
      }

      next();
    });

    this.schema.pre('findOneAndRemove', function (next) {
      if (this.model.hasTenantContext) {
        this._conditions[tenantIdKey] = this.model[tenantIdGetter]();
        if (this.model[groupIdGetter]() && this.model[groupIdGetter]().length) {
          this._conditions[groupIdKey] = { $in: this.model[groupIdGetter]() };
        }
      }

      next();
    });

    this.schema.pre('findOneAndUpdate', function (next) {
      if (this.model.hasTenantContext) {
        me._guardUpdateQuery(this);
      }

      next();
    });

    this.schema.pre('save', function (next) {
      if (this.constructor.hasTenantContext) {
        this[tenantIdKey] = this.constructor[tenantIdGetter]();

        if (this.constructor[groupIdGetter]() && this.constructor[groupIdGetter]().length) {
          this[groupIdKey] = this.constructor[groupIdGetter]();
        }
      }

      next();
    });

    this.schema.pre('update', function (next) {
      if (this.model.hasTenantContext) {
        me._guardUpdateQuery(this);
      }

      next();
    });

    this.schema.pre('updateMany', function (next) {
      if (this.model.hasTenantContext) {
        me._guardUpdateQuery(this);
      }

      next();
    });

    return this;
  }

  /**
   * Avoid breaking tenant context from update operations.
   *
   * @param {mongoose.Query} query
   * @private
   */
  _guardUpdateQuery(query) {
    let tenantIdGetter = this.getTenantIdGetter(),
      groupIdsGetter = this.getGroupIdGetter(),
      tenantIdKey = this.getTenantIdKey(),
      groupIdKey = this.getGroupIdKey(),
      tenantId = query.model[tenantIdGetter](),
      groupIds = query.model[groupIdsGetter](),
      $set = query._update.$set;

    query._conditions[tenantIdKey] = tenantId;

    if (groupIds) {
      query._conditions[groupIdKey] = { $in: groupIds };
    }

    // avoid jumping tenant context when overwriting a model.
    if (tenantIdKey in query._update || query.options.overwrite) {
      query._update[tenantIdKey] = tenantId;

      if (groupIds) {
        query._update[groupIdKey] = groupIds;
      }
    }

    // avoid jumping tenant context from $set operations
    if ($set && tenantIdKey in $set && $set[tenantIdKey] !== tenantId) {
      $set[tenantIdKey] = tenantId;

      if (groupIds) {
        $set[groupIdKey] = groupIds;
      }
    }
  }
}

/**
 * The mongo tenant mongoose plugin.
 *
 * @param {mongoose.Schema} schema
 * @param {Object} options
 */
function mongoTenantPlugin(schema, options) {
  let mongoTenant = new MongoTenant(schema, options);

  mongoTenant.apply();
}

mongoTenantPlugin.MongoTenant = MongoTenant;

module.exports = mongoTenantPlugin;
