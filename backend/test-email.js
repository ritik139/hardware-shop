require("dotenv").config();
const nodemailer = require("nodemailer");

console.log("---- .env values Node ko dikh rahe hain ----");
console.log("EMAIL_HOST:", process.env.EMAIL_HOST);
console.log("EMAIL_PORT:", process.env.EMAIL_PORT);
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS length:", process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : "UNDEFINED (yeh sabse badi problem hai)");
console.log("NOTIFY_EMAIL:", process.env.NOTIFY_EMAIL);
console.log("--------------------------------------------");

const port = Number(process.env.EMAIL_PORT) || 587;
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port,
  secure: port === 465, // same rule as the real server (465 = SSL, 587 = STARTTLS)
  connectionTimeout: 10000,
  greetTimeout: 10000,
  socketTimeout: 20000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

transporter.sendMail({
  from: `"Test" <${process.env.EMAIL_USER}>`,
  to: process.env.NOTIFY_EMAIL,
  subject: "Test email — agar yeh mila to setup sahi hai",
  text: "Yeh ek test email hai.",
})
.then(() => console.log("✅ SUCCESS — email chali gayi!"))
.catch((err) => console.log("❌ FAILED:", err.message));