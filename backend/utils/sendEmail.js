const nodemailer = require("nodemailer");

function getTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false, // true for port 465, false for 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/**
 * Sends an email notification when a new enquiry comes in.
 * If email sending fails, it logs the error but does NOT crash the request —
 * the enquiry is already saved in the database either way.
 */
async function sendEnquiryNotification(enquiry) {
  try {
    const transporter = getTransporter();

    await transporter.sendMail({
      from: `"Korraz Website" <${process.env.EMAIL_USER}>`,
      to: process.env.NOTIFY_EMAIL,
      subject: `New Enquiry — ${enquiry.name} (${enquiry.interest})`,
      html: `
        <h2>New enquiry received on Korraz website</h2>
        <p><b>Name:</b> ${enquiry.name}</p>
        <p><b>Phone:</b> ${enquiry.phone}</p>
        <p><b>Looking for:</b> ${enquiry.interest}</p>
        <p><b>Message:</b> ${enquiry.message || "—"}</p>
        <p><b>Product page:</b> ${enquiry.productRef || "—"}</p>
        <p><b>Received at:</b> ${new Date().toLocaleString("en-IN")}</p>
      `,
    });

    console.log("📧 Enquiry notification email sent");
  } catch (err) {
    console.error("⚠️ Failed to send enquiry email:", err.message);
  }
}

module.exports = { sendEnquiryNotification };