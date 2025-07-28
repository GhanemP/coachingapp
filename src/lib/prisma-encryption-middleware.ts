/**
 * Prisma Encryption Middleware
 * Automatically encrypts and decrypts sensitive data in database operations
 */

import { Prisma } from '@prisma/client';

import { EncryptionMiddleware, EncryptionUtils } from './encryption';
import { logger } from './simple-logger';
import { toError } from './type-utils';

/**
 * Create Prisma middleware for automatic encryption/decryption
 */
export function createEncryptionMiddleware(): Prisma.Middleware {
  return async (params, next) => {
    const { model, action } = params;
    
    if (!model) {
      return next(params);
    }

    try {
      // Handle write operations (create, update, upsert)
      if (['create', 'update', 'upsert', 'createMany', 'updateMany'].includes(action)) {
        if (params.args?.data) {
          if (Array.isArray(params.args.data)) {
            // Handle bulk operations
            params.args.data = params.args.data.map((item: Record<string, unknown>) =>
              EncryptionMiddleware.encryptForDatabase(model, item)
            );
          } else {
            // Handle single record operations
            params.args.data = EncryptionMiddleware.encryptForDatabase(model, params.args.data);
          }
        }

        // Handle upsert create data
        if (action === 'upsert' && params.args?.create) {
          params.args.create = EncryptionMiddleware.encryptForDatabase(model, params.args.create);
        }

        // Handle upsert update data
        if (action === 'upsert' && params.args?.update) {
          params.args.update = EncryptionMiddleware.encryptForDatabase(model, params.args.update);
        }
      }

      // Execute the database operation
      const result = await next(params);

      // Handle read operations (findFirst, findMany, findUnique, etc.)
      if (['findFirst', 'findMany', 'findUnique', 'findFirstOrThrow', 'findUniqueOrThrow'].includes(action)) {
        if (result) {
          if (Array.isArray(result)) {
            // Handle array results
            return EncryptionMiddleware.decryptArrayFromDatabase(model, result);
          } else {
            // Handle single record results
            return EncryptionMiddleware.decryptFromDatabase(model, result);
          }
        }
      }

      return result;
    } catch (error) {
      logger.error(`Encryption middleware error for ${model}.${action}:`, toError(error));
      throw error;
    }
  };
}

/**
 * Enhanced Prisma middleware with selective encryption
 */
export function createSelectiveEncryptionMiddleware(
  encryptionConfig: Record<string, { fields: string[]; enabled: boolean }>
): Prisma.Middleware {
  return async (params, next) => {
    const { model, action } = params;
    
    if (!model || !encryptionConfig[model]?.enabled) {
      return next(params);
    }

    const config = encryptionConfig[model];

    try {
      // Handle write operations
      if (['create', 'update', 'upsert', 'createMany', 'updateMany'].includes(action)) {
        if (params.args?.data) {
          if (Array.isArray(params.args.data)) {
            params.args.data = params.args.data.map((item: Record<string, unknown>) =>
              encryptSpecificFields(item, config.fields)
            );
          } else {
            params.args.data = encryptSpecificFields(params.args.data, config.fields);
          }
        }

        if (action === 'upsert' && params.args?.create) {
          params.args.create = encryptSpecificFields(params.args.create, config.fields);
        }

        if (action === 'upsert' && params.args?.update) {
          params.args.update = encryptSpecificFields(params.args.update, config.fields);
        }
      }

      const result = await next(params);

      // Handle read operations
      if (['findFirst', 'findMany', 'findUnique', 'findFirstOrThrow', 'findUniqueOrThrow'].includes(action)) {
        if (result) {
          if (Array.isArray(result)) {
            return result.map((item: Record<string, unknown>) =>
              decryptSpecificFields(item, config.fields)
            );
          } else {
            return decryptSpecificFields(result, config.fields);
          }
        }
      }

      return result;
    } catch (error) {
      logger.error(`Selective encryption middleware error for ${model}.${action}:`, toError(error));
      throw error;
    }
  };
}

/**
 * Encrypt specific fields in a data object
 */
function encryptSpecificFields<T extends Record<string, unknown>>(
  data: T,
  fieldsToEncrypt: string[]
): T {
  const result = { ...data } as Record<string, unknown>;
  
  for (const field of fieldsToEncrypt) {
    const value = result[field];
    if (typeof value === 'string' && value.length > 0) {
      try {
        const encrypted = EncryptionMiddleware.encryptForDatabase('Generic', { [field]: value });
        result[field] = encrypted[field];
      } catch (error) {
        logger.error(`Failed to encrypt field ${field}:`, toError(error));
        // Continue without encryption on error
      }
    }
  }
  
  return result as T;
}

/**
 * Decrypt specific fields in a data object
 */
