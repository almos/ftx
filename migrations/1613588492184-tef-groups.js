const mongoose = require('mongoose');
const lineByLine = require('n-readlines');
require('../models');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();
const _ = require('lodash');

const Organization = mongoose.model('Organization');
const Group = mongoose.model('Group');
const User = mongoose.model('User');
const GroupMappings = mongoose.model('GroupMappings');
const Pitch = mongoose.model('Pitch');
const BusinessIdea = mongoose.model('BusinessIdea');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  await mongoConnect;

  let tefOrg = await Organization.findOne({ tenantAlias: 'tef' });

  let line,
    liner = new lineByLine('./migrations/resources/tef-groups.csv');

  while ((line = liner.next())) {
    let parts = line.toString('ascii').split(',');

    let email = parts[0].trimStart().trimEnd().toLowerCase(),
      group = parts[1].trimStart().trimEnd(),
      judges = [
        parts[2].trimStart().trimEnd().toLowerCase(),
        parts[3].trimStart().trimEnd().toLowerCase(),
        parts[4].trimStart().trimEnd().toLowerCase(),
      ];

    let existingGroup = await Group.findOne({ title: group });
    if (existingGroup == null) {
      existingGroup = await Group.create({ title: group, organization: tefOrg });
    }

    await GroupMappings.findOneAndUpdate(
      { email: email },
      { email: email, group: existingGroup.id },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    let user = await User.findOneAndUpdate({ email: email }, { groups: [existingGroup.id] });

    if (user) {
      await BusinessIdea.updateMany({ userId: user.id }, { visibleGroups: [existingGroup.id] });
      await Pitch.updateMany({ userId: user.id }, { visibleGroups: [existingGroup.id] });
    }

    for (let i = 0; i < judges.length; i++) {
      await GroupMappings.findOneAndUpdate(
        { email: judges[i] },
        { email: judges[i], group: existingGroup.id },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      let judgeUser = await User.findOneAndUpdate(
        { email: judges[i] },
        { groups: [existingGroup.id] },
      );

      if (judgeUser) {
        await BusinessIdea.updateMany(
          { userId: judgeUser.id },
          { visibleGroups: [existingGroup.id] },
        );
        await Pitch.updateMany({ userId: judgeUser.id }, { visibleGroups: [existingGroup.id] });
      }
    }
  }
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  // Write migration here
}

module.exports = { up, down };
