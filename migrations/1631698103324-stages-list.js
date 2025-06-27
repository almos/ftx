const mongoose = require('mongoose');
require('../models');
const stagesList = ['Preseed', 'Seed', 'Series A', 'Series B', 'Series C'];
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
      stagesList.map((item) => {
        item = item.trim().toLowerCase().replace(regx, '-');

        return {
          groupKey: 'stage',
          itemKey: `stage:${item}`,
          locale: 'en',
          value: item,
        };
      }),
    );

    await SystemConfig.insertMany(inserts);
    console.log(`${inserts.length} stages have been imported.`);
  } catch (error) {
    console.log('error stages', error.message, error.stack);
    throw error;
  }
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  // Write migration here
  await SystemConfig.deleteMany({ groupKey: 'stage' });
}

module.exports = { up, down };
