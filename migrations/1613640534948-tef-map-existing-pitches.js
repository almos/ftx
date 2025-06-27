const mongoose = require('mongoose');
require('../models');
const _ = require('lodash');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();

const Pitch = mongoose.model('Pitch');
const BusinessIdea = mongoose.model('BusinessIdea');
const User = mongoose.model('User');
const Group = mongoose.model('Group');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  await mongoConnect;

  let tfGlobalGroup = await Group.findOne({
    type: 'ft-global',
  });

  let users = await User.find({ organization: null }).exec();

  for (let i = 0; i < users.length; i++) {
    let user = users[i];
    await Pitch.updateMany({ userId: user.id }, { visibleGroups: [tfGlobalGroup.id] });
    await BusinessIdea.updateMany({ userId: user.id }, { visibleGroups: [tfGlobalGroup.id] });
  }
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  // Write migration here
}

module.exports = { up, down };
