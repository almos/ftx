const mongoose = require('mongoose');
require('../models');

/**
 * Connecting to MongoDB
 */
let mongoConnect = require('../config/beans/mongoose').connect();

const User = mongoose.model('User');

/**
 * Make any changes you need to make to the database here
 */
async function up() {
  await mongoConnect;
  await User.find({ name: { $exists: false }, surname: { $exists: false } }).then((users) => {
    users.forEach((user, index) => {
      User.updateOne({ _id: user.id }, { surname: `User${index + 1}` }).then(() => {});
    });
  });
}

/**
 * Make any changes that UNDO the up function side effects here (if possible)
 */
async function down() {}

module.exports = { up, down };
