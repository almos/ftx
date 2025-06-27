class EntityNotFoundError extends Error {
  constructor(type) {
    super(`Object of type ${type} has not been found`);
    this.name = 'EntityNotFoundError';
    this.code = 404;
    this.custom = true;
  }
}

class DatabaseError extends Error {
  constructor(parentError) {
    super(`Internal data storage error`);
    this.parent = parentError;
    this.code = 500;
    this.name = 'DatabaseError';
    this.custom = true;
  }
}

class InternalServerError extends Error {
  constructor(parentError) {
    super(`Internal server error`);
    this.parent = parentError;
    this.code = 500;
    this.name = 'InternalServerError';
    this.custom = true;
  }
}

class ObjectAlreadyExists extends Error {
  constructor(id) {
    super(`Object ${id} already exists`);
    this.code = 409;
    this.name = 'ObjectAlreadyExists';
    this.custom = true;
  }
}

class IllegalStateError extends Error {
  constructor(message) {
    super(message);
    this.code = 406;
    this.name = 'IllegalStateError';
    this.custom = true;
  }
}

class InvalidArgumentError extends Error {
  constructor(message) {
    super(message);
    this.code = 422;
    this.name = 'InvalidArgumentError';
    this.custom = true;
  }
}

class PermissionAccessViolation extends Error {
  constructor() {
    super(`User does not have access to the requested resource`);
    this.code = 403;
    this.name = 'PermissionAccessViolation';
    this.custom = true;
  }
}

module.exports = {
  EntityNotFoundError: EntityNotFoundError,
  DatabaseError: DatabaseError,
  InternalServerError: InternalServerError,
  ObjectAlreadyExists: ObjectAlreadyExists,
  PermissionAccessViolation: PermissionAccessViolation,
  IllegalStateError: IllegalStateError,
  InvalidArgumentError: InvalidArgumentError,
};
