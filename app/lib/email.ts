/**
 * Email Service for sending OTP and transactional emails
 * Uses nodemailer with SMTP configuration
 */

import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Get SMTP configuration from environment variables
const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true'; // true for 465, false for other ports
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user || 'noreply@pylomarket.com';

  // If SMTP is not configured, return null (will use console.log fallback)
  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    from: `PyloMarket <${from}>`,
  };
};

// Create transporter (singleton pattern)
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) {
    return transporter;
  }

  const smtpConfig = getSmtpConfig();
  if (!smtpConfig) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure, // false for STARTTLS on port 587
    requireTLS: !smtpConfig.secure, // Require TLS for STARTTLS connections
    auth: smtpConfig.auth,
  });

  return transporter;
}

/**
 * Send email via SMTP
 * Falls back to console.log if SMTP is not configured
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const emailTransporter = getTransporter();

  if (!emailTransporter) {
    // Fallback: log to console in development
    console.log(`[EMAIL] To: ${options.to}`);
    console.log(`[EMAIL] Subject: ${options.subject}`);
    console.log(`[EMAIL] Body:\n${options.html}`);
    return;
  }

  try {
    await emailTransporter.sendMail({
      from: getSmtpConfig()?.from || 'noreply@pylomarket.com',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * Generate OTP email HTML template (Polymarket style)
 */
export function generateOTPEmailTemplate(
  code: string,
  expiresInMinutes: number = 20,
  userAgent?: string
): string {
  // Parse user agent if provided, otherwise use generic
  let browser = 'Browser';
  let os = 'OS';

  if (userAgent) {
    // Simple user agent parsing
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';
  }

  const time = new Date().toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZoneName: 'short',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PyloMarket Login Code</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #ffffff;
    }
    .header {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 30px;
      color: #000;
    }
    .code-label {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }
    .code {
      font-size: 48px;
      font-weight: bold;
      letter-spacing: 8px;
      color: #000;
      margin: 20px 0;
      text-align: left;
    }
    .expiry {
      font-size: 14px;
      color: #666;
      margin-bottom: 30px;
    }
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 30px 0;
      font-size: 14px;
      color: #856404;
    }
    .warning strong {
      font-weight: bold;
    }
    .request-info {
      font-size: 14px;
      color: #666;
      margin: 30px 0;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }
    .request-info strong {
      color: #000;
    }
    .footer {
      margin-top: 40px;
      font-size: 14px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">PyloMarket</div>
  
  <div class="code-label">Login code</div>
  <div class="code">${code}</div>
  
  <div class="expiry">This code expires in ${expiresInMinutes} minutes.</div>
  
  <div class="warning">
    Do <strong>NOT</strong> share this code with anyone. Only enter this code on the official application's website. If someone asks for this code, it could be a scam.
  </div>
  
  <div class="request-info">
    This login was requested using <strong>${browser}</strong>, <strong>${os}</strong> at ${time}.
  </div>
  
  <div class="footer">
    - PyloMarket Team
  </div>
</body>
</html>
  `.trim();
}
