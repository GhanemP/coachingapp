import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { InputValidator } from '@/lib/security/input-validation';
import { passwordSchema } from '@/lib/security/auth-security';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// In-memory storage for reset tokens (in production, use Redis or database)
const resetTokens = new Map<string, {
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
}>();

// Clean up expired tokens periodically
setInterval(() => {
  const now = new Date();
  for (const [key, value] of resetTokens.entries()) {
    if (value.expiresAt < now) {
      resetTokens.delete(key);
    }
  }
}, 300000); // Every 5 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, newPassword, action } = body;

    if (action === 'request') {
      // Request password reset
      if (!email) {
        return NextResponse.json(
          { error: 'Email is required' },
          { status: 400 }
        );
      }

      // Validate email format
      try {
        const validatedEmail = InputValidator.validateEmail(email);
        
        // Check if user exists
        const user = await prisma.user.findUnique({
          where: { email: validatedEmail }
        });

        if (!user) {
          // Don't reveal if user exists or not for security
          return NextResponse.json({
            message: 'If an account with that email exists, a password reset link has been sent.'
          });
        }

        // Generate secure reset token
        const resetToken = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour

        // Store reset token
        resetTokens.set(resetToken, {
          email: validatedEmail,
          token: resetToken,
          expiresAt,
          used: false
        });

        // Log password reset request
        logger.info('Password reset requested', {
          email: validatedEmail,
          ip: request.headers.get('x-forwarded-for') || 'unknown'
        });

        // In production, send email with reset link
        // For now, return the token (remove this in production)
        return NextResponse.json({
          message: 'If an account with that email exists, a password reset link has been sent.',
          // Remove this in production - only for testing
          resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
        });

      } catch (error) {
        logger.warn('Email validation failed', {
          error: error instanceof Error ? error.message : 'Unknown validation error'
        });
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    if (action === 'reset') {
      // Reset password with token
      if (!token || !newPassword) {
        return NextResponse.json(
          { error: 'Token and new password are required' },
          { status: 400 }
        );
      }

      // Validate token
      const resetData = resetTokens.get(token);
      if (!resetData) {
        return NextResponse.json(
          { error: 'Invalid or expired reset token' },
          { status: 400 }
        );
      }

      if (resetData.used) {
        return NextResponse.json(
          { error: 'Reset token has already been used' },
          { status: 400 }
        );
      }

      if (resetData.expiresAt < new Date()) {
        resetTokens.delete(token);
        return NextResponse.json(
          { error: 'Reset token has expired' },
          { status: 400 }
        );
      }

      // Validate new password
      try {
        passwordSchema.parse(newPassword);
      } catch (error) {
        logger.warn('Password validation failed', {
          error: error instanceof Error ? error.message : 'Password requirements not met'
        });
        return NextResponse.json(
          { error: 'Password does not meet security requirements' },
          { status: 400 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user password
      await prisma.user.update({
        where: { email: resetData.email },
        data: { 
          hashedPassword,
          updatedAt: new Date()
        }
      });

      // Mark token as used
      resetData.used = true;
      resetTokens.set(token, resetData);

      // Log successful password reset
      logger.info('Password reset completed', {
        email: resetData.email,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      });

      return NextResponse.json({
        message: 'Password has been reset successfully'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    logger.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}