function decryptSpecificFields<T extends Record<string, unknown>>(
  data: T,
  fieldsToDecrypt: string[]
): T {
  const result = { ...data } as Record<string, unknown>;
  
  for (const field of fieldsToDecrypt) {
    const value = result[field];
    if (typeof value === 'string' && value.length > 0) {
      try {
        const decrypted = EncryptionMiddleware.decryptFromDatabase('Generic', { [field]: value });
        result[field] = decrypted[field];
      } catch (error) {
        logger.warn(`Failed to decrypt field ${field}, assuming unencrypted`, {
          field,
          errorMessage: toError(error).message,
        });
        // Keep original value if decryption fails (backward compatibility)
      }
    }
  }
  
  return result as T;
}

/**
 * Middleware for logging encrypted field access
 */
export function createEncryptionAuditMiddleware(): Prisma.Middleware {
  return (params, next) => {
    const { model, action } = params;
    
    if (!model) {
      return next(params);
    }

    const encryptedFields = EncryptionMiddleware.getEncryptedFields(model);
    
    if (encryptedFields.length > 0) {
      const operationType = ['create', 'update', 'upsert', 'createMany', 'updateMany'].includes(action)
        ? 'write'
        : 'read';
      
      logger.info(`Encrypted field access: ${model}.${action}`, {
        model,
        action,
        operationType,
        encryptedFields,
        timestamp: new Date().toISOString(),
      });
    }

    return next(params);
  };
}

/**
 * Configuration for encryption middleware
 */
export const ENCRYPTION_CONFIG: Record<string, { fields: string[]; enabled: boolean }> = {
  User: {
    fields: ['email', 'phone'],
    enabled: true,
  },
  CoachingSession: {
    fields: ['sessionNotes', 'preparationNotes'],
    enabled: true,
  },
  ActionItem: {
    fields: ['description', 'notes'],
    enabled: true,
  },
  QuickNote: {
    fields: ['content'],
    enabled: true,
  },
  ActionPlan: {
    fields: ['description'],
    enabled: true,
  },
};

/**
 * Initialize all encryption middlewares
 */
export function initializeEncryptionMiddlewares(prisma: { $use: (middleware: Prisma.Middleware) => void }) {
  // Add encryption middleware
  prisma.$use(createEncryptionMiddleware());
  
  // Add audit middleware
  prisma.$use(createEncryptionAuditMiddleware());
  
  logger.info('Encryption middlewares initialized', {
    middlewares: ['encryption', 'audit'],
    encryptedModels: Object.keys(ENCRYPTION_CONFIG),
  });
}

/**
 * Utility to check if a field should be encrypted
 */
export function shouldEncryptField(model: string, field: string): boolean {
  const config = ENCRYPTION_CONFIG[model];
  return Boolean(config?.enabled && config.fields.includes(field));
}

/**
 * Utility to get all encrypted fields for a model
 */
export function getEncryptedFieldsForModel(model: string): string[] {
  const config = ENCRYPTION_CONFIG[model];
  return config?.enabled ? config.fields : [];
}

/**
 * Migration utility to encrypt existing data
 */
export async function migrateExistingDataToEncrypted(
  prisma: Record<string, { findMany: (args: unknown) => Promise<unknown[]>; update: (args: unknown) => Promise<unknown> }>,
  model: string,
  batchSize: number = 100
) {
  const encryptedFields = getEncryptedFieldsForModel(model);
  
  if (encryptedFields.length === 0) {
    logger.info(`No encrypted fields configured for model ${model}`);
    return;
  }

  logger.info(`Starting encryption migration for ${model}`, {
    model,
    encryptedFields,
    batchSize,
  });

  let processed = 0;
  let hasMore = true;
  
  while (hasMore) {
    try {
      // Fetch batch of records - sequential batching is intentional for migration
      // eslint-disable-next-line no-await-in-loop
      const records = await prisma[model.toLowerCase()].findMany({
        take: batchSize,
        skip: processed,
        orderBy: { id: 'asc' },
      });

      if (records.length === 0) {
        hasMore = false;
        break;
      }

      // Process each record - collect updates first, then execute in parallel
      const updatePromises: Promise<unknown>[] = [];
      
      for (const record of records) {
        const typedRecord = record as Record<string, unknown> & { id: string };
        const updates: Record<string, unknown> = {};
        let needsUpdate = false;

        for (const field of encryptedFields) {
          const value = typedRecord[field];
          if (typeof value === 'string' && value.length > 0) {
            // Check if already encrypted
            if (!EncryptionUtils.isEncrypted(value)) {
              updates[field] = EncryptionMiddleware.encryptForDatabase(model, { [field]: value })[field];
              needsUpdate = true;
            }
          }
        }

        if (needsUpdate) {
          // Collect update promises instead of awaiting immediately
          updatePromises.push(
            prisma[model.toLowerCase()].update({
              where: { id: typedRecord.id },
              data: updates,
            })
          );
        }
      }

      // Execute all updates in parallel - this await is intentional for batch completion
      if (updatePromises.length > 0) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(updatePromises);
      }

      processed += records.length;
      logger.info(`Processed ${processed} records for ${model} encryption migration`);

    } catch (error) {
      logger.error(`Error in encryption migration for ${model}:`, toError(error));
      throw error;
    }
  }

  logger.info(`Completed encryption migration for ${model}`, {
    model,
    totalProcessed: processed,
  });
}