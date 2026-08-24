const crypto = require('crypto');

const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

const generateRandomPassword = (length = 10) => {
  let password = '';
  for (let i = 0; i < length; i += 1) {
    password += CHARSET[crypto.randomInt(0, CHARSET.length)];
  }
  return password;
};

module.exports = generateRandomPassword;
