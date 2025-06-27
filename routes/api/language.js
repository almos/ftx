const router = require('express').Router();
const languageService = require('../../services/language');

router.get('/', [], function (req, res, next) {
  return res.json({ payload: languageService.getLanguagesList() });
});

module.exports = router;
