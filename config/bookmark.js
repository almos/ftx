const _ = require('lodash');

const bookmarkTypes = {
  FOUNDER: 'founder',
  MENTOR: 'mentor',
  INVESTOR: 'investor',
  PITCH: 'pitch',
};

const bookmarkModels = {
  USER: 'User',
  PITCH: 'Pitch',
};

module.exports = {
  bookmarkTypes: bookmarkTypes,
  bookmarkTypesList: _.values(bookmarkTypes),
  bookmarkModels: bookmarkModels,
  bookmarkTypeModelList: _.values(bookmarkModels),
};
