const { Resend } = require('resend');

// Initialize Resend client
let resendClient = null;

const getResendClient = () => {
  if (resendClient) {
    return resendClient;
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️  RESEND_API_KEY not set. Emails will not be sent.');
    return null;
  }

  resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
};

// HTML email template for OTP
const getOTPEmailTemplate = (otp) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', Arial, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0a;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #5D38DE; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid #2a2a2a;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Scholarslee</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #ffffff;">Password Reset Request</h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                You requested to reset your password. Use the OTP code below:
              </p>
              <div style="background: linear-gradient(135deg, #5D38DE 0%, #8B5CF6 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.8);">Your OTP Code</p>
                <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff;">${otp}</p>
              </div>
              <div style="background-color: #2a2a2a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #f0f0f0; text-align: center;">
                  ⏱️ This code expires in <strong style="color: #5D38DE;">5 minutes</strong>
                </p>
              </div>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                Best regards,<br>
                <strong style="color: #ffffff;">The Scholarslee Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #666666;">
                © ${new Date().getFullYear()} Scholarslee. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// HTML email template for Verification OTP
const getVerificationEmailTemplate = (otp) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', Arial, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0a;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #5D38DE; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid #2a2a2a;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Scholarslee</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #ffffff;">Verify Your Email</h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                Welcome to Scholarslee! Use the OTP code below:
              </p>
              <div style="background: linear-gradient(135deg, #5D38DE 0%, #8B5CF6 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.8);">Verification Code</p>
                <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff;">${otp}</p>
              </div>
              <div style="background-color: #2a2a2a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #f0f0f0; text-align: center;">
                  ⏱️ This code expires in <strong style="color: #5D38DE;">10 minutes</strong>
                </p>
              </div>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                Best regards,<br>
                <strong style="color: #ffffff;">The Scholarslee Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #666666;">
                © ${new Date().getFullYear()} Scholarslee. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// HTML email template for Contact Response
const getContactResponseEmailTemplate = (name, subject, response) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Response to Your Inquiry</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Poppins', Arial, sans-serif; background-color: #0a0a0a;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #0a0a0a;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border: 1px solid #5D38DE; border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid #2a2a2a;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Scholarslee</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #ffffff;">Response to Your Inquiry</h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                Hello <strong>${name}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                Thank you for contacting us regarding "<strong>${subject}</strong>". Here is our response:
              </p>
              <div style="background-color: #2a2a2a; border-left: 4px solid #5D38DE; border-radius: 4px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #ffffff; white-space: pre-wrap;">${response}</p>
              </div>
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                If you have further questions, feel free to reply to this email.
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                Best regards,<br>
                <strong style="color: #ffffff;">The Scholarslee Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #666666;">
                © ${new Date().getFullYear()} Scholarslee. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

/**
 * Send OTP email for password reset using Resend
 */
const sendOTPEmail = async (email, otp) => {
  console.log('\n🔵 ===== EMAIL SERVICE: Password Reset OTP (Resend) =====');
  console.log('📧 To:', email);
  console.log('🔐 OTP:', otp);

  try {
    const resend = getResendClient();

    if (!resend) {
      console.error('❌ Resend client not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const startTime = Date.now();
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Scholarslee <onboarding@resend.dev>',
      to: [email],
      subject: 'Password Reset OTP - Scholarslee',
      html: getOTPEmailTemplate(otp)
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (error) {
      console.error(`❌ Resend API error in ${duration}s:`, error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    console.log(`✅ OTP sent successfully in ${duration}s`);
    console.log('📬 Message ID:', data.id);
    console.log('🔵 ===== EMAIL SERVICE: Success =====\n');

    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Error sending OTP:', error.message);
    console.error('🔵 ===== EMAIL SERVICE: Failed =====\n');
    return { success: false, error: error.message };
  }
};

/**
 * Send Verification Email using Resend
 */
const sendVerificationEmail = async (email, otp) => {
  console.log('\n🔵 ===== EMAIL SERVICE: Verification Email (Resend) =====');
  console.log('📧 To:', email);
  console.log('🔐 OTP:', otp);

  try {
    const resend = getResendClient();

    if (!resend) {
      console.error('❌ Resend client not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const startTime = Date.now();
    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Scholarslee <onboarding@resend.dev>',
      to: [email],
      subject: 'Verify Your Email - Scholarslee',
      html: getVerificationEmailTemplate(otp)
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (error) {
      console.error(`❌ Resend API error in ${duration}s:`, error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    console.log(`✅ Verification email sent in ${duration}s`);
    console.log('📬 Message ID:', data.id);
    console.log('🔵 ===== EMAIL SERVICE: Success =====\n');

    return { success: true, messageId: data.id, response: 'Email sent via Resend' };
  } catch (error) {
    console.error('❌ Error sending verification email:', error.message);
    console.error('🔵 ===== EMAIL SERVICE: Failed =====\n');
    return { success: false, error: error.message };
  }
};

/**
 * Send Contact Response email using Resend
 */
const sendContactResponseEmail = async (email, name, subject, response) => {
  try {
    const resend = getResendClient();

    if (!resend) {
      console.error('Resend client not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Scholarslee <onboarding@resend.dev>',
      to: [email],
      subject: `Re: ${subject} - Scholarslee Support`,
      html: getContactResponseEmailTemplate(name, subject, response)
    });

    if (error) {
      console.error('❌ Contact response error:', error);
      return { success: false, error: error.message || 'Failed to send email' };
    }

    console.log(`✅ Contact response sent to ${email}: ${data.id}`);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Error sending contact response:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verify email configuration
 */
const verifyEmailConfig = async () => {
  try {
    const resend = getResendClient();

    if (!resend) {
      return { success: false, error: 'Resend client not configured' };
    }

    console.log('✅ Resend email configuration verified');
    return { success: true };
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  verifyEmailConfig,
  sendContactResponseEmail,
  sendVerificationEmail
};
