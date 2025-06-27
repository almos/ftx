const { body, check, query, param, oneOf } = require('express-validator');
const logger = require('../../services/logger').instance;

function validateGenericFile(file, extectedMimeType, required) {
  if (!file) {
    if (!required) {
      return true;
    }
    return false;
  }

  if (!file.mimetype) {
    logger.warn('Upload file mime-type is not set');
    return false;
  }

  if (file.mimetype.indexOf(extectedMimeType) < 0) {
    logger.warn(`Upload file mime-type is invalid: ${file.mimetype}`);
    return false;
  }

  return true;
}

/**
 * Validation rules
 */
const fileUploadValidation = {
  videoFile: check('video').custom((value, { req }) => {
    return validateGenericFile(req.file, 'video/', true);
  }),

  imageFile: check('image').custom((value, { req }) => {
    return validateGenericFile(req.file, 'image/', true);
  }),

  imageFileNotRequired: check('image').custom((value, { req }) => {
    return validateGenericFile(req.file, 'image/', false);
  }),

  pdfFile: check('pdf').custom((value, { req }) => {
    return validateGenericFile(req.file, 'application/pdf', true);
  }),
};

const pagingValidation = {
  page: query('page').isInt({ gt: 0 }).optional(),
  pageSize: query('pageSize').isInt({ gt: 0, lt: 1000 }).optional(),
};

module.exports = {
  fileUploadValidation: fileUploadValidation,
  pagingValidation: pagingValidation,
};
