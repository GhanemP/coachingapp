/**
 * Data Encryption Service
 * Comprehensive encryption utilities for securing sensitive data
 */

import CryptoJS from 'crypto-js';

import { getEnvVar } from './type-utils';

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'AES',
  keySize: 256,
  ivSize: 128,
  iterations: 10000,
  saltSize: 128,
} as const;

// Get encryption key from environment
function getEncryptionKey(): string {
  const key = getEnvVar('ENCRYPTION_KEY');
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required and must be set');
  }
  
  // Validate key strength in production
  if (process.env.NODE_ENV === 'production') {
    const validation = EncryptionUtils.validateKeyStrength(key);
    if (!validation.isValid) {
      throw new Error(`Weak encryption key detected: ${validation.issues.join(', ')}`);
    }
  }
  
  return key;
}

// Get secondary key for field-level encryption
function getFieldEncryptionKey(): string {
  const key = getEnvVar('FIELD_ENCRYPTION_KEY');
  if (!key) {
    throw new Error('FIELD_ENCRYPTION_KEY environment variable is required and must be set');
  }
  
  // Validate key strength in production
  if (process.env.NODE_ENV === 'production') {
    const validation = EncryptionUtils.validateKeyStrength(key);
    if (!validation.isValid) {
      throw new Error(`Weak field encryption key detected: ${validation.issues.join(', ')}`);
    }
  }
  
  return key;
}

/**
 * Generate a cryptographically secure random salt
 */
function generateSalt(): string {
  return CryptoJS.lib.WordArray.random(ENCRYPTION_CONFIG.saltSize / 8).toString();
}

/**
 * Generate a cryptographically secure random IV
 */
function generateIV(): string {
  return CryptoJS.lib.WordArray.random(ENCRYPTION_CONFIG.ivSize / 8).toString();
}

/**
 * Derive encryption key from password and salt using PBKDF2
 */
function deriveKey(password: string, salt: string): string {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: ENCRYPTION_CONFIG.keySize / 32,
    iterations: ENCRYPTION_CONFIG.iterations,
  }).toString();
}

/**
 * Encrypt sensitive data with AES-256-CBC
 */
