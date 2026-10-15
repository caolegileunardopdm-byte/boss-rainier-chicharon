const { BrevoClient } = require("@getbrevo/brevo");

// ==================== CONFIGURE BREVO ====================
const brevo = new BrevoClient({
  apiKey: process.env.BREVO_API_KEY,
  timeoutInSeconds: 30,
});

// ==================== VERIFY CONFIG ====================
if (process.env.BREVO_API_KEY) {
  console.log("✅ Brevo email service configured");
} else {
  console.log("❌ Brevo API key missing — set BREVO_API_KEY env var");
}

// ==================== SEND OTP EMAIL ====================
async function sendOtpEmail(to, otp, type = "registration") {
  const subject =
    type === "registration"
      ? "🔐 Verify Your Account - Boss Rainier Chicharon"
      : "🔐 Password Reset - Boss Rainier Chicharon";

  const heading =
    type === "registration" ? "Verify Your Account" : "Reset Your Password";

  const message =
    type === "registration"
      ? "Thank you for registering! Use the OTP code below to verify your account."
      : "You requested to reset your password. Use the OTP code below.";

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #92400e 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 16px 16px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">🥓 Boss Rainier Chicharon</h1>
        <p style="color: white; margin: 5px 0 0 0; font-size: 14px;">Signature chicharon ni Mrs. Marissa Del Rosario</p>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <h2 style="color: #92400e; margin-top: 0;">${heading}</h2>
        <p style="color: #1f2937; font-size: 16px;">${message}</p>
        <div style="background: #fef3c7; padding: 20px; border-radius: 12px; text-align: center; margin: 25px 0; border-left: 4px solid #d97706;">
          <p style="color: #92400e; font-size: 14px; margin: 0 0 10px 0; font-weight: 600;">Your OTP Code</p>
          <p style="font-size: 36px; font-weight: bold; color: #92400e; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${otp}</p>
        </div>
        <p style="color: #6b7280; font-size: 14px;">⏰ This code will expire in <strong>10 minutes</strong>.</p>
        <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;" />
        <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
          📍 Patubig, Marilao, Bulacan<br />
          📞 0935069928<br />
          © 2026 Boss Rainier Chicharon. All rights reserved.
        </p>
      </div>
    </div>
  `;

  try {
    const response = await brevo.transactionalEmails.sendTransacEmail({
      sender: {
        name: "Boss Rainier Chicharon",
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: htmlContent,
    });

    console.log(`✅ OTP email sent to ${to}: ${response.messageId}`);
    return { success: true, messageId: response.messageId };
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendOtpEmail };
