import nodemailer from 'nodemailer';

import logger from '@/lib/logger';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  tls?: {
    rejectUnauthorized: boolean;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      const config: EmailConfig = {
        host: process.env['SMTP_HOST'] || '',
        port: parseInt(process.env['SMTP_PORT'] || '587'),
        secure: process.env['SMTP_SECURE'] === 'true',
        auth: {
          user: process.env['SMTP_USER'] || '',
          pass: process.env['SMTP_PASSWORD'] || '',
        },
      };

      // Add TLS configuration if specified
      if (process.env['SMTP_TLS'] === 'true') {
        config.tls = {
          rejectUnauthorized: false,
        };
      }

      // Check if all required config is present
      if (!config.host || !config.auth.user || !config.auth.pass) {
        logger.warn('Email service not configured - missing SMTP settings');
        return;
      }

      this.transporter = nodemailer.createTransport(config);
      this.isConfigured = true;

      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service:', error as Error);
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      logger.error('Email service not configured - cannot send password reset email');
      return false;
    }

    try {
      const resetUrl = `${process.env['NEXTAUTH_URL']}/reset-password?token=${resetToken}`;
      const fromName = process.env['EMAIL_RESET_FROM_NAME'] || 'Coaching App';
      const fromEmail = process.env['SMTP_FROM'] || process.env['SMTP_USER'];

      const emailOptions: EmailOptions = {
        to: email,
        subject: process.env['EMAIL_RESET_SUBJECT'] || 'Password Reset Request',
        html: this.generatePasswordResetHTML(resetUrl),
        text: this.generatePasswordResetText(resetUrl),
      };

      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        ...emailOptions,
      });

      logger.info('Password reset email sent successfully', {
        messageId: info.messageId,
        to: email,
      });

      return true;
    } catch (error) {
      logger.error('Failed to send password reset email:', error as Error);
      return false;
    }
  }

  private generatePasswordResetHTML(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background-color: #ffffff;
            padding: 30px;
            border: 1px solid #e9ecef;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-radius: 0 0 8px 8px;
            font-size: 14px;
            color: #6c757d;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            margin: 20px 0;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        
        <div class="content">
          <p>Hello,</p>
          
          <p>We received a request to reset your password for your Coaching App account. If you made this request, click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset My Password</a>
          </div>
          
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px;">
            ${resetUrl}
          </p>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul>
              <li>This link will expire in 1 hour for security reasons</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Never share this link with anyone</li>
              <li>Contact support if you have concerns about your account security</li>
            </ul>
          </div>
          
          <p>If you're having trouble clicking the button, you can also reset your password by visiting the login page and clicking "Forgot Password".</p>
          
          <p>Best regards,<br>The Coaching App Security Team</p>
        </div>
        
        <div class="footer">
          <p>This is an automated security email. Please do not reply to this message.</p>
          <p>If you need assistance, please contact our support team.</p>
        </div>
      </body>
      </html>
    `;
  }

  private generatePasswordResetText(resetUrl: string): string {
    return `
Password Reset Request

Hello,

We received a request to reset your password for your Coaching App account. If you made this request, visit the following link to reset your password:

${resetUrl}

SECURITY NOTICE:
- This link will expire in 1 hour for security reasons
- If you didn't request this reset, please ignore this email
- Never share this link with anyone
- Contact support if you have concerns about your account security

If you're having trouble with the link, you can also reset your password by visiting the login page and clicking "Forgot Password".

Best regards,
The Coaching App Security Team

---
This is an automated security email. Please do not reply to this message.
If you need assistance, please contact our support team.
    `;
  }

  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      logger.info('Email service connection verified successfully');
      return true;
    } catch (error) {
      logger.error('Email service connection verification failed:', error as Error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export types for use in other modules
export type { EmailOptions };
