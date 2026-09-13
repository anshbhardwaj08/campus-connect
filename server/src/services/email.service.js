const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PASS,
  },
});

const sendMail = async ({ to, subject, html }) => {
  return transporter.sendMail({
    from: `"Campus Connect" <${process.env.NODEMAILER_USER}>`,
    to,
    subject,
    html,
  });
};

const sendVerifyEmail = async (to, verifyLink) => {
  return sendMail({
    to,
    subject: 'Verify your Campus Connect account',
    html: `<p>Welcome to Campus Connect! Please verify your email by clicking the link below:</p>
           <p><a href="${verifyLink}">${verifyLink}</a></p>`,
  });
};

const sendOTPEmail = async (to, otp) => {
  return sendMail({
    to,
    subject: 'Your Campus Connect OTP',
    html: `<p>Your one-time password is: <b>${otp}</b>. It expires in 10 minutes.</p>`,
  });
};

const sendDealAlertEmail = async (to, dealDetails) => {
  return sendMail({
    to,
    subject: 'Deal update on Campus Connect',
    html: `<p>Your deal status has changed: ${dealDetails}</p>`,
  });
};

module.exports = { sendMail, sendVerifyEmail, sendOTPEmail, sendDealAlertEmail };
