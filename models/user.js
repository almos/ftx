const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');
const roles = require('../config/security').userRoles;
const scopes = require('../config/security').userScopes;
const rolesList = require('../config/security').userRolesList;
const common = require('./common');
const aggregatePaginate = require('mongoose-aggregate-paginate-v2');
const mongoosePaginate = require('mongoose-paginate-v2');
const mongoTenant = require('../ext/node-mongo-tenant');
const defaultLanguageCode = require('../services/language').getDefaultLanguageCode;

let UserAnswersSchema = mongoose.Schema(
  {
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'SignupQuestion' },
    answer: [{ type: String }],
  },
  { _id: false },
);

let WorkExperienceItemSchema = mongoose.Schema(
  {
    companyName: { type: String },
    worksNow: { type: Boolean },
    jobTitle: { type: String },
    placeOfWork: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    imageUrl: { type: String },
  },
  { _id: true },
);

let PreferencesSchema = mongoose.Schema(
  {
    languages: [{ type: String }],
    areaOfExpertise: [{ type: String }],
    mentorNeeded: { type: Boolean },
    mentorTime: [{ type: String }],
    notifications: { type: Boolean, default: true },
    emailUpdates: { type: Boolean },
    recommendedStartups: [{ type: String }],
    regions: [{ type: String }],
    investmentRange: [{ type: String }],
    availableMentor: { type: Boolean },
  },
  { _id: false },
);

let EducationItemSchema = mongoose.Schema(
  {
    qualification: { type: String },
    institution: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    imageUrl: { type: String },
  },
  { _id: true },
);

let DeviceInformationSchema = mongoose.Schema(
  {
    fcmRegistrationToken: {
      type: String,
      required: [true, "can't be blank"],
    },
    deviceOs: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

let UTMSchema = mongoose.Schema(
  {
    source: { type: String },
    medium: { type: String },
    campaign: { type: String },
    term: { type: String },
    content: { type: String },
  },
  { _id: false },
);

let InterestedInFoundersScheme = mongoose.Schema(
  {
    lgbtq: { type: Boolean },
    disabled: { type: Boolean },
    diverse: { type: Boolean },
    female: { type: Boolean },
    veteran: { type: Boolean },
  },
  { _id: false },
);

let PastInvestmentsItemScheme = mongoose.Schema(
  {
    companyName: { type: String },
    sector: { type: String },
  },
  { _id: false },
);

let InvestorProfileSchema = mongoose.Schema(
  {
    investorType: { type: String, enum: ['angel', 'vc', 'pe'] },
    interestedInFounders: { type: InterestedInFoundersScheme },
    pastInvestments: [PastInvestmentsItemScheme],
  },
  { _id: false },
);

let MentorProfileSchema = mongoose.Schema(
  {
    sectors: [{ type: String }],
  },
  { _id: false },
);

let UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      acl: { get: [scopes.OWNER, roles.ADMIN] },
      lowercase: true,
      unique: true,
      required: [true, "can't be blank"],
      match: [/\S+@\S+\.\S+/, 'is invalid'],
      index: true,
    },
    firebaseId: { type: String, acl: { set: [roles.ADMIN], get: [scopes.OWNER, roles.ADMIN] } },
    createdAt: { type: Date, default: Date.now, acl: { set: [] } },
    name: { type: String, index: true },
    surname: { type: String, index: true },
    avatarUrl: { type: String },
    externalSystem: { type: String },
    bio: { type: String },
    utm: { type: UTMSchema },
    workExperience: [WorkExperienceItemSchema],
    education: [EducationItemSchema],
    investorProfile: { type: InvestorProfileSchema },
    mentorProfile: { type: MentorProfileSchema },
    languages: [String],
    skills: [String],
    country: { type: String },
    city: { type: String },
    gender: { type: String, enum: ['male', 'female'] },
    race: { type: String },
    exfounder: { type: Boolean },
    displayJobTitle: { type: String },
    linkedInProfileUrl: { type: String },
    twitterProfileUrl: { type: String },
    preferences: { type: PreferencesSchema },
    calendlyUrl: { type: String },
    verified: { type: Boolean, default: false, acl: { set: [roles.ADMIN] } },
    language: { type: String, default: defaultLanguageCode() },
    deleted: {
      type: Boolean,
      default: false,
      acl: { set: [roles.ADMIN], get: [roles.ADMIN] },
    },
    paid: {
      type: Boolean,
      default: false,
      acl: { set: [roles.ADMIN], get: [roles.ADMIN, scopes.OWNER] },
    },
    role: {
      type: String,
      enum: rolesList,
      default: roles.FOUNDER,
      acl: { set: [roles.ADMIN] },
      index: true,
    },
    hasMarketingConsent: {
      type: Boolean,
      default: false,
      acl: { get: [roles.ADMIN, scopes.OWNER] },
    },
    marketingConsentTimestamp: { type: Date, acl: { set: [], get: [roles.ADMIN, scopes.OWNER] } },
    theme: { type: String, enum: ['light', 'dark'], acl: { get: [roles.ADMIN, scopes.OWNER] } },
    watchedVideos: { type: Number, default: 0, acl: { set: [], get: [roles.ADMIN, scopes.OWNER] } },
    signupQuestions: [UserAnswersSchema],
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      acl: { set: [roles.ADMIN] },
    },
    groups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        acl: { set: [roles.ADMIN, roles.COHORT_ADMIN] },
      },
    ],
    devices: {
      type: [DeviceInformationSchema],
      acl: { get: [scopes.OWNER, roles.ADMIN], set: [scopes.OWNER, roles.ADMIN] },
    },
    mentors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        acl: { get: [scopes.OWNER, roles.ADMIN], set: [scopes.OWNER, roles.ADMIN] },
      },
    ],
    investors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        acl: { get: [scopes.OWNER, roles.ADMIN], set: [scopes.OWNER, roles.ADMIN] },
      },
    ],
  },
  {
    timestamps: true,
    toObject: {
      transform: common.idTransformer,
    },
  },
);

UserSchema.methods.getOwner = function () {
  return common.getOwner(this.id);
};

/**
 * Fulltext indices to search by user name, surname, email
 */
UserSchema.index({
  name: 'text',
  surname: 'text',
  email: 'text',
});

UserSchema.plugin(aggregatePaginate);
UserSchema.plugin(uniqueValidator, { message: 'is already taken.' });

mongoose.model('User', UserSchema);

module.exports = UserSchema;
