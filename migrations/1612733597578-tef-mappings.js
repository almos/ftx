const mongoose = require('mongoose');
const lineByLine = require('n-readlines');
require('../models');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();
const _ = require('lodash');

const Organization = mongoose.model('Organization');
const OrganizationMappings = mongoose.model('OrganizationMappings');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  await mongoConnect;

  await Organization.insertMany([
    { title: 'Tony Elumelu Foundation', tenantAlias: 'tef', hidden: true },
  ]);
  let tefOrganization = await Organization.findOne({ tenantAlias: 'tef' });
  console.log(tefOrganization);

  await OrganizationMappings.deleteMany({ tenantAlias: 'tef' });

  let line,
    liner = new lineByLine('./migrations/resources/tef-participants.csv'),
    arr = [];

  while ((line = liner.next())) {
    arr.push({ email: line.toString('ascii').trimEnd(), organization: tefOrganization._id });
  }

  await OrganizationMappings.insertMany(arr);
  console.log(`${arr.length} emails imported`);
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {
  // Write migration here
}

module.exports = { up, down };
