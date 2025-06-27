const mongoose = require('mongoose');
require('../models');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();
const _ = require('lodash');

const Organization = mongoose.model('Organization');
const User = mongoose.model('User');
const OrganizationMappings = mongoose.model('OrganizationMappings');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  await mongoConnect;

  let tefOrganization = await Organization.findOne({ tenantAlias: 'tef' });

  let users = await User.find({ organization: null }).exec();
  await users.forEach((user) => {
    OrganizationMappings.findOne({ email: user.email }).then((mapping) => {
      if (!mapping) return;
      User.updateOne({ _id: user.id }, { organization: tefOrganization.id }).exec();
      console.log(`${user.email} has been attached to tef (${tefOrganization.id}) organization`);
    });
  });
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  // Write migration here
}

module.exports = { up, down };
