const admin = require('firebase-admin');
const config = require('../config');
const agenda = require('../config/beans/agenda');
const serviceAccount = require(`../${config.firebase.configFile()}`);
const axios = require('axios');
const errors = require('./error');
const { readFile } = require('../utils/fileutils');
const Mustache = require('mustache');
const { getApiUrl } = require('../config');
const _ = require('lodash');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: config.firebase.databaseUrl(),
});

/**
 * Validates user token against firebase
 */
function verifyToken(firebaseToken) {
  return admin.auth().verifyIdToken(firebaseToken);
}

async function blah() {
  let array = [];
  let result = null;
  let i = 0;

  do {
    result = await admin.auth().listUsers(100, result ? result.pageToken : undefined);
    array = _.concat(array, result.users);
    console.log(`${result.users.length}  items fetched`);

    let uids = [];
    _.forEach(result.users, (value) => {
      uids.push(value.uid);
    });

    admin
      .auth()
      .deleteUsers(uids)
      .then((v) => {
        console.log(`deleted users ${uids}`);
      });
    //console.log(value);
  } while (result.pageToken);

  // let dump = JSON.stringify(array);
  // let fs = require('fs');
  // fs.writeFile('/Volumes/work/ftx/product-bucket-last.json', dump, 'utf8', () => {
  //   console.log('done');
  // });

  console.log('yay');
}

/**
 * Creates user in firebase
 */
function createUser(email, password) {
  return admin.auth().createUser({ email: email, password: password });
}

/**
 * Obtains client token
 */
function obtainFirebaseUserToken(email, password) {
  return axios({
    method: 'post',
    url: config.firebase.getClientTokenUrl(),
    data: { email: email, password: password, returnSecureToken: true },
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
  });
}

/**
 * Gets user from firebase
 */
function findUser(firebaseId) {
  return admin.auth().getUser(firebaseId);
}

/**
 * Updates existing user in firebase
 */
function updateUser(firebaseId, email) {
  return admin.auth().updateUser(firebaseId, { email: email });
}

/**
 * Deletes existing user in firebase
 */
function deleteUser(firebaseId) {
  return admin.auth().deleteUser(firebaseId);
}

/**
 * Generates a password reset link of an existing user in firebase
 */
function generatePasswordResetLink(email) {
  return admin.auth().generatePasswordResetLink(email);
}

/**
 * Generates an user email validation link
 */
function generateEmailValidationLink(email) {
  return admin.auth().generateEmailVerificationLink(email);
}

/**
 * Implements a reset password flow
 * @param userEmail user email to reset password for
 */
function resetPassword(userEmail) {
  return new Promise((resolve, reject) => {
    generatePasswordResetLink(userEmail)
      .then(async (resetLink) => {
        const templatePath = './views/resetPassword.html';
        const source = await readFile(templatePath);

        const html = Mustache.render(source, {
          resetLink: resetLink,
          ftLogoUrl: `${getApiUrl()}/images/ftLogoColour.png`,
        });
        let email = {
          html: html,
          subject: 'FTX password reset',
          recipient: userEmail,
        };
        agenda.run(agenda.jobs.EMAIL_SEND, email);
      })
      .then(() => {
        resolve();
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function pushNotificationToDevice(user, notificationObject, pushNotification, badgeCount) {
  return new Promise((resolve, reject) => {
    try {
      if (!user.devices || !user.devices.length) {
        throw new errors.IllegalStateError('No devices registered for this user');
      }

      const message = {
        tokens: user.devices.map((device) => {
          return device.fcmRegistrationToken;
        }),
      };

      if (notificationObject) {
        message.data = {
          payload: JSON.stringify(notificationObject.filterOut(user)),
          badgeCount: badgeCount.toString(),
        };
      }

      if (
        pushNotification.sendPushNotification &&
        user.preferences &&
        user.preferences.notifications
      ) {
        message.notification = pushNotification.notification;
        // message.android = pushNotification.android;
        // message.apns = pushNotification.apns;
      }
      resolve(admin.messaging().sendMulticast(message));
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  blah: blah,
  verifyToken: verifyToken,
  createUser: createUser,
  updateUser: updateUser,
  findUser: findUser,
  deleteUser: deleteUser,
  resetPassword: resetPassword,
  getEmailValidationLink: generateEmailValidationLink,
  obtainFirebaseUserToken: obtainFirebaseUserToken,
  pushNotificationToDevice: pushNotificationToDevice,
};
