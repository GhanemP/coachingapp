/**
 * Encryption Service Tests
 * Comprehensive tests for data encryption functionality
 */

import {
  encryptData,
  decryptData,
  hashData,
  verifyHash,
  FieldEncryption,
  TokenGenerator,
  DataMasking,
  EncryptionMiddleware,
  EncryptionUtils,
} from '../../lib/encryption';

describe('Encryption Service', () => {
  const testData = 'sensitive test data';
  const testKey = 'test-encryption-key-32-characters-long';

  describe('Basic Encryption/Decryption', () => {
    it('should encrypt and decrypt data correctly', () => {
      const encrypted = encryptData(testData, testKey);
      const decrypted = decryptData(encrypted, testKey);
      
      expect(decrypted).toBe(testData);
      expect(encrypted).not.toBe(testData);
    });

    it('should produce different encrypted values for same input', () => {
      const encrypted1 = encryptData(testData, testKey);
      const encrypted2 = encryptData(testData, testKey);
      
      expect(encrypted1).not.toBe(encrypted2);
      
      // But both should decrypt to the same value
      expect(decryptData(encrypted1, testKey)).toBe(testData);
      expect(decryptData(encrypted2, testKey)).toBe(testData);
    });

    it('should fail to decrypt with wrong key', () => {
      const encrypted = encryptData(testData, testKey);
      const wrongKey = 'wrong-key-32-characters-long-test';
      
      expect(() => decryptData(encrypted, wrongKey)).toThrow();
    });

    it('should fail to decrypt corrupted data', () => {
      const encrypted = encryptData(testData, testKey);
      const corrupted = `${encrypted.slice(0, -5)  }xxxxx`;
      
      expect(() => decryptData(corrupted, testKey)).toThrow();
    });
  });

  describe('Hashing', () => {
    it('should hash data consistently', () => {
      const { hash: hash1, salt } = hashData(testData);
      const { hash: hash2 } = hashData(testData, salt);
      
      expect(hash1).toBe(hash2);
    });

    it('should verify hash correctly', () => {
      const { hash, salt } = hashData(testData);
      
      expect(verifyHash(testData, hash, salt)).toBe(true);
      expect(verifyHash('wrong data', hash, salt)).toBe(false);
    });

    it('should produce different hashes with different salts', () => {
      const { hash: hash1 } = hashData(testData);
      const { hash: hash2 } = hashData(testData);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Field Encryption', () => {
    const testObject = {
      id: '123',
      email: 'test@example.com',
      name: 'John Doe',
      phone: '+1234567890',
      notes: 'Sensitive notes',
    };

    it('should encrypt specific fields', () => {
      const encrypted = FieldEncryption.encryptFields(testObject, ['email', 'phone']);
      
      expect(encrypted.id).toBe(testObject.id);
      expect(encrypted.name).toBe(testObject.name);
      expect(encrypted.email).not.toBe(testObject.email);
      expect(encrypted.phone).not.toBe(testObject.phone);
      expect(encrypted.notes).toBe(testObject.notes);
    });

    it('should decrypt specific fields', () => {
      const encrypted = FieldEncryption.encryptFields(testObject, ['email', 'phone']);
      const decrypted = FieldEncryption.decryptFields(encrypted, ['email', 'phone']);
      
      expect(decrypted).toEqual(testObject);
    });

    it('should handle field-specific encryption keys', () => {
      const emailEncrypted1 = FieldEncryption.encryptField(testObject.email, 'email');
      const emailEncrypted2 = FieldEncryption.encryptField(testObject.email, 'userEmail');
      
      expect(emailEncrypted1).not.toBe(emailEncrypted2);
      
      expect(FieldEncryption.decryptField(emailEncrypted1, 'email')).toBe(testObject.email);
      expect(FieldEncryption.decryptField(emailEncrypted2, 'userEmail')).toBe(testObject.email);
    });
  });

  describe('Token Generation', () => {
    it('should generate secure tokens', () => {
      const token1 = TokenGenerator.generateSecureToken();
      const token2 = TokenGenerator.generateSecureToken();
      
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(0);
      expect(token2.length).toBeGreaterThan(0);
    });

    it('should generate tokens of specified length', () => {
      const token = TokenGenerator.generateSecureToken(16);
      expect(token.length).toBe(32); // Hex encoding doubles the length
    });

    it('should generate and verify timed tokens', () => {
      const { token, expires, hash } = TokenGenerator.generateTimedToken(60);
      
      expect(TokenGenerator.verifyTimedToken(token, expires, hash)).toBe(true);
      expect(TokenGenerator.verifyTimedToken('wrong-token', expires, hash)).toBe(false);
    });

    it('should reject expired timed tokens', () => {
      const pastDate = new Date(Date.now() - 1000);
      const { token, hash } = TokenGenerator.generateTimedToken(60);
      
      expect(TokenGenerator.verifyTimedToken(token, pastDate, hash)).toBe(false);
    });

    it('should generate API keys', () => {
      const apiKey1 = TokenGenerator.generateApiKey();
      const apiKey2 = TokenGenerator.generateApiKey();
      
      expect(apiKey1).not.toBe(apiKey2);
      expect(apiKey1.length).toBe(32);
      expect(apiKey2.length).toBe(32);
      expect(/^[A-Za-z0-9]+$/.test(apiKey1)).toBe(true);
    });
  });

  describe('Data Masking', () => {
    it('should mask email addresses', () => {
      const email = 'john.doe@example.com';
      const masked = DataMasking.maskEmail(email);
      
      expect(masked).not.toBe(email);
      expect(masked).toMatch(/^j.*e@e.*e\.com$/);
    });

    it('should mask phone numbers', () => {
      const phone = '+1-234-567-8900';
      const masked = DataMasking.maskPhone(phone);
      
      expect(masked).not.toBe(phone);
      expect(masked).toMatch(/^\*+8900$/);
    });

    it('should mask credit card numbers', () => {
      const cardNumber = '4111-1111-1111-1111';
      const masked = DataMasking.maskCreditCard(cardNumber);
      
      expect(masked).not.toBe(cardNumber);
      expect(masked).toMatch(/^\*+1111$/);
    });

    it('should mask generic sensitive data', () => {
      const sensitiveData = 'secret123456';
      const masked = DataMasking.maskSensitiveData(sensitiveData, 4);
      
      expect(masked).toBe('******3456');
    });

    it('should mask object fields', () => {
      const obj = {
        id: '123',
        email: 'test@example.com',
        phone: '+1234567890',
        name: 'John Doe',
      };
      
      const masked = DataMasking.maskObjectFields(obj, ['email', 'phone']);
      
      expect(masked.id).toBe(obj.id);
      expect(masked.name).toBe(obj.name);
      expect(masked.email).not.toBe(obj.email);
      expect(masked.phone).not.toBe(obj.phone);
    });
  });

  describe('Encryption Middleware', () => {
    it('should identify encrypted fields for models', () => {
      const userFields = EncryptionMiddleware.getEncryptedFields('User');
      const sessionFields = EncryptionMiddleware.getEncryptedFields('CoachingSession');
      const unknownFields = EncryptionMiddleware.getEncryptedFields('UnknownModel');
      
      expect(userFields).toContain('email');
      expect(userFields).toContain('phone');
      expect(sessionFields).toContain('sessionNotes');
      expect(unknownFields).toEqual([]);
    });

    it('should encrypt data for database', () => {
      const userData = {
        id: '123',
        name: 'John Doe',
        email: 'test@example.com',
        phone: '+1234567890',
      };
      
      const encrypted = EncryptionMiddleware.encryptForDatabase('User', userData);
      
      expect(encrypted.id).toBe(userData.id);
      expect(encrypted.name).toBe(userData.name);
      expect(encrypted.email).not.toBe(userData.email);
      expect(encrypted.phone).not.toBe(userData.phone);
    });

    it('should decrypt data from database', () => {
      const userData = {
        id: '123',
        name: 'John Doe',
        email: 'test@example.com',
        phone: '+1234567890',
      };
      
      const encrypted = EncryptionMiddleware.encryptForDatabase('User', userData);
      const decrypted = EncryptionMiddleware.decryptFromDatabase('User', encrypted);
      
      expect(decrypted).toEqual(userData);
    });

    it('should handle array decryption', () => {
      const users = [
        { id: '1', email: 'user1@example.com', name: 'User 1' },
        { id: '2', email: 'user2@example.com', name: 'User 2' },
      ];
      
      const encrypted = users.map(user => 
        EncryptionMiddleware.encryptForDatabase('User', user)
      );
      const decrypted = EncryptionMiddleware.decryptArrayFromDatabase('User', encrypted);
      
      expect(decrypted).toEqual(users);
    });
  });

  describe('Encryption Utils', () => {
    it('should detect encrypted data', () => {
      const plainText = 'plain text';
      const encrypted = encryptData(plainText, testKey);
      
      expect(EncryptionUtils.isEncrypted(plainText)).toBe(false);
      expect(EncryptionUtils.isEncrypted(encrypted)).toBe(true);
      expect(EncryptionUtils.isEncrypted('invalid-base64')).toBe(false);
    });

    it('should validate key strength', () => {
      const weakKey = '123';
      const strongKey = 'StrongKey123!@#$%^&*()_+ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      const defaultKey = 'default-dev-key-change-in-production';
      
      const weakValidation = EncryptionUtils.validateKeyStrength(weakKey);
      const strongValidation = EncryptionUtils.validateKeyStrength(strongKey);
      const defaultValidation = EncryptionUtils.validateKeyStrength(defaultKey);
      
      expect(weakValidation.isValid).toBe(false);
      expect(weakValidation.score).toBeLessThan(100);
      expect(weakValidation.issues.length).toBeGreaterThan(0);
      
      expect(strongValidation.isValid).toBe(true);
      expect(strongValidation.score).toBe(100);
      expect(strongValidation.issues.length).toBe(0);
      
      expect(defaultValidation.isValid).toBe(false);
      expect(defaultValidation.score).toBe(0);
      expect(defaultValidation.issues).toContain('Default development key detected - change in production');
    });

    it('should generate strong keys', () => {
      const key1 = EncryptionUtils.generateStrongKey();
      const key2 = EncryptionUtils.generateStrongKey(32);
      
      expect(key1.length).toBe(64);
      expect(key2.length).toBe(32);
      expect(key1).not.toBe(key2);
      
      const validation1 = EncryptionUtils.validateKeyStrength(key1);
      const validation2 = EncryptionUtils.validateKeyStrength(key2);
      
      expect(validation1.isValid).toBe(true);
      expect(validation2.isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully', () => {
      expect(() => encryptData('', testKey)).not.toThrow();
      expect(() => decryptData('invalid-data', testKey)).toThrow();
    });

    it('should handle field encryption errors', () => {
      const result = FieldEncryption.encryptFields({ test: null }, ['test']);
      expect(result.test).toBeNull();
    });

    it('should handle field decryption errors gracefully', () => {
      const data = { test: 'unencrypted-data' };
      const result = FieldEncryption.decryptFields(data, ['test']);
      expect(result.test).toBe('unencrypted-data'); // Should remain unchanged
    });
  });

  describe('Performance', () => {
    it('should encrypt/decrypt large data efficiently', () => {
      const largeData = 'x'.repeat(10000);
      
      const startTime = Date.now();
      const encrypted = encryptData(largeData, testKey);
      const decrypted = decryptData(encrypted, testKey);
      const endTime = Date.now();
      
      expect(decrypted).toBe(largeData);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple field encryption efficiently', () => {
      const data = {
        field1: 'data1'.repeat(100),
        field2: 'data2'.repeat(100),
        field3: 'data3'.repeat(100),
        field4: 'data4'.repeat(100),
        field5: 'data5'.repeat(100),
      };
      
      const startTime = Date.now();
      const encrypted = FieldEncryption.encryptFields(data, Object.keys(data) as (keyof typeof data)[]);
      const decrypted = FieldEncryption.decryptFields(encrypted, Object.keys(data) as (keyof typeof data)[]);
      const endTime = Date.now();
      
      expect(decrypted).toEqual(data);
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });
});