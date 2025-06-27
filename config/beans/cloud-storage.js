const Cloud = require('@google-cloud/storage');
const config = require('../index');
const { Storage } = Cloud;

const storage = new Storage({
  keyFilename: config.cloudStorage.serviceKey,
  projectId: config.cloudStorage.projectId,
});

module.exports = storage;
