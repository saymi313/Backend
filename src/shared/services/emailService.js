const nodemailer = require('nodemailer');

// Create transporter with SMTP configuration (supports Gmail, Hostinger, etc.)
const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email configuration not set. OTP emails will not be sent.');
    return null;
  }

  const port = parseInt(process.env.EMAIL_PORT) || 587;

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
    port: port,
    secure: port === 465, // true for 465 (SSL), false for 587 (TLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false // Allow self-signed certificates
    }
  });
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
          <!-- Header -->
          <tr>
            <td style="padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid #2a2a2a;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Scholarslee</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #ffffff;">Password Reset Request</h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                You requested to reset your password. Use the OTP code below to verify your identity:
              </p>
              
              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #5D38DE 0%, #8B5CF6 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.8);">Your OTP Code</p>
                <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff;">${otp}</p>
              </div>
              
              <!-- Expiry Notice -->
              <div style="background-color: #2a2a2a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 13px; color: #f0f0f0; text-align: center;">
                  ⏱️ This code expires in <strong style="color: #5D38DE;">5 minutes</strong>
                </p>
              </div>
              
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                If you didn't request a password reset, please ignore this email or contact support if you have concerns.
              </p>
              
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                Best regards,<br>
                <strong style="color: #ffffff;">The Scholarslee Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #666666;">
                © ${new Date().getFullYear()} Scholarslee. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #555555;">
                This is an automated message. Please do not reply to this email.
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

// Plain text version for email clients that don't support HTML
const getOTPEmailText = (otp) => {
  return `
Password Reset Request - Scholarslee

You requested to reset your password. Use the OTP code below to verify your identity:

Your OTP Code: ${otp}

This code expires in 5 minutes.

If you didn't request a password reset, please ignore this email or contact support if you have concerns.

Best regards,
The Scholarslee Team

© ${new Date().getFullYear()} Scholarslee. All rights reserved.
This is an automated message. Please do not reply to this email.
  `;
};

/**
 * Send OTP email for password reset
 * @param {string} email - Recipient email address
 * @param {string} otp - 4-digit OTP code
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendOTPEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.error('Email transporter not configured');
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP - Scholarslee',
      text: getOTPEmailText(otp),
      html: getOTPEmailTemplate(otp)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Error sending OTP email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Verify email configuration by sending a test email
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      return { success: false, error: 'Email transporter not configured' };
    }

    await transporter.verify();
    console.log('✅ Email configuration verified successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return { success: false, error: error.message };
  }
};

// function verifyEmailConfig was here

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
          <!-- Header -->
          <tr>
            <td style="padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid #2a2a2a;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Scholarslee</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #ffffff;">Response to Your Inquiry</h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                Hello <strong>${name}</strong>,
              </p>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                Thank you for contacting us regarding "<strong>${subject}</strong>". Here is our response:
              </p>
              
              <!-- Response Box -->
              <div style="background-color: #2a2a2a; border-left: 4px solid #5D38DE; border-radius: 4px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #ffffff; white-space: pre-wrap;">${response}</p>
              </div>
              
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                If you have further questions, feel free to reply to this email or contact us again.
              </p>
              
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                Best regards,<br>
                <strong style="color: #ffffff;">The Scholarslee Team</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #2a2a2a; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #666666;">
                © ${new Date().getFullYear()} Scholarslee. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #555555;">
                This message was sent to you because you contacted Scholarslee support.
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

// Plain text version for Contact Response
const getContactResponseEmailText = (name, subject, response) => {
  return `
Response to Your Inquiry - Scholarslee

Hello ${name},

Thank you for contacting us regarding "${subject}". Here is our response:

--------------------------------------------------
${response}
--------------------------------------------------

If you have further questions, feel free to reply to this email or contact us again.

Best regards,
The Scholarslee Team

© ${new Date().getFullYear()} Scholarslee. All rights reserved.
  `;
};

/**
 * Send Contact Response email
 * @param {string} email - Recipient email address
 * @param {string} name - Recipient name
 * @param {string} subject - Original message subject
 * @param {string} response - Admin response content
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
const sendContactResponseEmail = async (email, name, subject, response) => {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.error('Email transporter not configured');
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: `Re: ${subject} - Scholarslee Support`,
      text: getContactResponseEmailText(name, subject, response),
      html: getContactResponseEmailTemplate(name, subject, response)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Contact response email sent to ${email}: ${info.messageId}`);

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    console.error('❌ Error sending Contact Response email:', error);
    return {
      success: false,
      error: error.message
    };
  }
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
          <!-- Header -->
          <tr>
            <td style="padding: 30px 30px 20px; text-align: center; border-bottom: 1px solid #2a2a2a;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Scholarslee</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #ffffff;">Verify Your Email</h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #a0a0a0;">
                Welcome to Scholarslee! Use the OTP code below to verify your email address and complete your registration:
              </p>
              
              <!-- OTP Box -->
              <div style="background: linear-gradient(135deg, #5D38DE 0%, #8B5CF6 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: rgba(255,255,255,0.8);">Verification Code</p>
                <p style="margin: 0; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #ffffff;">${otp}</p>
              </div>
              
              <!-- Expiry Notice -->
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
          
          <!-- Footer -->
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

// Plain text version for Verification OTP
const getVerificationEmailText = (otp) => {
  return `
Verify Your Email - Scholarslee

Welcome to Scholarslee! Use the OTP code below to verify your email address:

Verification Code: ${otp}

This code expires in 10 minutes.

Best regards,
The Scholarslee Team
  `;
};

/**
 * Send Verification Email
 * @param {string} email - Recipient email string
 * @param {string} otp - OTP code
 */
const sendVerificationEmail = async (email, otp) => {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.error('Email transporter not configured');
      return { success: false, error: 'Email service not configured' };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email - Scholarslee',
      text: getVerificationEmailText(otp),
      html: getVerificationEmailTemplate(otp)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending Verification email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  verifyEmailConfig,
  sendContactResponseEmail,
  sendVerificationEmail
};
