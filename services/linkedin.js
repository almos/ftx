const admin = require('firebase-admin');
const axios = require('axios');
const logger = require('./logger').instance;
const userService = require('./user');
const config = require('../config/index');
let state;

function generateState() {
  let randomState = Math.random().toString(36).substr(2, 10);
  state = randomState;
  return state;
}
/**
 * Get access_token from linkedin
 *
 * @param auth_code - authorization code from linkedin
 * @param state - random string (should be equal)
 * @returns {string} - linkedin access token
 */
async function getLinkedinAccessToken(auth_code) {
  try {
    const response = await axios.post(
      `https://www.linkedin.com/oauth/v2/accessToken?grant_type=authorization_code&code=${auth_code}&client_id=${config.linkedin.clientId}&client_secret=${config.linkedin.clientSecret}&redirect_uri=${config.linkedin.redirectUri}&state=${state}`,
    );
    return response.data.access_token;
  } catch (error) {
    logger.error(
      `Error occurred while fetching LinkedIn tokens for auth_code=${auth_code}. Error: ${error.message}`,
    );
    throw error;
  }
}

/**
 * Perform an API request to LinkedIn
 *
 * @param url - request url to fetch data from
 * @param token - LinkedIn user's access_token
 * @param method - request method, default is GET
 * @returns {object}
 */
async function makeApiRequest(url, method = 'get') {
  try {
    let response = await axios({ method: method, url: url });
    return response.data;
  } catch (error) {
    logger.error(`Error performing Linkedin API request. URL: ${url}. Error: ${error.message}`);
    throw error;
  }
}

