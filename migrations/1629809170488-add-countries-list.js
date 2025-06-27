const mongoose = require('mongoose');
require('../models');
const countriesList = require('./resources/countries').countriesList;

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
    let regx = /\s/g;

    const inserts = await Promise.all(
      countriesList.map((item) => {
        item = item.trim().toLowerCase().replace(regx, '-');

        return {
          groupKey: 'country',
          itemKey: `country:${item}`,
          locale: 'en',
          value: item,
        };
      }),
    );

    await SystemConfig.insertMany(inserts);
    console.log(`${inserts.length} countries have been imported.`);
  } catch (error) {
    console.log('error import country', error.message, error.stack);
    throw error;
  }
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  // Write migration here
  await SystemConfig.deleteMany({ groupKey: 'country' });
}

module.exports = { up, down };
