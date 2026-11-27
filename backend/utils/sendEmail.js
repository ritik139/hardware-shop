const nodemailer = require("nodemailer");

let transporter = null;
let warnedNotConfigured = false;

const emailConfigured = () =>
  ["EMAIL_HOST", "EMAIL_USER", "EMAIL_PASS", "NOTIFY_EMAIL"].every((k) => process.env[k]);

// One shared, pooled connection (instead of opening a brand-new SMTP connection for every enquiry),
// with timeouts so a slow/blocked mail server can never leave requests hanging.
function getTransporter() {
  if (transporter) return transporter;
  const port = Number(process.env.EMAIL_PORT) || 587;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure: port === 465, // true for port 465, false for 587 (STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    pool: true,
    maxConnections: 2,
    connectionTimeout: 10000,
    greetTimeout: 10000,
    socketTimeout: 20000,
  });
  return transporter;
}

// Visitor-typed text goes into an HTML email, so escape it (otherwise they could inject links/images into the owner's inbox)
function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// keep message line-breaks readable in the email
const escMultiline = (value) => esc(value).replace(/\r?\n/g, "<br>");

// Servers (Render etc.) run on UTC, so always show the time the shop owner actually lives in
const formatIST = (d) =>
  new Date(d || Date.now()).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

/**
 * Sends an email notification when a new enquiry comes in.
 * If email sending fails, it logs the error but does NOT crash the request —
 * the enquiry is already saved in the database either way.
 */
async function sendEnquiryNotification(enquiry) {
  if (!emailConfigured()) {
    if (!warnedNotConfigured) {
      warnedNotConfigured = true;
      console.warn("ℹ️  Email not configured (EMAIL_HOST / EMAIL_USER / EMAIL_PASS / NOTIFY_EMAIL) — enquiries are saved but no email is sent.");
    }
    return;
  }
  try {
    const subjectName = String(enquiry.name || "").replace(/[\r\n]+/g, " ");
    const subjectInterest = String(enquiry.interest || "").replace(/[\r\n]+/g, " ");

    await getTransporter().sendMail({
      from: `"Korraz Website" <${process.env.EMAIL_USER}>`,
      to: process.env.NOTIFY_EMAIL,
      subject: `New Enquiry — ${subjectName} (${subjectInterest})`,
      html: `
        <h2>New enquiry received on Korraz website</h2>
        <p><b>Name:</b> ${esc(enquiry.name)}</p>
        <p><b>Phone:</b> ${esc(enquiry.phone)}</p>
        <p><b>Looking for:</b> ${esc(enquiry.interest)}</p>
        <p><b>Message:</b> ${escMultiline(enquiry.message) || "—"}</p>
        <p><b>Product page:</b> ${esc(enquiry.productRef) || "—"}</p>
        <p><b>Received at:</b> ${formatIST(enquiry.createdAt)} (IST)</p>
      `,
    });

    console.log("📧 Enquiry notification email sent");
  } catch (err) {
    console.error("⚠️ Failed to send enquiry email:", err.message);
  }
}

module.exports = { sendEnquiryNotification };