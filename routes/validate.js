const { validationResult } = require('express-validator');

/**
 * Checks if request has any validation errors and if it does,
 * then replies with error response and list of errors
 */
function validateRequest(req, res, next)
{
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        // no validation errors found, continuing
        return next();
    }

    const extractedErrors = [];
    errors.array()
        .map(err => extractedErrors.push({ [err.param]: err.msg }));

    return res
        .status(422)
        .json({ errors: extractedErrors });
}

module.exports = {
    request: validateRequest
}