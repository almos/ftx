const router = require('express').Router();
const config = require('../../config/index');
const validate = require('../validate');
const roles = require('../../config/security').userRoles;
const { body, check, query, param } = require('express-validator');

const { getLinkedinAccessToken, loginUser, generateState } = require('../../services/linkedin');

/**
 * Endpoint for development purposes to test the LinkedIn authentication flow
 */
router.get('/linkedin/auth-start', (req, res, next) => {
  const state = generateState();

  try {
    res.redirect(
      `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${config.linkedin.clientId}&redirect_uri=${config.linkedin.redirectUri}&state=${state}&scope=r_liteprofile%20r_emailaddress`,
    );
  } catch (error) {
    console.error(error);
  } finally {
    res.end();
  }
});

/**
 * Endpoint for development purposes to obtain LI and FB tokens
 */
router.get('/linkedin', async (req, res, next) => {
  const code = req.query.code;
  const state = req.query.state;

  const linkedinToken = await getLinkedinAccessToken(code, state);
  return res.json({ payload: { linkedinToken: linkedinToken } });

  res.end();
});

/**
 * Endpoint for mobile clients to authorize with LinkedIn accounts via Firebase
 */
router.get(
  '/linkedin/auth',
  [
    // no acl checks, this is a public endpoint

    body('role').isIn([roles.FOUNDER, roles.INVESTOR]).optional(),
    body('token').notEmpty(),
    validate.request,
  ],
  async (req, res, next) => {
    try {
      const linkedinToken = req.body['token'],
        userRole = req.body['role'];

      const firebaseToken = await loginUser(linkedinToken, userRole);
      return res.json({ payload: { fbCustomToken: firebaseToken } });
    } catch (e) {
      return res.json({ error: { message: 'Unable to process Linkedin token' } });
    }
  },
);

module.exports = router;
