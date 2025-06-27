const { validationResult } = require('express-validator');
const router = require('express').Router();
const eventbus = require('../../services/eventbus');
const events = eventbus.events;

/**
 * Importing API routes here
 */
router.use('/user', require('./users'));
router.use('/preuser', require('./preusers'));
router.use('/video', require('./video'));
router.use('/signup-questions', require('./signup-questions'));
router.use('/business-idea', require('./business-idea'));
router.use('/pitch', require('./pitch'));
router.use('/review-categories', require('./review-categories'));
router.use('/dev', require('./dev'));
router.use('/author', require('./author'));
router.use('/playlist', require('./playlist'));
router.use('/group', require('./group'));
router.use('/language', require('./language'));
router.use('/integration', require('./linkedin'));
router.use('/match', require('./match'));
router.use('/connection', require('./user-connection'));
router.use('/bookmark', require('./bookmark'));
router.use('/system-config', require('./system-config'));
router.use('/community', require('./community'));
router.use('/notification', require('./notification'));

/**
 * Top level error-handler for API routes
 */
router.use(function (err, req, res, next) {
  // database layer validation errors
  // such errors need special handling as it could be multiple errors generated

  if (err.name === 'ValidationError') {
    reportError(422, req);
    res.status(422);
    return res.json({
      errors: Object.keys(err.errors).reduce(function (errors, key) {
        errors[key] = err.errors[key].message;
        return errors;
      }, {}),
    });
  } else if (err.custom != undefined) {
    res.status(err.code);
    reportError(err.code, req);
    return res.json({ errors: [err.message] });
  }

  res.status(500);
  reportError(500, req);

  // all other errors
  return res.json({ errors: [err.message] });
});

function reportError(code, req) {
  let email = req.locals && req.locals.user_object ? req.locals.user_object.email : null,
    org = req.locals && req.locals.user_meta ? req.locals.user_meta.orgTag : null;

  // sending a event bus message on the API error
  eventbus.instance.emit(events.ERROR_API, null, {
    code: code,
    endpoint: req.url,
    org: org,
    email: email,
  });
}

module.exports = router;
