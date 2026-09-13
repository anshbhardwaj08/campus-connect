const twilio = require('twilio');

// Created lazily (not at module load) so the server can start even before
// real Twilio credentials are configured in .env.
let client = null;
const getClient = () => {
  if (!client) {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return client;
};

const sendPhoneOTP = async (phone, otp) => {
  return getClient().messages.create({
    body: `Your Campus Connect verification code is ${otp}. It expires in 10 minutes.`,
    from: process.env.TWILIO_PHONE,
    to: phone,
  });
};

module.exports = { sendPhoneOTP };
