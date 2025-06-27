const _ = require('lodash');

const languages = [
  {
    languageCode: 'en',
    languageName: 'English',
    localizedLanguageName: 'Eenglish',
    default: true,
  },
  {
    languageCode: 'fr',
    languageName: 'French',
    localizedLanguageName: 'Française',
    default: false,
  },
];

module.exports = {
  /**
   * Languages available in the system
   */
  languages: languages,
  languageCodeList: languages.map((language) => {
    return language.languageCode;
  }),
};
