const mongoose = require('mongoose');
require('../models');
const templates = require('./resources/notification-templates').templates;
/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();

const SystemConfig = mongoose.model('SystemConfig');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  await mongoConnect;
  await SystemConfig.insertMany(templates);
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  await SystemConfig.deleteMany({ groupKey: 'notification-templates' });
  await SystemConfig.deleteMany({ groupKey: 'push-notification-templates' });
}

module.exports = { up, down };
