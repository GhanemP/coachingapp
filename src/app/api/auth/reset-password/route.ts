import { randomBytes } from 'crypto';

import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

import logger from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { passwordSchema } from '@/lib/security/auth-security';
import { InputValidator } from '@/lib/security/input-validation';

// Ensure Node.js runtime for bcryptjs compatibility
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic';

// SECURITY FIX: Improved token storage with better memory management
const resetTokens = new Map<string, {
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
}>();

const MAX_RESET_TOKENS = 1000; // Prevent unbounded growth

// Manual cleanup function instead of setInterval for serverless compatibility
function cleanupExpiredTokens(): void {
  const now = new Date();
  const expiredTokens: string[] = [];
  
  for (const [token, data] of resetTokens.entries()) {
    if (data.expiresAt < now || data.used) {
      expiredTokens.push(token);
    }
  }
  
  // Remove expired/used tokens
  expiredTokens.forEach(token => resetTokens.delete(token));
  
  // If still too many tokens, remove oldest ones
  if (resetTokens.size > MAX_RESET_TOKENS) {
    const entries = Array.from(resetTokens.entries())
      .sort(([,a], [,b]) => a.expiresAt.getTime() - b.expiresAt.getTime())
      .slice(0, resetTokens.size - MAX_RESET_TOKENS);
    
    entries.forEach(([token]) => resetTokens.delete(token));
  }
}

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

        // SECURITY: Cleanup before generating new token
        cleanupExpiredTokens();
        
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
        logger.info('Password reset requested');

        // SECURITY FIX: Never expose reset tokens in API responses
        // In production, send email with reset link
        return NextResponse.json({
          message: 'If an account with that email exists, a password reset link has been sent.'
          // SECURITY: Removed token exposure - tokens should only be sent via secure email
        });

      } catch {
        logger.warn('Email validation failed');
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

      // SECURITY: Cleanup before validating token
      cleanupExpiredTokens();
      
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
      } catch {
        logger.warn('Password validation failed');
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
      logger.info('Password reset completed');

      return NextResponse.json({
        message: 'Password has been reset successfully'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    logger.error('Password reset error:', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}