/**
 * Get user photo using LinkedIn API
 *
 * @param token - LinkedIn user's access_token
 * @returns {"profilePicture":{"displayImage":"urn:li:digitalmediaAsset:C5603AQHpClibLq7hLw","displayImage~":{"paging":{"count":10,"start":0,"links":[]},"elements":[{"artifact":"urn:li:digitalmediaMediaArtifact:(urn:li:digitalmediaAsset:C5603AQHpClibLq7hLw,urn:li:digitalmediaMediaArtifactClass:profile-displayphoto-shrink_100_100)","authorizationMethod":"PUBLIC","data":{"com.linkedin.digitalmedia.mediaartifact.StillImage":{"storageSize":{"width":100,"height":100},"storageAspectRatio":{"widthAspect":1.0,"heightAspect":1.0,"formatted":"1.00:1.00"},"mediaType":"image/jpeg","rawCodecSpec":{"name":"jpeg","type":"image"},"displaySize":{"uom":"PX","width":100.0,"height":100.0},"displayAspectRatio":{"widthAspect":1.0,"heightAspect":1.0,"formatted":"1.00:1.00"}}},"identifiers":[{"identifier":"https://media.licdn.com/dms/image/C5603AQHpClibLq7hLw/profile-displayphoto-shrink_100_100/0?e=1571875200&v=beta&t=DGLXoAVmGmZ4UXkSjFOMum_yI1KEFvMoB52n21WJfG4","file":"urn:li:digitalmediaFile:(urn:li:digitalmediaAsset:C5603AQHpClibLq7hLw,urn:li:digitalmediaMediaArtifactClass:profile-displayphoto-shrink_100_100,0)","index":0,"mediaType":"image/jpeg","identifierType":"EXTERNAL_URL","identifierExpiresInSeconds":1571875200}]},{"artifact":"urn:li:digitalmediaMediaArtifact:(urn:li:digitalmediaAsset:C5603AQHpClibLq7hLw,urn:li:digitalmediaMediaArtifactClass:profile-displayphoto-shrink_200_200)","authorizationMethod":"PUBLIC","data":{"com.linkedin.digitalmedia.mediaartifact.StillImage":{"storageSize":{"width":200,"height":200},"storageAspectRatio":{"widthAspect":1.0,"heightAspect":1.0,"formatted":"1.00:1.00"},"mediaType":"image/jpeg","rawCodecSpec":{"name":"jpeg","type":"image"},"displaySize":{"uom":"PX","width":200.0,"height":200.0},"displayAspectRatio":{"widthAspect":1.0,"heightAspect":1.0,"formatted":"1.00:1.00"}}},"identifiers":[{"identifier":"https://media.licdn.com/dms/image/C5603AQHpClibLq7hLw/profile-displayphoto-shrink_200_200/0?e=1571875200&v=beta&t=Ziud4Lb-F2g6sm6BdbwRMWU-8i9fRLY6jJqw9mpueYU","file":"urn:li:digitalmediaFile:(urn:li:digitalmediaAsset:C5603AQHpClibLq7hLw,urn:li:digitalmediaMediaArtifactClass:profile-displayphoto-shrink_200_200,0)","index":0,"mediaType":"image/jpeg","identifierType":"EXTERNAL_URL","identifierExpiresInSeconds":1571875200}]},{"artifact":"urn:li:digitalmediaMediaArtifact:(urn:li:digitalmediaAsset:C5603AQHpClibLq7hLw,urn:li:digitalmediaMediaArtifactClass:profile-displayphoto-shrink_400_400)","authorizationMethod":"PUBLIC","data":{"com.linkedin.digitalmedia.mediaartifact.StillImage":{"storageSize":{"width":400,"height":400},"storageAspectRatio":{"widthAspect":1.0,"heightAspect":1.0,"formatted":"1.00:1.00"},"mediaType":"image/jpeg","rawCodecSpec":{"name":"jpeg","type":"image"},"displaySize":{"uom":"PX","width":400.0,"height":400.0},"displayAspectRatio":{"widthAspect":1.0,"heightAspect":1.0,"formatted":"1.00:1.00"}}},"identifiers":[{"identifier":"https://media.licdn.com/dms/image/C5603AQHpClibLq7hLw/profile-displayphoto-shrink_400_400/0?e=1571875200&v=beta&t=rdQqf46Mo6c-I2jc1BuIZ8h4fBo3WgBl6IafWH5TFq8","file":"urn:li:digitalmediaFile:(urn:li:digitalmediaAsset:C5603AQHpClibLq7hLw,urn:li:digitalmediaMediaArtifactClass:profile-displayphoto-shrink_400_400,0)","index":0,"mediaType":"image/jpeg","identifierType":"EXTERNAL_URL","identifierExpiresInSeconds":1571875200}]},{"artifact":"urn:li:digitalmediaMediaArtifact:(urn:li:digitalmediaAsset:C5603AQHpClibLq7hLw,urn:li:digitalmediaMediaArtifactClass:profile-displayphoto-shrink_800_800)","authorizationMethod":"PUBLIC","data":{"com.linkedin.digitalmedia.mediaartifact.StillImage":{"storageSize":{"width":800,"height":800},"storageAspectRatio":{"widthAspect":1.0,"heightAspect":1.0,"formatted":"1.00:1.00"},"mediaType":"image/jpeg","rawCodecSpec":{"name":"jpeg","type":"image"},"displaySize":{"uom":"PX","width":800.0,"height":800.0},"displayAspectRatio":{"widthAspect":1.0,"heightAspect":1.0,"formatted":"1.00:1.00"}}},"identifiers":[{"identifier":"https://media.licdn.com/dms/image/C5603AQHpClibLq7hLw/profile-displayphoto-shrink_800_800/0?e=1571875200&v=beta&t=xs9FgLbNGDx_TLCr7XqfROszDmnQ0o153SgCTHCFPeM","file":"urn:li:digitalmediaFile:(urn:li:digitalmediaAsset:C5603AQHpClibLq7hLw,urn:li:digitalmediaMediaArtifactClass:profile-displayphoto-shrink_800_800,0)","index":0,"mediaType":"image/jpeg","identifierType":"EXTERNAL_URL","identifierExpiresInSeconds":1571875200}]}]}},"id":"RST39CgsmW"}
 */
