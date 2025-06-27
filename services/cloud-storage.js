const gc = require('../config/beans/cloud-storage');
const config = require('../config');
const errors = require('./error');
const logger = require('./logger').instance;

/**
 * Uploads image to Google Cloud Storage
 */
function uploadToBucket(localFile) {
  const bucket = gc.bucket(config.cloudStorage.bucketName);
  return new Promise((resolve, reject) => {
    const options = {
      metadata: {
        contentType: localFile.mimetype,
      },
    };

    bucket
      .upload(localFile.path, options)
      .then((upload) => {
        let uri = `https://storage.googleapis.com/${config.cloudStorage.bucketName}/${upload[1].name}`;
        resolve(uri);
      })
      .catch((error) => {
        logger.error(`Upload to Cloud Storage has failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

/**
 * Removes file from Google Cloud Storage
 */
function removeFromBucket(fullUrl) {
  const bucket = gc.bucket(config.cloudStorage.bucketName);

  return new Promise((resolve, reject) => {
    let url = require('url'),
      path = require('path'),
      parsed = url.parse(fullUrl),
      filename = path.basename(parsed.pathname);

    bucket
      .file(filename)
      .delete()
      .then((result) => {
        resolve();
      })
      .catch((error) => {
        logger.error(`File removal from Cloud Storage has failed: ${error.message}`);
        reject(new errors.InternalServerError(error));
      });
  });
}

module.exports = {
  uploadToBucket: uploadToBucket,
  removeFromBucket: removeFromBucket,
};
