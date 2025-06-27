/**
 * This module is responsible for providing various metrics related to system objects
 */

const mongoose = require('mongoose');
const User = mongoose.model('User');
const Organization = mongoose.model('Organization');
const BusinessIdea = mongoose.model('BusinessIdea');
const Pitch = mongoose.model('Pitch');
const _ = require('lodash');

const metricTypes = {
  ALL_PLATFORM_USERS: 'allPlatformUsers', //
  ALL_PLATFORM_USERS_WITH_AVATARS: 'allPlatformUsersWithAvatars', //
  ALL_PLATFORM_USERS_WITH_NAME_SURNAME: 'allPlatformUsersWithNameSurname', //
  ALL_PLATFORM_USERS_WITH_PITCHES: 'allPlatformUsersWithPitches', //
  ALL_ORG_USERS: 'allOrgUsers',
  ALL_NON_ORG_USERS: 'nonOrgUsers', //
  ORG_USERS: 'orgUsers', //
  ALL_PLATFORM_BUSINESSIDEAS: 'allPlatformBusinessIdeas', //
  ALL_ORG_BUSINESSIDEAS: 'allOrgBusinessIdeas', //
  ALL_PLATFORM_PITCHES: 'allPlatformPitches', //
  ALL_ORG_PITCHES: 'allOrgPitches', //
  ALL_PLATFORM_PITCHES_WITH_REVIEWS: 'allPlatformPitchesWithReviews', //
};

/**
 * Count of all users on the platform except those created by *@ftx.com users
 */
function countAllPlatformUsers() {
  return User.countDocuments({ email: { $not: /ftx.com/ } }).exec();
}

/**
 * Count of users that are part of any organization except *@ftx.com users
 */
function countAllOrganizationUsers() {
  return User.countDocuments({
    organization: { $ne: null },
    email: { $not: /ftx.com/ },
  }).exec();
}

/**
 * Count of users that are not part of any organization except *@ftx.com users
 */
function countAllNonOrganizationUsers() {
  return User.countDocuments({
    organization: { $eq: null },
    email: { $not: /ftx.com/ },
  }).exec();
}

/**
 * Count of users that are part of any organization except *@ftx.com users
 */
function groupedUserCountPerOrganization() {
  return Organization.find()
    .lean()
    .exec()
    .then((organizations) => {
      return User.aggregate([
        { $match: { email: { $not: /ftx.com/ } } },
        { $group: { _id: '$organization', count: { $sum: 1 } } },
      ])
        .exec()
        .then((orgCounts) => {
          let result = [];

          organizations.forEach((org) => {
            let aggregatedCount = _.find(orgCounts, (obj) => org._id.equals(obj._id));
            result.push({ org: org.tenantAlias, count: aggregatedCount.count });
          });

          return result;
        });
    });
}

/**
 * Count of all business ideas on the platform except those created by *@ftx.com users
 */
function countAllPlatformBusinessIdeas() {
  return countAllGeneric(BusinessIdea);
}

/**
 * Grouped counts of business ideas per organization except those created by *@ftx.com users
 */
function groupedBusinessIdeasCountPerOrganization() {
  return countAllOrgGroupedGeneric(BusinessIdea);
}

/**
 * Count of all pitches (with videos), pitches that have been submitted,
 * have been approved, have been rejected on the platform except those created by *@ftx.com users
 */
function countAllPlatformPitches() {
  return countAllGeneric(Pitch, {
    $match: { video: { $ne: null } },
  });
}

/**
 * Grouped counts of pitches (with videos) per organization except those created by *@ftx.com users
 */
function groupedPitchesCountPerOrganization() {
  return countAllOrgGroupedGeneric(Pitch, {
    $match: { video: { $ne: null } },
  });
}

/**
 * Count of pitches that have reviews except those created by *@ftx.com users
 */
function countAllPlatformPitchesWithReviews() {
  return countAllGeneric(Pitch, {
    $match: { 'reviews.1': { $exists: true } },
  });
}

/**
 * Counts a percentage of users with a profile photo
 */
function countPercentOfPlatformUsersWithAvatar() {
  let allPlatformUsers = 0;
  return countAllOrganizationUsers()
    .then((count) => {
      allPlatformUsers = count;
    })
    .then(() =>
      User.countDocuments({
        email: { $not: /ftx.com/ },
        avatarUrl: { $ne: null },
      }).exec(),
    )
    .then((filledProfileCount) => {
      return (filledProfileCount * 100.0) / allPlatformUsers;
    });
}

