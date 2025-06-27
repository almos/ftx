const _ = require('lodash');

const types = {
  MENTOR: 'mentor-founder',
};

module.exports = {
  userConnectionTypes: types,
  userConnectionTypesList: _.values(types),
};
