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
      liner = new lineByLine('./migrations/resources/skills-system-config.csv'),
      arr = [];

    while ((line = liner.next())) {
      let item = line.toString('ascii').trim().replace(' ', '-');
      arr.push({
        groupKey: 'skill',
        itemKey: `skill:${item.toLowerCase()}`,
        locale: 'en',
        value: item,
      });
    }

    await SystemConfig.insertMany(arr);
    console.log(`${arr.length} skills is imported.`);
  } catch (error) {
    console.log('error import skills', error.message, error.stack);
    throw error;
  }
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  // Write migration here
  await SystemConfig.deleteMany({ groupKey: 'skill' });
}

module.exports = { up, down };