export function encryptData(data: string, customKey?: string): string {
  try {
    const key = customKey || getEncryptionKey();
    const salt = generateSalt();
    const iv = generateIV();
    const derivedKey = deriveKey(key, salt);
    
    const encrypted = CryptoJS.AES.encrypt(data, derivedKey, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    // Combine salt, iv, and encrypted data
    const combined = `${salt  }:${  iv  }:${  encrypted.toString()}`;
    
    // Base64 encode the final result
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(combined));
  } catch (error) {
    throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt sensitive data
 */
export function decryptData(encryptedData: string, customKey?: string): string {
  try {
    const key = customKey || getEncryptionKey();
    
    // Base64 decode
    const combined = CryptoJS.enc.Base64.parse(encryptedData).toString(CryptoJS.enc.Utf8);
    const parts = combined.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [salt, iv, encrypted] = parts;
    if (!salt || !iv || !encrypted) {
      throw new Error('Invalid encrypted data components');
    }
    
    const derivedKey = deriveKey(key, salt);
    
    const decrypted = CryptoJS.AES.decrypt(encrypted, derivedKey, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
    
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    
    if (!result) {
      throw new Error('Decryption failed - invalid key or corrupted data');
    }
    
    return result;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Hash sensitive data (one-way, for passwords, etc.)
 */
export function hashData(data: string, salt?: string): { hash: string; salt: string } {
  try {
    const useSalt = salt || generateSalt();
    const hash = CryptoJS.PBKDF2(data, useSalt, {
      keySize: ENCRYPTION_CONFIG.keySize / 32,
      iterations: ENCRYPTION_CONFIG.iterations,
    }).toString();
    
    return { hash, salt: useSalt };
  } catch (error) {
    throw new Error(`Hashing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify hashed data
 */
export function verifyHash(data: string, hash: string, salt: string): boolean {
  try {
    const { hash: computedHash } = hashData(data, salt);
    return computedHash === hash;
  } catch {
    return false;
  }
}

/**
 * Field-level encryption for specific database fields
 */
export class FieldEncryption {
  private static fieldKey = getFieldEncryptionKey();
  
  /**
   * Encrypt a specific field value
   */
  static encryptField(value: string, fieldName: string): string {
    const fieldSpecificKey = CryptoJS.HmacSHA256(fieldName, this.fieldKey).toString();
    return encryptData(value, fieldSpecificKey);
  }
  
  /**
   * Decrypt a specific field value
   */
  static decryptField(encryptedValue: string, fieldName: string): string {
    const fieldSpecificKey = CryptoJS.HmacSHA256(fieldName, this.fieldKey).toString();
    return decryptData(encryptedValue, fieldSpecificKey);
  }
  
  /**
   * Encrypt multiple fields in an object
   */
  static encryptFields<T extends Record<string, unknown>>(
    data: T,
    fieldsToEncrypt: (keyof T)[]
  ): T {
    const result = { ...data };
    
    for (const field of fieldsToEncrypt) {
      const value = result[field];
      if (typeof value === 'string' && value.length > 0) {
        result[field] = this.encryptField(value, String(field)) as T[keyof T];
      }
    }
    
    return result;
  }
  
  /**
   * Decrypt multiple fields in an object
   */
  static decryptFields<T extends Record<string, unknown>>(
    data: T,
    fieldsToDecrypt: (keyof T)[]
  ): T {
    const result = { ...data };
    
    for (const field of fieldsToDecrypt) {
      const value = result[field];
      if (typeof value === 'string' && value.length > 0) {
        try {
          result[field] = this.decryptField(value, String(field)) as T[keyof T];
        } catch {
          // If decryption fails, assume the field is not encrypted
          // This allows for gradual migration to encrypted fields
        }
      }
    }
    
    return result;
  }
}

/**
 * Secure token generation
 */
export class TokenGenerator {
  /**
   * Generate a secure random token
   */
  static generateSecureToken(length: number = 32): string {
    return CryptoJS.lib.WordArray.random(length).toString();
  }
  
  /**
   * Generate a time-based token with expiration
   */
  static generateTimedToken(expirationMinutes: number = 60): {
    token: string;
    expires: Date;
    hash: string;
  } {
    const token = this.generateSecureToken();
    const expires = new Date(Date.now() + expirationMinutes * 60 * 1000);
    const hash = CryptoJS.HmacSHA256(token + expires.toISOString(), getEncryptionKey()).toString();
    
    return { token, expires, hash };
  }
  
  /**
   * Verify a time-based token
   */
  static verifyTimedToken(token: string, expires: Date, hash: string): boolean {
    try {
      if (new Date() > expires) {
        return false;
      }
      
      const expectedHash = CryptoJS.HmacSHA256(token + expires.toISOString(), getEncryptionKey()).toString();
      return expectedHash === hash;
    } catch {
      return false;
    }
  }
  
  /**
   * Generate a secure API key
   */
  static generateApiKey(): string {
    const timestamp = Date.now().toString();
    const random = this.generateSecureToken(16);
    const combined = timestamp + random;
    
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(combined))
      .replace(/[+/=]/g, '')
      .substring(0, 32);
  }
}

/**
 * Data masking utilities for logging and display
 */
export class DataMasking {
  /**
   * Mask email addresses
   */
  static maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) {
      return '***@***.***';
    }
    
    const maskedLocal = local.length > 2
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : '*'.repeat(local.length);
    
    const [domainName, tld] = domain.split('.');
    if (!domainName || !tld) {
      return `${maskedLocal}@***.***`;
    }
    
    const maskedDomain = domainName.length > 2
      ? domainName[0] + '*'.repeat(domainName.length - 2) + domainName[domainName.length - 1]
      : '*'.repeat(domainName.length);
    
    return `${maskedLocal}@${maskedDomain}.${tld}`;
  }
  
  /**
   * Mask phone numbers
   */
  static maskPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 4) {
      return '*'.repeat(cleaned.length);
    }
    
    return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
  }
  
  /**
   * Mask credit card numbers
   */
  static maskCreditCard(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\D/g, '');
    if (cleaned.length < 4) {
      return '*'.repeat(cleaned.length);
    }
    
    return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
  }
  
  /**
   * Mask generic sensitive data
   */
  static maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars) {
      return '*'.repeat(data.length);
    }
    
    return '*'.repeat(data.length - visibleChars) + data.slice(-visibleChars);
  }
  
  /**
   * Mask object fields for logging
   */
  static maskObjectFields<T extends Record<string, unknown>>(
    obj: T,
    fieldsToMask: (keyof T)[],
    maskFunction: (value: string) => string = this.maskSensitiveData
  ): T {
    const result = { ...obj };
    
    for (const field of fieldsToMask) {
      const value = result[field];
      if (typeof value === 'string') {
        result[field] = maskFunction(value) as T[keyof T];
      }
    }
    
    return result;
  }
}

/**
 * Encryption middleware for database operations
 */
export class EncryptionMiddleware {
  /**
   * Fields that should be encrypted in the database
   */
  private static readonly ENCRYPTED_FIELDS: Record<string, string[]> = {
    User: ['email', 'phone'],
    CoachingSession: ['sessionNotes', 'preparationNotes'],
    ActionItem: ['description', 'notes'],
    QuickNote: ['content'],
    ActionPlan: ['description'],
  };
  
  /**
   * Get encrypted fields for a model
   */
  static getEncryptedFields(modelName: string): string[] {
    return this.ENCRYPTED_FIELDS[modelName] || [];
  }
  
  /**
   * Encrypt data before database write
   */
  static encryptForDatabase<T extends Record<string, unknown>>(
    modelName: string,
    data: T
  ): T {
    const fieldsToEncrypt = this.getEncryptedFields(modelName);
    if (fieldsToEncrypt.length === 0) {
      return data;
    }
    
    return FieldEncryption.encryptFields(data, fieldsToEncrypt);
  }
  
  /**
   * Decrypt data after database read
   */
  static decryptFromDatabase<T extends Record<string, unknown>>(
    modelName: string,
    data: T
  ): T {
    const fieldsToDecrypt = this.getEncryptedFields(modelName);
    if (fieldsToDecrypt.length === 0) {
      return data;
    }
    
    return FieldEncryption.decryptFields(data, fieldsToDecrypt);
  }
  
  /**
   * Decrypt array of database records
   */
  static decryptArrayFromDatabase<T extends Record<string, unknown>>(
    modelName: string,
    data: T[]
  ): T[] {
    return data.map(item => this.decryptFromDatabase(modelName, item));
  }
}

/**
 * Utility functions for encryption validation
 */
export class EncryptionUtils {
  /**
   * Check if a string appears to be encrypted
   */
  static isEncrypted(data: string): boolean {
    try {
      // Check if it's base64 encoded and has the expected format
      const decoded = CryptoJS.enc.Base64.parse(data).toString(CryptoJS.enc.Utf8);
      const parts = decoded.split(':');
      return parts.length === 3;
    } catch {
      return false;
    }
  }
  
  /**
   * Validate encryption key strength
   */
  static validateKeyStrength(key: string): {
    isValid: boolean;
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let score = 0;
    
    if (key.length < 32) {
      issues.push('Key should be at least 32 characters long');
    } else {
      score += 25;
    }
    
    if (!/[a-z]/.test(key)) {
      issues.push('Key should contain lowercase letters');
    } else {
      score += 25;
    }
    
    if (!/[A-Z]/.test(key)) {
      issues.push('Key should contain uppercase letters');
    } else {
      score += 25;
    }
    
    if (!/[0-9]/.test(key)) {
      issues.push('Key should contain numbers');
    } else {
      score += 25;
    }
    
    if (!/[^a-zA-Z0-9]/.test(key)) {
      issues.push('Key should contain special characters');
    } else {
      score += 25;
    }
    
    if (key === 'default-dev-key-change-in-production' || 
        key === 'default-field-key-change-in-production') {
      issues.push('Default development key detected - change in production');
      score = 0;
    }
    
    return {
      isValid: issues.length === 0,
      score: Math.min(score, 100),
      issues,
    };
  }
  
  /**
   * Generate a strong encryption key
   */
  static generateStrongKey(length: number = 64): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return result;
  }
}

// Export types for TypeScript
export type EncryptedData = string;
export type HashedData = { hash: string; salt: string };
export type TimedToken = { token: string; expires: Date; hash: string };