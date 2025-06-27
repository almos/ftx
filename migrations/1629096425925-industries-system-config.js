const mongoose = require('mongoose');
const lineByLine = require('n-readlines');
require('../models');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();
let SystemConfig = mongoose.model('SystemConfig');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  // Write migration here
  try {
    await mongoConnect;

    let line,
      liner = new lineByLine('./migrations/resources/industries-system-config.csv'),
      arr = [];

    while ((line = liner.next())) {
      let item = line.toString('ascii').trim();
      item = item.includes('/') ? item.replace(/\s+/g, '') : item.replace(' ', '-');

      arr.push({
        groupKey: 'industry',
        itemKey: `industry:${item.toLowerCase()}`,
        locale: 'en',
        value: item,
      });
    }

    await SystemConfig.insertMany(arr);
    console.log(`${arr.length} industries is imported.`);
  } catch (error) {
    console.log('error import industries', error.message, error.stack);
    throw error;
  }
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  // Write migration here
  await SystemConfig.deleteMany({ groupKey: 'industry' });
}

module.exports = { up, down };
