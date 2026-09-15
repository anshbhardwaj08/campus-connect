const nodemailer = require('nodemailer');

// Explicit host/port rather than `service: 'gmail'`, which defaults to port
// 465 (implicit TLS). Plenty of networks and cloud hosts block 465 outbound
// while leaving 587 open, and the failure looks like a hang — ETIMEDOUT at
// connect, long before auth — which is easy to misread as bad credentials.
// 587 + STARTTLS is the safer default. Override per environment if needed.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // STARTTLS is negotiated after connecting
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

const sendPasswordResetEmail = async (to, resetLink) => {
  return sendMail({
    to,
    subject: 'Reset your Campus Connect password',
    html: `<p>Someone asked to reset the password for this Campus Connect account.</p>
           <p><a href="${resetLink}">${resetLink}</a></p>
           <p>The link works once and expires in an hour. If this was not you,
              ignore this email — nothing has changed.</p>`,
  });
};

const sendDealAlertEmail = async (to, dealDetails) => {
  return sendMail({
    to,
    subject: 'Deal update on Campus Connect',
    html: `<p>Your deal status has changed: ${dealDetails}</p>`,
  });
};

module.exports = {
  sendMail,
  sendVerifyEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
  sendDealAlertEmail,
};
