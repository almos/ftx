let nodemailer = require('nodemailer');
let config = require('../config');

/**
 * Constructs transport object to send email
 * @returns {Mail}
 */
function emailTransport() {
  return nodemailer.createTransport({
    service: config.email.smtpService,
    auth: {
      user: config.email.smtpUsername,
      pass: config.email.smtpPassword,
    },
  });
}

/**
 * Sends an email
 * @param from sender email
 * @param to email recipient
 * @param subject email subject
 * @param text email body
 * @returns {Promise<unknown>}
 */
function sendEmail(from, to, subject, html) {
  const emailMessage = {
    from: from,
    to: to,
    subject: subject,
    html: html,
  };

  return new Promise((resolve, reject) => {
    emailTransport().sendMail(emailMessage, function (err, info) {
      if (err) reject(err);
      else resolve(info);
    });
  });
}

/**
 * Sends email from the default smtp user
 */
function sendNoReplyEmail(to, subject, html) {
  return sendEmail(config.email.smtpUsername, to, subject, html);
}

module.exports = {
  sendEmail: sendEmail,
  sendNoReplyEmail: sendNoReplyEmail,
};
