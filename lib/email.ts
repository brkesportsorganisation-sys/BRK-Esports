import { Resend } from 'resend';
import { supabaseAdmin } from './supabase';

const DEFAULT_RESEND_KEY = process.env.RESEND_API_KEY || '';

export interface WelcomeEmailParams {
  name: string;
  email: string;
  accountNumber: string;
  freeFireUid?: string;
  inGameName?: string;
}

export async function getEmailSettings() {
  try {
    const { data: settings } = await supabaseAdmin
      .from('SiteSetting')
      .select('key, value');

    const map = (settings || []).reduce((acc: Record<string, string>, item: any) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    return {
      apiKey: map.RESEND_API_KEY || DEFAULT_RESEND_KEY,
      isEnabled: map.WELCOME_EMAIL_ENABLED !== 'false', // enabled by default
      fromEmail: map.WELCOME_EMAIL_FROM || 'BlackRock Esports <onboarding@resend.dev>',
      subject: map.WELCOME_EMAIL_SUBJECT || '🔥 Welcome to Black Rock Esports - Player ID: {PLAYER_ID}',
      bodyTemplate: map.WELCOME_EMAIL_BODY || `Welcome to Black Rock Esports, {NAME}!

Your official Player Unique ID is {PLAYER_ID}.
You are now ready to compete in daily Free Fire squad, duo, and solo championship tournaments with automated Booyah payouts.

Login to your account and book your slot today!`,
    };
  } catch {
    return {
      apiKey: DEFAULT_RESEND_KEY,
      isEnabled: true,
      fromEmail: 'BlackRock Esports <onboarding@resend.dev>',
      subject: '🔥 Welcome to Black Rock Esports - Player ID: {PLAYER_ID}',
      bodyTemplate: `Welcome to Black Rock Esports, {NAME}!\n\nYour official Player Unique ID is {PLAYER_ID}.\nGet ready to dominate the arena!`,
    };
  }
}

export function generateWelcomeHtml(params: {
  name: string;
  accountNumber: string;
  email: string;
  freeFireUid?: string;
  inGameName?: string;
  bodyText: string;
}) {
  const { name, accountNumber, email, freeFireUid, inGameName, bodyText } = params;
  
  // Format body paragraphs
  const paragraphs = bodyText
    .split('\n')
    .filter(p => p.trim() !== '')
    .map(p => `<p style="margin: 0 0 14px; font-size: 15px; line-height: 1.6; color: #334155;">${p}</p>`)
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Black Rock Esports</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 36px 30px; text-align: center; border-bottom: 3px solid #ff4655;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">
                BLACKROCK <span style="color: #ff4655;">ESPORTS</span>
              </h1>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">
                Free Fire Championship Platform
              </p>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 30px;">
              <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 22px; font-weight: 800;">
                Welcome to the Arena, <span style="color: #ff4655;">${name}</span>! 🔥
              </h2>

              <!-- Player ID Highlight Card -->
              <div style="background-color: #fff7ed; border: 2px dashed #fb923c; border-radius: 14px; padding: 18px 20px; margin: 20px 0 26px; text-align: center;">
                <div style="font-size: 11px; font-weight: 800; color: #ea580c; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">
                  YOUR OFFICIAL PLAYER UNIQUE ID
                </div>
                <div style="font-family: monospace; font-size: 24px; font-weight: 900; color: #c2410c; letter-spacing: 2px;">
                  ${accountNumber}
                </div>
                <div style="font-size: 11px; color: #9a3412; margin-top: 4px;">
                  Use this ID for customer support, tournament slots, and quick identification.
                </div>
              </div>

              <!-- Customized Welcome Text -->
              <div style="color: #334155; font-size: 15px; line-height: 1.6;">
                ${paragraphs}
              </div>

              <!-- Player Details Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin: 24px 0; padding: 16px;">
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #64748b; font-weight: 600;">Registered Email:</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">${email}</td>
                </tr>
                ${freeFireUid ? `
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #64748b; font-weight: 600;">Free Fire UID:</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #0f172a; font-weight: 700; font-family: monospace; text-align: right;">${freeFireUid}</td>
                </tr>
                ` : ''}
                ${inGameName ? `
                <tr>
                  <td style="padding: 6px 12px; font-size: 13px; color: #64748b; font-weight: 600;">In-Game Name (IGN):</td>
                  <td style="padding: 6px 12px; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">${inGameName}</td>
                </tr>
                ` : ''}
              </table>

              <!-- Call to Action Button -->
              <div style="text-align: center; margin: 30px 0 10px;">
                <a href="https://brkesports.vercel.app/tournaments" style="display: inline-block; background: linear-gradient(135deg, #ff4655 0%, #ff7300 100%); color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 800; padding: 14px 34px; border-radius: 12px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(255, 70, 85, 0.35);">
                  Browse Live Tournaments
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 12px;">
                Need assistance? Contact our 24/7 WhatsApp Helpline or reply to this email.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                &copy; ${new Date().getFullYear()} Black Rock Esports Organisation. All rights reserved.
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
}

export function generatePasswordResetOtpHtml(params: {
  name: string;
  email: string;
  otp: string;
}) {
  const { name, otp } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP - Black Rock Esports</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 32px 30px; text-align: center; border-bottom: 3px solid #ff4655;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">
                BLACKROCK <span style="color: #ff4655;">ESPORTS</span>
              </h1>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">
                Account Security & Password Recovery
              </p>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 30px;">
              <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 20px; font-weight: 800;">
                Password Reset Request 🔐
              </h2>

              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                Hello <strong>${name || 'Player'}</strong>,<br/>
                We received a request to reset your Black Rock Esports account password. Use the 6-digit verification code below to complete the reset process:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background: linear-gradient(135deg, #fff1f2 0%, #fff7ed 100%); border: 2px dashed #f43f5e; border-radius: 16px; padding: 24px 20px; text-align: center; margin: 24px 0;">
                <div style="font-size: 11px; font-weight: 800; color: #e11d48; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
                  YOUR 6-DIGIT VERIFICATION CODE
                </div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; color: #be123c; letter-spacing: 8px; margin: 8px 0;">
                  ${otp}
                </div>
                <div style="font-size: 12px; font-weight: 600; color: #9f1239; margin-top: 8px;">
                  ⏱️ Valid for 10 minutes only
                </div>
              </div>

              <!-- Security Tips -->
              <div style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 16px; margin: 20px 0 24px;">
                <div style="font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 6px;">
                  🛡️ Security Guidelines:
                </div>
                <ul style="margin: 0; padding-left: 18px; color: #64748b; font-size: 12px; line-height: 1.5;">
                  <li>Never share this code with anyone, including Black Rock tournament moderators.</li>
                  <li>If you did not request this password reset, please change your password immediately.</li>
                </ul>
              </div>

            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px; color: #64748b; font-size: 11px;">
                Need help? Reach out on our Discord or WhatsApp support.
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 10px;">
                &copy; ${new Date().getFullYear()} Black Rock Esports. All rights reserved.
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
}

export async function sendWelcomeEmail(params: WelcomeEmailParams) {
  try {
    const emailSettings = await getEmailSettings();
    if (!emailSettings.isEnabled) {
      console.log('[Email] Welcome email is disabled in settings. Skipping.');
      return { success: false, reason: 'DISABLED' };
    }

    const resend = new Resend(emailSettings.apiKey);

    const formattedSubject = emailSettings.subject
      .replace(/{NAME}/g, params.name)
      .replace(/{PLAYER_ID}/g, params.accountNumber)
      .replace(/{EMAIL}/g, params.email);

    const formattedBody = emailSettings.bodyTemplate
      .replace(/{NAME}/g, params.name)
      .replace(/{PLAYER_ID}/g, params.accountNumber)
      .replace(/{EMAIL}/g, params.email)
      .replace(/{UID}/g, params.freeFireUid || 'N/A');

    const html = generateWelcomeHtml({
      name: params.name,
      accountNumber: params.accountNumber,
      email: params.email,
      freeFireUid: params.freeFireUid,
      inGameName: params.inGameName,
      bodyText: formattedBody,
    });

    const data = await resend.emails.send({
      from: emailSettings.fromEmail,
      to: params.email,
      subject: formattedSubject,
      html: html,
    });

    console.log('[Email] Welcome email sent successfully to:', params.email, data);
    return { success: true, data };
  } catch (error: any) {
    console.error('[Email] Failed to send welcome email:', error?.message || error);
    return { success: false, error: error?.message || 'Failed to send' };
  }
}

export async function sendPasswordResetOtpEmail(params: {
  name: string;
  email: string;
  otp: string;
}) {
  try {
    const emailSettings = await getEmailSettings();
    const resend = new Resend(emailSettings.apiKey);

    const html = generatePasswordResetOtpHtml({
      name: params.name,
      email: params.email,
      otp: params.otp,
    });

    const data = await resend.emails.send({
      from: emailSettings.fromEmail,
      to: params.email,
      subject: `🔐 Your Password Reset Code: ${params.otp} - Black Rock Esports`,
      html: html,
    });

    console.log('[Email] Password reset OTP sent to:', params.email, data);
    return { success: true, data };
  } catch (error: any) {
    console.error('[Email] Failed to send OTP email:', error?.message || error);
    return { success: false, error: error?.message || 'Failed to send OTP email' };
  }
}

export async function sendTestEmail(params: {
  toEmail: string;
  apiKey?: string;
  fromEmail?: string;
  subject?: string;
  bodyTemplate?: string;
}) {
  try {
    const emailSettings = await getEmailSettings();
    const key = params.apiKey || emailSettings.apiKey;
    const resend = new Resend(key);

    const from = params.fromEmail || emailSettings.fromEmail;
    const subject = (params.subject || emailSettings.subject)
      .replace(/{NAME}/g, 'Admin Tester')
      .replace(/{PLAYER_ID}/g, 'BRK-777888');

    const bodyText = (params.bodyTemplate || emailSettings.bodyTemplate)
      .replace(/{NAME}/g, 'Admin Tester')
      .replace(/{PLAYER_ID}/g, 'BRK-777888')
      .replace(/{EMAIL}/g, params.toEmail);

    const html = generateWelcomeHtml({
      name: 'Admin Tester',
      accountNumber: 'BRK-777888',
      email: params.toEmail,
      freeFireUid: '2172143722',
      inGameName: 'BRK_Official',
      bodyText: bodyText,
    });

    const data = await resend.emails.send({
      from: from,
      to: params.toEmail,
      subject: `[TEST PREVIEW] ${subject}`,
      html: html,
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('[Email Test] Error:', error);
    return { success: false, error: error?.message || 'Failed to send test email' };
  }
}

