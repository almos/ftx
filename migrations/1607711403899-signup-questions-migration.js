const mongoose = require('mongoose');
const mongooseModels = require('../models');
const SignupQuestion = mongoose.model('SignupQuestion');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  await mongoConnect;
  await SignupQuestion.create({
    key: 'iAm',
    question: 'I am an',
    answers: [
      { title: 'Entrepreneur', value: 'entrepreneur' },
      { title: 'Investor', value: 'investor' },
      { title: 'Ecosystem member', value: 'ecosystem-member' },
      { title: 'Coach', value: 'coach' },
    ],
    type: 'single',
  });

  await SignupQuestion.create({
    key: 'myStage',
    question: 'What stage would you describe your business/the businesses you work with?',
    answers: [
      { title: 'Self-funded', value: 'self-funded' },
      { title: 'Idea', value: 'idea' },
      { title: 'Pre-Seed', value: 'pre-seed' },
      { title: 'Seed', value: 'seed' },
      { title: 'Series A', value: 'series-a' },
      { title: 'Series B', value: 'series-b' },
      { title: 'Series C', value: 'series-c' },
    ],
    type: 'single',
  });

  await SignupQuestion.create({
    key: 'myIndustries',
    question: 'What vertical is your business/the businesses you work with in?',
    answers: [
      { title: 'Aerospace', value: 'aerospace' },
      { title: 'Agriculture', value: 'agriculture' },
      { title: 'Beauty', value: 'beauty' },
      { title: 'Computing', value: 'computing' },
      { title: 'Construction', value: 'construction' },
      { title: 'E-commerce', value: 'e-commerce' },
      { title: 'Electronics', value: 'electronics' },
      { title: 'Energy', value: 'energy' },
      { title: 'Entertainment', value: 'entertainment' },
      { title: 'Fashion', value: 'fashion' },
      { title: 'Food', value: 'food' },
      { title: 'Health care', value: 'health-care' },
      { title: 'Hospitality', value: 'hospitality' },
      { title: 'Manufacturing', value: 'manufacturing' },
      { title: 'Mining', value: 'mining' },
      { title: 'Music', value: 'music' },
      { title: 'News Media', value: 'news-media' },
      { title: 'Pharmaceutical', value: 'pharmaceutical' },
      { title: 'Telecommunications', value: 'telecommunications' },
      { title: 'Transport', value: 'transport' },
      { title: 'Other', value: 'other' },
    ],
    type: 'multi',
  });

  await SignupQuestion.create({
    key: 'myGoals',
    question: 'What are your goals?',
    answers: [
      { title: 'Raise capital', value: 'raise-capital' },
      { title: 'Get more customers', value: 'get-more-customers' },
      { title: 'Be inspired', value: 'be-inspired' },
      { title: 'Community', value: 'community' },
      { title: 'Deal sourcing', value: 'deal-sourcing' },
    ],
    type: 'multi',
  });
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {}

module.exports = { up, down };
