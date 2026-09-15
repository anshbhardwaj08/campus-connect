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

// Twilio is a paid service, so local development runs without it. A real
// account SID always starts with "AC" — the placeholder in .env.example does
// not, which is what distinguishes "not set up yet" from "set up".
const isTwilioConfigured = () =>
  Boolean(
    process.env.TWILIO_ACCOUNT_SID?.startsWith('AC') &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE
  );

/**
 * Sends the OTP by SMS, or mocks it when Twilio is not configured.
 *
 * In mock mode the code is printed to the server console and returned to the
 * caller so the dev can actually complete the flow. Production NEVER mocks:
 * silently accepting unverifiable phone numbers there would be worse than a
 * clear failure, so it throws instead.
 *
 * @returns {Promise<{ mocked: boolean, otp?: string }>}
 */
const sendPhoneOTP = async (phone, otp) => {
  if (!isTwilioConfigured()) {
    if (process.env.NODE_ENV === 'production') {
      const err = new Error('SMS is not configured on this server');
      err.statusCode = 503;
      throw err;
    }

    console.log(
      [
        '',
        '  ┌─ MOCK SMS ───────────────────────────────',
        `  │  to    ${phone}`,
        `  │  code  ${otp}`,
        '  │  Twilio is not configured — nothing was sent.',
        '  └──────────────────────────────────────────',
        '',
      ].join('\n')
    );

    return { mocked: true, otp };
  }

  await getClient().messages.create({
    body: `Your Campus Connect verification code is ${otp}. It expires in 10 minutes.`,
    from: process.env.TWILIO_PHONE,
    to: phone,
  });

  return { mocked: false };
};

module.exports = { sendPhoneOTP, isTwilioConfigured };
