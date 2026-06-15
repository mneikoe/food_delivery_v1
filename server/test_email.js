const nodemailer = require("nodemailer");
require("dotenv").config();

console.log("Using configurations:");
console.log("HOST:", process.env.EMAIL_HOST);
console.log("PORT:", process.env.EMAIL_PORT);
console.log("USER:", process.env.EMAIL_USER);
console.log("PASS:", process.env.EMAIL_PASS ? "PRESENT" : "MISSING");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const mailOptions = {
  from: `"Chatora Adda" <${process.env.EMAIL_USER}>`,
  to: "raj117557@gmail.com",
  subject: "SMTP Delivery Test Code 999999",
  text: "This is a test of the email delivery system.",
};

transporter.sendMail(mailOptions)
  .then(info => {
    console.log("Email sent successfully:", info.response);
    process.exit(0);
  })
  .catch(err => {
    console.error("Email sending failed:", err);
    process.exit(1);
  });
