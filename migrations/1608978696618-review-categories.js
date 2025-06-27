const mongoose = require('mongoose');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();

const mongooseModels = require('../models');
const ReviewCategory = mongoose.model('ReviewCategory');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  await mongoConnect;
  await ReviewCategory.create({ title: 'Purpose', alias: 'purpose' });
  await ReviewCategory.create({ title: 'Problem', alias: 'problem' });
  await ReviewCategory.create({ title: 'Solution', alias: 'solution' });
  await ReviewCategory.create({ title: 'Timing', alias: 'timing' });
  await ReviewCategory.create({ title: 'Market potential', alias: 'marketPotential' });
  await ReviewCategory.create({ title: 'Competition', alias: 'competition' });
  await ReviewCategory.create({ title: 'Business model', alias: 'businessModel' });
  await ReviewCategory.create({ title: 'Team', alias: 'team' });
  await ReviewCategory.create({ title: 'Financials', alias: 'financials' });
  await ReviewCategory.create({ title: 'Vision', alias: 'vision' });
  await ReviewCategory.create({ title: 'Marketing', alias: 'marketing' });
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {}

module.exports = { up, down };
