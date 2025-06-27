const _ = require('lodash');
const languages = require('../config/languages').languages;

/**
 * Get default language
 */
function getDefaultLanguageCode() {
  for (let e of languages) {
    if (e.default) return e.languageCode;
  }
}

function getLanguagesList() {
  return languages;
}

function getLanguagesCodeList() {
  return languages.map((e) => e.languageCode);
}

module.exports = {
  getDefaultLanguageCode: getDefaultLanguageCode,
  getLanguagesList: getLanguagesList,
  getLanguagesCodeList: getLanguagesCodeList,
};