function apiRequestUserPhoto(token) {
  const url = `https://api.linkedin.com/v2/me?projection=(id,profilePicture(displayImage~digitalmediaAsset:playableStreams))&oauth2_access_token=${token}`;
  return makeApiRequest(url);
}

/**
 * Get user email using LinkedIn API
 *
 * @param token - LinkedIn user's access_token
 * @returns {"elements":[{"handle~":{"emailAddress":"ruralcoder@gmail.com"},"handle":"urn:li:emailAddress:134932169"}]}
 */
function apiRequestUserEmail(token) {
  const url = `https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))&oauth2_access_token=${token}`;
  return makeApiRequest(url);
}

/**
 * Get user first name and last name from linkedin API
 *
 * @param token - LinkedIn user's access_token
 * @returns {
 *	 firstName:
 *    { localized: { en_US: 'Stephen' },
 *      preferredLocale: { country: 'US', language: 'en' } },
 *   lastName:
 *    { localized: { en_US: 'Anderson' },
 *      preferredLocale: { country: 'US', language: 'en' } },
 *   profilePicture:
 *    { displayImage: 'urn:li:digitalmediaAsset:C5603AQHpClibLq7hLw',
 *      'displayImage~': { paging: [Object], elements: [Array] } },
 *   id: 'RST39CgsmW' }
 */
function apiRequestUserProfile(token) {
  const url = `https://api.linkedin.com/v2/me?oauth2_access_token=${token}`;
  return makeApiRequest(url);
}

/**
 * Runs a series of API requests to gather the required user data
 * @param linkedinToken - LinkedIn user's access_token
 * @returns {Promise<{firstName: *, lastName: *, photoUrl: string, fullName: string, email: string, userUid}>}
 */
async function getLinkedinUserProfile(linkedinToken) {
  const profileObject = await apiRequestUserProfile(linkedinToken);
  const emailObject = await apiRequestUserEmail(linkedinToken);
  const photoObject = await apiRequestUserPhoto(linkedinToken);

  const userName = extractName(profileObject);
  const email = extractEmailAddress(emailObject);
  const photoUrl = extractPhotoUrl(photoObject);

  return {
    userUid: profileObject.id,
    fullName: `${userName.first} ${userName.last}`,
    firstName: userName.first,
    lastName: userName.last,
    email: email,
    photoUrl: photoUrl,
  };
}

/**
 * Logs in a LinkedIn user to Firebase using a LinkedIn OAuth token
 *
 * @param linkedinToken - LinkedIn user's access_token
 * @param userRole - FTX user role needed in case this is a user registration
 * @returns {string} - generated firebase custom token
 */
async function loginUser(linkedinToken, userRole) {
  try {
    let profileData = await getLinkedinUserProfile(linkedinToken);
    let loginPayload = await handleLinkedinUserLoginToFirebase(profileData, userRole);

    return loginPayload;
  } catch (error) {
    logger.error(
      `Error occurred while logging in a LinkedIn user to Firebase. LinkedIn token: ${linkedinToken}. Error: ${error.message}`,
    );
    throw error;
  }
}

/**
 * Extracts user's avatar photo URL from LinkedIn's API response payload
 *
 * @param photoObject - different user profile photos, and information about them obtained from LinkedIn API
 * @returns {string} - user avatar photo url extracted from the response payload
 */
function extractPhotoUrl(photoObject) {
  if (
    photoObject &&
    photoObject.profilePicture &&
    photoObject.profilePicture.displayImage &&
    photoObject.profilePicture['displayImage~'].elements
  ) {
    let elements = photoObject.profilePicture['displayImage~'].elements;

    for (let element of elements) {
      if ('artifact' in element) {
        if (!element.artifact.includes('profile-displayphoto-shrink_400_400')) {
          continue;
        }
        if ('identifiers' in element) {
          return element.identifiers[0].identifier;
        }
      }
    }
  }
}