/**
 * Counts a percentage of users with name and surname set
 */
function countPercentOfPlatformUsersWithNameAndSurname() {
  let allPlatformUsers = 0;
  return countAllOrganizationUsers()
    .then((count) => {
      allPlatformUsers = count;
    })
    .then(() =>
      User.countDocuments({
        email: { $not: /ftx.com/ },
        name: { $ne: null },
        surname: { $ne: null },
      }).exec(),
    )
    .then((filledNameSurnameCount) => {
      return (filledNameSurnameCount * 100.0) / allPlatformUsers;
    });
}

/**
 * Counts a percentage of users with at least one pitch uploaded
 */
function countPercentOfPlatformUsersWithAtLeastOnePitch() {
  let allPlatformUsers = 0;
  return countAllOrganizationUsers()
    .then((count) => {
      allPlatformUsers = count;
    })
    .then(() =>
      Pitch.aggregate([
        { $lookup: { from: 'users', localField: 'userId', as: 'userId', foreignField: '_id' } },
        { $unwind: '$userId' },
        { $match: { 'userId.email': { $not: /ftx.com/ } } },
        { $group: { _id: '$userId._id', count: { $sum: 1 } } },
        { $group: { _id: null, count: { $sum: 1 } } },
      ]).exec(),
    )
    .then((usersWithAtLeastOnePitchCount) => {
      let count =
        usersWithAtLeastOnePitchCount && usersWithAtLeastOnePitchCount.length
          ? usersWithAtLeastOnePitchCount[0].count
          : 0;
      return (count * 100.0) / allPlatformUsers;
    });
}

function countAllGeneric(model, match) {
  let aggregate = [
    { $lookup: { from: 'users', localField: 'userId', as: 'userId', foreignField: '_id' } },
    { $unwind: '$userId' },
    { $match: { 'userId.email': { $not: /ftx.com/ } } },
  ];
  if (match) {
    aggregate.push(match);
  }
  aggregate.push({ $group: { _id: null, count: { $sum: 1 } } });

  return model
    .aggregate(aggregate)
    .exec()
    .then((orgCounts) => {
      return orgCounts && orgCounts.length ? orgCounts[0].count : 0;
    });
}

function countAllOrgGroupedGeneric(model, match) {
  let aggregate = [
    { $lookup: { from: 'users', localField: 'userId', as: 'userId', foreignField: '_id' } },
    { $unwind: '$userId' },
    { $match: { 'userId.email': { $not: /ftx.com/ } } },
  ];
  if (match) {
    aggregate.push(match);
  }
  aggregate.push({ $group: { _id: '$userId.organization', count: { $sum: 1 } } });

  return Organization.find()
    .lean()
    .exec()
    .then((organizations) => {
      return model
        .aggregate(aggregate)
        .exec()
        .then((orgCounts) => {
          let result = [];

          organizations.forEach((org) => {
            let aggregatedCount = _.find(orgCounts, (obj) => org._id.equals(obj._id));
            result.push({ org: org.tenantAlias, count: aggregatedCount.count });
          });

          return result;
        });
    });
}

module.exports = {
  metricTypes: metricTypes,
  countAllPlatformUsers: countAllPlatformUsers,
  countAllOrganizationUsers: countAllOrganizationUsers,
  countAllNonOrganizationUsers: countAllNonOrganizationUsers,
  groupedUserCountPerOrganization: groupedUserCountPerOrganization,
  countAllPlatformBusinessIdeas: countAllPlatformBusinessIdeas,
  groupedBusinessIdeasCountPerOrganization: groupedBusinessIdeasCountPerOrganization,
  countAllPlatformPitches: countAllPlatformPitches,
  groupedPitchesCountPerOrganization: groupedPitchesCountPerOrganization,
  countAllPlatformPitchesWithReviews: countAllPlatformPitchesWithReviews,
  countPercentOfPlatformUsersWithAvatar: countPercentOfPlatformUsersWithAvatar,
  countPercentOfPlatformUsersWithNameAndSurname: countPercentOfPlatformUsersWithNameAndSurname,
  countPercentOfPlatformUsersWithAtLeastOnePitch: countPercentOfPlatformUsersWithAtLeastOnePitch,
};
