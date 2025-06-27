const mongoose = require('mongoose');
require('../models');
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

  console.log(await SystemConfig.collection.getIndexes());
  await SystemConfig.collection.dropIndex('groupKey_1_itemKey_1_language_1').catch((error) => {
    console.log(error);
  });
  await SystemConfig.collection.dropIndex('value_text_groupKey_1_language_1').catch((error) => {
    console.log(error);
  });
  await SystemConfig.collection.dropIndex('language_1').catch((error) => {
    console.log(error);
  });
  await SystemConfig.updateMany({}, { $rename: { language: 'locale' } }, { multi: true });
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  await mongoConnect;
  await SystemConfig.updateMany({}, { $rename: { locale: 'language' } });
}

module.exports = { up, down };