/**
 * Extracts user's email from LinkedIn's API response payload
 *
 * @param emailObject - user email information obtained from LinkedIn API
 * @returns {string} - email extracted from the response payload
 */
function extractEmailAddress(emailObject) {
  if (
    emailObject &&
    emailObject.elements &&
    emailObject.elements[0] &&
    emailObject.elements[0]['handle~'] &&
    emailObject.elements[0]['handle~'].emailAddress
  ) {
    const email = emailObject.elements[0]['handle~'].emailAddress;
    return email;
  }
  logger.error(`Can't find email in Linkedin API emailObject`);
}

/**
 * Extracts user's first and last names from LinkedIn's API response payload
 *
 * @param profileObject - user profile information obtained from LinkedIn API
 * @returns {{last: null, first: null}|{last, first}}
 */
function extractName(profileObject) {
  let first, last;
  if (profileObject && profileObject.firstName && profileObject.lastName) {
    let firstLocale = profileObject.firstName.preferredLocale;
    const firstPreferred = `${firstLocale.language}_${firstLocale.country}`;
    first = profileObject.firstName.localized[firstPreferred];

    let lastLocale = profileObject.lastName.preferredLocale;
    const lastPreferred = `${lastLocale.language}_${lastLocale.country}`;
    last = profileObject.lastName.localized[lastPreferred];

    return { first: first, last: last };
  }

  logger.error(`Can't find first name or last name in Linkedin API profileObject`);
  return { first: null, last: null };
}

/**

 * If user doesn't exist, we create it in both Firebase and own database
 *
 * @returns {Promise<string>} The Firebase custom auth token in a promise.
 */

/**
 * Handles LinkedIn user login to the app.
 *
 * @param linkedinProfileData - profile informtion fetched through the LinkedIn API
 * @param userRole - FTX user role needed in case this is a user registration
 * @returns {Promise<{newUser: boolean, firebaseCustomToken: string}>} object with two fields - newUser is set to true if user has been just created. firebaseCustomToken contains a custom Firebase auth token
 */
async function handleLinkedinUserLoginToFirebase(linkedinProfileData, userRole) {
  logger.info(`Got request from ${linkedinProfileData.email} to create firebase account`);

  try {
    // trying to find an existing account with the specific e-mail address
    // if account exists we won't create a user
    let existingUser = await admin.auth().getUserByEmail(linkedinProfileData.email);
    let customToken = await admin.auth().createCustomToken(existingUser.uid);
    return { firebaseCustomToken: customToken, newUser: false };
  } catch (error) {
    // If user does not exists we create it.
    if (error.code === 'auth/user-not-found') {
      // The UID we'll assign to the user.
      const firebaseId = `linkedin:${linkedinProfileData.userUid}`;

      await admin
        .auth()
        .createUser({
          uid: firebaseId,
          displayName: `${linkedinProfileData.firstName} ${linkedinProfileData.lastName}`,
          photoURL: linkedinProfileData.photoUrl,
          email: linkedinProfileData.email,
          emailVerified: true,
        })
        .then(() => {
          // creating a user in our database
          userService.createUser(firebaseId, {
            email: linkedinProfileData.email,
            name: linkedinProfileData.firstName,
            surname: linkedinProfileData.lastName,
            avatarUrl: linkedinProfileData.photoUrl,
            verified: true,
            role: userRole,
            externalSystem: 'linkedin',
          });
        });

      const token = await admin.auth().createCustomToken(firebaseId);
      logger.info(
        `LinkedIn Firebase account successfully created for ${linkedinProfileData.email}`,
      );
      return { firebaseCustomToken: token, newUser: true };
    } else {
      logger.info(
        `LinkedIn Firebase login error for ${linkedinProfileData.email}. Error: ${error.message()}`,
      );
      throw error;
    }
  }
}

module.exports = {
  getLinkedinAccessToken: getLinkedinAccessToken,
  loginUser: loginUser,
  generateState: generateState,
};
