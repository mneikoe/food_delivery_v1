const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: false, // TLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendOtpEmail(email, otp) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Chatora Adda" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `${otp} — Your Chatora Adda Login OTP`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your OTP</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
    style="background:#0f172a;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" style="max-width:480px;" cellspacing="0" cellpadding="0" border="0">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <div style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);
                border-radius:16px;padding:14px 28px;">
                <span style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
                  🍽️ Chatora Adda
                </span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#1e293b;border-radius:20px;padding:40px 36px;
              box-shadow:0 20px 60px rgba(0,0,0,0.5);">

              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#f1f5f9;
                letter-spacing:-0.5px;">
                Your Login OTP 🔐
              </h1>
              <p style="margin:0 0 32px;font-size:15px;color:#94a3b8;line-height:1.6;">
                Use the code below to log in to your Chatora Adda account. 
                This code expires in <strong style="color:#f1f5f9;">10 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);
                border-radius:16px;padding:4px;margin-bottom:32px;">
                <div style="background:#0f172a;border-radius:13px;padding:24px;text-align:center;">
                  <div style="letter-spacing:12px;font-size:42px;font-weight:800;
                    color:#10b981;font-family:monospace;">
                    ${otp}
                  </div>
                </div>
              </div>

              <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
                ⚠️ Never share this OTP with anyone. Chatora Adda will never ask for your OTP.
              </p>

              <hr style="border:none;border-top:1px solid #334155;margin:0 0 24px;" />

              <p style="margin:0;font-size:13px;color:#475569;text-align:center;">
                If you didn't request this OTP, please ignore this email.
                <br/>Your account is safe.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#475569;">
                © 2025 Chatora Adda. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
      text: `Your Chatora Adda OTP is: ${otp}\n\nThis code expires in 10 minutes.\nDo not share this OTP with anyone.`,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      console.log(`[EmailService] OTP email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error("[EmailService] Failed to send OTP email:", error.message);
      throw new Error("Failed to send OTP email. Please check email configuration.");
    }
  }

  async sendWelcomeEmail(email, name) {
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"Chatora Adda" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Welcome to Chatora Adda, ${name}! 🍽️`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellspacing="0" cellpadding="0" border="0"
    style="background:#0f172a;min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="100%" style="max-width:480px;" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <div style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);
                border-radius:16px;padding:14px 28px;">
                <span style="font-size:24px;font-weight:800;color:#fff;">🍽️ Chatora Adda</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#1e293b;border-radius:20px;padding:40px 36px;">
              <h1 style="margin:0 0 16px;font-size:28px;font-weight:700;color:#f1f5f9;">
                Welcome, ${name}! 🎉
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#94a3b8;line-height:1.7;">
                Your account has been created successfully. 
                Start exploring our delicious menu and place your first order!
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${process.env.APP_URL || 'https://www.chatoraadda.in'}/user/app"
                  style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);
                  color:#fff;font-weight:700;font-size:16px;padding:14px 36px;
                  border-radius:12px;text-decoration:none;">
                  Order Now 🍕
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#475569;">© 2025 Chatora Adda.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      // Welcome email failure is non-critical
      console.error("[EmailService] Welcome email failed:", error.message);
    }
  }
}

module.exports = new EmailService();
