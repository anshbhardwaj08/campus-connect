// Outbound email, over whichever transport the environment can actually use.
//
// Render's free tier blocks outbound SMTP (ports 25, 465 and 587) — the
// connection is dropped rather than refused, so nodemailer waits on the OS
// TCP timeout. Measured against the deployed service on 2026-11-14: a
// password-reset request took 120.5 seconds to return, against 0.3s for an
// address with no account, which sends nothing. The student saw a spinner,
// then "a link is on its way", for an email that never left the building.
//
// So there are two transports, chosen by what is configured:
//
//   BREVO_API_KEY set  -> Brevo's HTTP API over 443, which is never blocked
//   otherwise          -> SMTP, which works fine on a laptop
//
// Local development keeps working untouched; production stops depending on
// a port the host refuses to open. The exported functions are identical
// under both, so nothing that sends mail needs to know which is in use.
const nodemailer = require('nodemailer');

const FROM_NAME = 'Campus Connect';
const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

// Ten seconds is far longer than a reachable mail service needs, and short
// enough that an unreachable one fails while somebody is still looking at
// the screen. Applies to both transports.
const TIMEOUT_MS = Number(process.env.MAIL_TIMEOUT_MS) || 10_000;

// Brevo verifies a single sender address rather than a whole domain, so
// this can be an ordinary mailbox — no DNS access needed. Falls back to the
// SMTP user so a half-configured environment still addresses mail sensibly.
const senderAddress = () => process.env.MAIL_FROM || process.env.NODEMAILER_USER;

const useHttpApi = () => Boolean(process.env.BREVO_API_KEY);

// --- SMTP -----------------------------------------------------------------
// Built lazily: with the HTTP API configured, nothing here is ever used, and
// creating a transport at import time would open a pool for no reason.
let transporter;
const smtpTransport = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false, // STARTTLS is negotiated after connecting
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS,
      },
      connectionTimeout: TIMEOUT_MS,
      greetingTimeout: TIMEOUT_MS,
      socketTimeout: TIMEOUT_MS,
    });
  }
  return transporter;
};

const sendOverSmtp = ({ to, subject, html, text }) =>
  smtpTransport().sendMail({
    from: `"${FROM_NAME}" <${senderAddress()}>`,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
  });

// --- Brevo HTTP API -------------------------------------------------------
// Node 22 has fetch built in, so this adds no dependency — which matters on
// a host where the SMTP client was the only reason nodemailer was loaded.
const sendOverHttp = async ({ to, subject, html, text }) => {
  const res = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: senderAddress() },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      ...(text ? { textContent: text } : {}),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    // Brevo answers a rejection with JSON explaining it — an unverified
    // sender, a spent quota, a bad key. Carry that through instead of a
    // bare status, because every one of those needs a different fix and
    // the message is the only thing that says which.
    const detail = await res.text().catch(() => '');
    throw new Error(`Brevo refused the message (${res.status}): ${detail.slice(0, 300)}`);
  }

  return res.json().catch(() => ({}));
};

// --- the seam -------------------------------------------------------------
const sendMail = ({ to, subject, html, text }) =>
  (useHttpApi() ? sendOverHttp : sendOverSmtp)({ to, subject, html, text });

// The link is deliberately NOT wrapped in an <a> tag, and must not be.
//
// Brevo rewrites every href it finds into a click-tracking redirect on
// sendibt2.com, and those redirects answer 404 — so the anchor arrives
// broken and the student sees "page not found" instead of a reset form.
// Disabling link tracking is an Enterprise-only setting, and there is no
// per-message switch in the API.
//
// Measured on 2026-11-20 by sending one message carrying the same URL both
// ways: the href came back rewritten, the bare text came back untouched.
// Gmail and every other mainstream client turn a bare URL into a link
// themselves, so this reads the same to a student and actually works.
const linkBlock = (url) =>
  `<p style="word-break:break-all;font-family:monospace">${url}</p>
   <p style="color:#555;font-size:13px">If that is not clickable, copy it into your browser.</p>`;

const sendVerifyEmail = async (to, verifyLink) =>
  sendMail({
    to,
    subject: 'Verify your Campus Connect account',
    html: `<p>Welcome to Campus Connect! Verify your email by opening this link:</p>
           ${linkBlock(verifyLink)}`,
    text: `Welcome to Campus Connect. Verify your email by opening this link:

${verifyLink}
`,
  });

const sendOTPEmail = async (to, otp) =>
  sendMail({
    to,
    subject: 'Your Campus Connect OTP',
    html: `<p>Your one-time password is: <b>${otp}</b>. It expires in 10 minutes.</p>`,
  });

const sendPasswordResetEmail = async (to, resetLink) =>
  sendMail({
    to,
    subject: 'Reset your Campus Connect password',
    html: `<p>Someone asked to reset the password for this Campus Connect account.</p>
           ${linkBlock(resetLink)}
           <p>The link works once and expires in an hour. If this was not you,
              ignore this email — nothing has changed.</p>`,
    text:
      `Someone asked to reset the password for this Campus Connect account.

` +
      `${resetLink}

` +
      `The link works once and expires in an hour. If this was not you, ignore this email.
`,
  });

const sendDealAlertEmail = async (to, dealDetails) =>
  sendMail({
    to,
    subject: 'Deal update on Campus Connect',
    html: `<p>Your deal status has changed: ${dealDetails}</p>`,
  });

module.exports = {
  sendMail,
  sendVerifyEmail,
  sendOTPEmail,
  sendPasswordResetEmail,
  sendDealAlertEmail,
  // For the pre-deploy check, which reports which transport is live.
  useHttpApi,
  senderAddress,
};
