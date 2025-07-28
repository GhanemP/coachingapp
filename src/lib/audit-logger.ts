/**
 * Enhanced Audit Logging System
 * Comprehensive audit trail for compliance and security monitoring
 */

import { logger } from './simple-logger';
import { getEnvVar, toError } from './type-utils';

// Audit event types
export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  
  // Authorization events
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  ROLE_CHANGE = 'ROLE_CHANGE',
  
  // Data events
  DATA_CREATE = 'DATA_CREATE',
  DATA_READ = 'DATA_READ',
  DATA_UPDATE = 'DATA_UPDATE',
  DATA_DELETE = 'DATA_DELETE',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  
  // Encryption events
  DATA_ENCRYPTED = 'DATA_ENCRYPTED',
  DATA_DECRYPTED = 'DATA_DECRYPTED',
  ENCRYPTION_KEY_ROTATION = 'ENCRYPTION_KEY_ROTATION',
  
  // System events
  SYSTEM_START = 'SYSTEM_START',
  SYSTEM_SHUTDOWN = 'SYSTEM_SHUTDOWN',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  BACKUP_CREATED = 'BACKUP_CREATED',
  BACKUP_RESTORED = 'BACKUP_RESTORED',
  
  // Security events
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Business events
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_UPDATED = 'SESSION_UPDATED',
  SESSION_COMPLETED = 'SESSION_COMPLETED',
  ACTION_ITEM_CREATED = 'ACTION_ITEM_CREATED',
  ACTION_ITEM_COMPLETED = 'ACTION_ITEM_COMPLETED',
  SCORECARD_SUBMITTED = 'SCORECARD_SUBMITTED',
}

// Risk levels for audit events
export enum AuditRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Audit event interface
export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  riskLevel: AuditRiskLevel;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  resourceId?: string;
  action?: string;
  outcome: 'SUCCESS' | 'FAILURE' | 'PENDING';
  details: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// Audit context for tracking request information
export interface AuditContext {
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
}

// Audit configuration
interface AuditConfig {
  enabled: boolean;
  logLevel: string;
  retentionDays: number;
  enableRealTimeAlerts: boolean;
  sensitiveFields: string[];
  excludeEvents: AuditEventType[];
}

class AuditLogger {
  private config: AuditConfig;
  private eventBuffer: AuditEvent[] = [];
  private bufferSize = 100;
  private flushInterval = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.config = {
      enabled: getEnvVar('AUDIT_LOGGING_ENABLED', 'true') === 'true',
      logLevel: getEnvVar('AUDIT_LOG_LEVEL', 'info'),
      retentionDays: parseInt(getEnvVar('AUDIT_RETENTION_DAYS', '365'), 10),
      enableRealTimeAlerts: getEnvVar('AUDIT_REAL_TIME_ALERTS', 'true') === 'true',
      sensitiveFields: ['password', 'token', 'secret', 'key', 'ssn', 'creditCard'],
      excludeEvents: [],
    };

    // Start periodic buffer flush with proper lifecycle management
    if (this.config.enabled) {
      this.startBufferFlush();
    }
  }

  /**
   * Start buffer flush timer
   */
  private startBufferFlush(): void {
    if (this.flushTimer) {
      return; // Already running
    }
    this.flushTimer = setInterval(() => this.flushBuffer(), this.flushInterval);
  }

  /**
   * Stop buffer flush timer and prevent memory leaks
   */
  public stopBufferFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Cleanup resources and prevent memory leaks
   */
  public cleanup(): void {
    this.stopBufferFlush();
    // Flush any remaining events before cleanup
    if (this.eventBuffer.length > 0) {
      this.flushBuffer();
    }
  }

  /**
   * Log an audit event
   */
  async logEvent(
    eventType: AuditEventType,
    context: AuditContext,
    details: Record<string, unknown> = {},
    options: {
      riskLevel?: AuditRiskLevel;
      resource?: string;
      resourceId?: string;
      action?: string;
      outcome?: 'SUCCESS' | 'FAILURE' | 'PENDING';
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<void> {
    if (!this.config.enabled || this.config.excludeEvents.includes(eventType)) {
      return;
    }

    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      eventType,
      riskLevel: options.riskLevel || this.determineRiskLevel(eventType),
      userId: context.userId || undefined,
      sessionId: context.sessionId || undefined,
      ipAddress: context.ipAddress || undefined,
      userAgent: context.userAgent || undefined,
      resource: options.resource || undefined,
      resourceId: options.resourceId || undefined,
      action: options.action || undefined,
      outcome: options.outcome || 'SUCCESS',
      details: this.sanitizeDetails(details),
      metadata: {
        ...options.metadata,
        requestId: context.requestId || undefined,
        correlationId: context.correlationId || undefined,
        timestamp: new Date().toISOString(),
      },
    };

    // Add to buffer for batch processing
    this.eventBuffer.push(auditEvent);

    // Immediate flush for critical events
    if (auditEvent.riskLevel === AuditRiskLevel.CRITICAL) {
      await this.flushBuffer();
    }

    // Real-time alerts for high-risk events
    if (this.config.enableRealTimeAlerts && 
        [AuditRiskLevel.HIGH, AuditRiskLevel.CRITICAL].includes(auditEvent.riskLevel)) {
      await this.sendRealTimeAlert(auditEvent);
    }

    // Log to standard logger
    this.logToStandardLogger(auditEvent);
  }

  /**
   * Log authentication events
   */
  async logAuthentication(
    eventType: AuditEventType.LOGIN_SUCCESS | AuditEventType.LOGIN_FAILURE | AuditEventType.LOGOUT,
    context: AuditContext,
    details: Record<string, unknown> = {}
  ): Promise<void> {
    await this.logEvent(eventType, context, details, {
      riskLevel: eventType === AuditEventType.LOGIN_FAILURE ? AuditRiskLevel.MEDIUM : AuditRiskLevel.LOW,
      resource: 'authentication',
      action: eventType.toLowerCase(),
    });
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    eventType: AuditEventType.DATA_CREATE | AuditEventType.DATA_READ | AuditEventType.DATA_UPDATE | AuditEventType.DATA_DELETE,
    context: AuditContext,
    resource: string,
    resourceId: string,
    details: Record<string, unknown> = {}
  ): Promise<void> {
    await this.logEvent(eventType, context, details, {
      riskLevel: eventType === AuditEventType.DATA_DELETE ? AuditRiskLevel.HIGH : AuditRiskLevel.LOW,
      resource,
      resourceId,
      action: eventType.replace('DATA_', '').toLowerCase(),
    });
  }

  /**
   * Log security events
   */
  async logSecurity(
    eventType: AuditEventType,
    context: AuditContext,
    details: Record<string, unknown> = {},
    riskLevel: AuditRiskLevel = AuditRiskLevel.HIGH
  ): Promise<void> {
    await this.logEvent(eventType, context, details, {
      riskLevel,
      resource: 'security',
      action: eventType.toLowerCase(),
    });
  }

  /**
   * Log business events
   */
  async logBusiness(
    eventType: AuditEventType,
    context: AuditContext,
    resource: string,
    resourceId: string,
    details: Record<string, unknown> = {}
  ): Promise<void> {
    await this.logEvent(eventType, context, details, {
      riskLevel: AuditRiskLevel.LOW,
      resource,
      resourceId,
      action: eventType.toLowerCase(),
    });
  }

  /**
   * Query audit events with filtering
   */
  queryEvents(_filters: {
    startDate?: Date;
    endDate?: Date;
    userId?: string;
    eventType?: AuditEventType;
    riskLevel?: AuditRiskLevel;
    resource?: string;
    outcome?: 'SUCCESS' | 'FAILURE' | 'PENDING';
    limit?: number;
    offset?: number;
  }): Promise<{ events: AuditEvent[]; total: number }> {
    // In a real implementation, this would query the audit database
    // For now, return empty results
    return Promise.resolve({ events: [], total: 0 });
  }

  /**
   * Generate audit report
   */
  async generateReport(
    startDate: Date,
    endDate: Date,
    options: {
      groupBy?: 'eventType' | 'userId' | 'riskLevel' | 'resource';
      includeDetails?: boolean;
      format?: 'json' | 'csv' | 'pdf';
    } = {}
  ): Promise<unknown> {
    const events = await this.queryEvents({ startDate, endDate });
    
    // Generate report based on options
    return {
      period: { startDate, endDate },
      totalEvents: events.total,
      summary: this.generateSummary(events.events),
      events: options.includeDetails ? events.events : undefined,
    };
  }

  /**
   * Flush event buffer to persistent storage
   */
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) {return;}

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // In a real implementation, this would write to a database or external service
      logger.info('Flushing audit events to storage', {
        eventCount: eventsToFlush.length,
        events: eventsToFlush.map(e => ({
          id: e.id,
          eventType: e.eventType,
          timestamp: e.timestamp,
          riskLevel: e.riskLevel,
        })),
      });

      // Simulate async storage operation
      await new Promise(resolve => setTimeout(resolve, 10));
    } catch (error) {
      logger.error('Failed to flush audit events', toError(error));
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...eventsToFlush);
    }
  }

  /**
   * Send real-time alert for high-risk events
   */
  private sendRealTimeAlert(event: AuditEvent): Promise<void> {
    try {
      logger.warn('High-risk audit event detected', {
        eventId: event.id,
        eventType: event.eventType,
        riskLevel: event.riskLevel,
        userId: event.userId || 'anonymous',
        resource: event.resource || 'unknown',
        timestamp: event.timestamp.toISOString(),
      });

      // In a real implementation, this would send alerts via:
      // - Email notifications
      // - Slack/Teams webhooks
      // - SMS alerts
      // - Security incident management systems
      
      return Promise.resolve();
    } catch (error) {
      logger.error('Failed to send real-time alert', toError(error));
      return Promise.resolve();
    }
  }

  /**
   * Log to standard logger for immediate visibility
   */
  private logToStandardLogger(event: AuditEvent): void {
    const logData = {
      auditEventId: event.id,
      eventType: event.eventType,
      riskLevel: event.riskLevel,
      userId: event.userId || 'anonymous',
      resource: event.resource || 'unknown',
      outcome: event.outcome,
      timestamp: event.timestamp.toISOString(),
    };

    const message = `AUDIT: ${event.riskLevel.toLowerCase()}-risk event - ${event.eventType}`;

    switch (event.riskLevel) {
      case AuditRiskLevel.CRITICAL:
        logger.error(message, new Error(`Critical audit event: ${event.eventType}`));
        break;
      case AuditRiskLevel.HIGH:
        logger.warn(message, logData);
        break;
      case AuditRiskLevel.MEDIUM:
        logger.info(message, logData);
        break;
      default:
        logger.debug(message, logData);
    }
  }

  /**
   * Determine risk level based on event type
   */
  private determineRiskLevel(eventType: AuditEventType): AuditRiskLevel {
    const riskMapping: Record<AuditEventType, AuditRiskLevel> = {
      // Critical events
      [AuditEventType.ACCOUNT_LOCKED]: AuditRiskLevel.CRITICAL,
      [AuditEventType.SECURITY_VIOLATION]: AuditRiskLevel.CRITICAL,
      [AuditEventType.DATA_DELETE]: AuditRiskLevel.CRITICAL,
      [AuditEventType.ENCRYPTION_KEY_ROTATION]: AuditRiskLevel.CRITICAL,
      
      // High-risk events
      [AuditEventType.LOGIN_FAILURE]: AuditRiskLevel.HIGH,
      [AuditEventType.ACCESS_DENIED]: AuditRiskLevel.HIGH,
      [AuditEventType.SUSPICIOUS_ACTIVITY]: AuditRiskLevel.HIGH,
      [AuditEventType.RATE_LIMIT_EXCEEDED]: AuditRiskLevel.HIGH,
      [AuditEventType.INVALID_TOKEN]: AuditRiskLevel.HIGH,
      [AuditEventType.PASSWORD_CHANGE]: AuditRiskLevel.HIGH,
      [AuditEventType.ROLE_CHANGE]: AuditRiskLevel.HIGH,
      
      // Medium-risk events
      [AuditEventType.DATA_EXPORT]: AuditRiskLevel.MEDIUM,
      [AuditEventType.DATA_IMPORT]: AuditRiskLevel.MEDIUM,
      [AuditEventType.PERMISSION_CHANGE]: AuditRiskLevel.MEDIUM,
      [AuditEventType.CONFIGURATION_CHANGE]: AuditRiskLevel.MEDIUM,
      [AuditEventType.PASSWORD_RESET]: AuditRiskLevel.MEDIUM,
      
      // Low-risk events (default)
      [AuditEventType.LOGIN_SUCCESS]: AuditRiskLevel.LOW,
      [AuditEventType.LOGOUT]: AuditRiskLevel.LOW,
      [AuditEventType.DATA_READ]: AuditRiskLevel.LOW,
      [AuditEventType.DATA_CREATE]: AuditRiskLevel.LOW,
      [AuditEventType.DATA_UPDATE]: AuditRiskLevel.LOW,
      [AuditEventType.ACCESS_GRANTED]: AuditRiskLevel.LOW,
      [AuditEventType.SESSION_CREATED]: AuditRiskLevel.LOW,
      [AuditEventType.SESSION_UPDATED]: AuditRiskLevel.LOW,
      [AuditEventType.SESSION_COMPLETED]: AuditRiskLevel.LOW,
      [AuditEventType.ACTION_ITEM_CREATED]: AuditRiskLevel.LOW,
      [AuditEventType.ACTION_ITEM_COMPLETED]: AuditRiskLevel.LOW,
      [AuditEventType.SCORECARD_SUBMITTED]: AuditRiskLevel.LOW,
      [AuditEventType.DATA_ENCRYPTED]: AuditRiskLevel.LOW,
      [AuditEventType.DATA_DECRYPTED]: AuditRiskLevel.LOW,
      [AuditEventType.SYSTEM_START]: AuditRiskLevel.LOW,
      [AuditEventType.SYSTEM_SHUTDOWN]: AuditRiskLevel.LOW,
      [AuditEventType.BACKUP_CREATED]: AuditRiskLevel.LOW,
      [AuditEventType.BACKUP_RESTORED]: AuditRiskLevel.MEDIUM,
      [AuditEventType.ACCOUNT_UNLOCKED]: AuditRiskLevel.MEDIUM,
    };

    return riskMapping[eventType] || AuditRiskLevel.LOW;
  }

  /**
   * Sanitize sensitive data from audit details
   */
  private sanitizeDetails(details: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...details };

    for (const field of this.config.sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    // Deep sanitization for nested objects
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeDetails(value as Record<string, unknown>);
      }
    }

    return sanitized;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(events: AuditEvent[]): Record<string, unknown> {
    const summary = {
      totalEvents: events.length,
      eventsByType: {} as Record<string, number>,
      eventsByRiskLevel: {} as Record<string, number>,
      eventsByOutcome: {} as Record<string, number>,
      uniqueUsers: new Set<string>(),
      timeRange: {
        earliest: events.length > 0 ? Math.min(...events.map(e => e.timestamp.getTime())) : null,
        latest: events.length > 0 ? Math.max(...events.map(e => e.timestamp.getTime())) : null,
      },
    };

    for (const event of events) {
      // Count by type
      summary.eventsByType[event.eventType] = (summary.eventsByType[event.eventType] || 0) + 1;
      
      // Count by risk level
      summary.eventsByRiskLevel[event.riskLevel] = (summary.eventsByRiskLevel[event.riskLevel] || 0) + 1;
      
      // Count by outcome
      summary.eventsByOutcome[event.outcome] = (summary.eventsByOutcome[event.outcome] || 0) + 1;
      
      // Track unique users
      if (event.userId) {
        summary.uniqueUsers.add(event.userId);
      }
    }

    return {
      ...summary,
      uniqueUserCount: summary.uniqueUsers.size,
      uniqueUsers: undefined, // Remove Set from output
    };
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger();

// Cleanup on process exit to prevent memory leaks
if (typeof window === 'undefined') {
  process.on('exit', () => auditLogger.cleanup());
  process.on('SIGINT', () => auditLogger.cleanup());
  process.on('SIGTERM', () => auditLogger.cleanup());
}

// Convenience functions for common audit operations
export const audit = {
  // Authentication
  loginSuccess: (context: AuditContext, details?: Record<string, unknown>) =>
    auditLogger.logAuthentication(AuditEventType.LOGIN_SUCCESS, context, details),
  
  loginFailure: (context: AuditContext, details?: Record<string, unknown>) =>
    auditLogger.logAuthentication(AuditEventType.LOGIN_FAILURE, context, details),
  
  logout: (context: AuditContext, details?: Record<string, unknown>) =>
    auditLogger.logAuthentication(AuditEventType.LOGOUT, context, details),

  // Data access
  dataCreate: (context: AuditContext, resource: string, resourceId: string, details?: Record<string, unknown>) =>
    auditLogger.logDataAccess(AuditEventType.DATA_CREATE, context, resource, resourceId, details),
  
  dataRead: (context: AuditContext, resource: string, resourceId: string, details?: Record<string, unknown>) =>
    auditLogger.logDataAccess(AuditEventType.DATA_READ, context, resource, resourceId, details),
  
  dataUpdate: (context: AuditContext, resource: string, resourceId: string, details?: Record<string, unknown>) =>
    auditLogger.logDataAccess(AuditEventType.DATA_UPDATE, context, resource, resourceId, details),
  
  dataDelete: (context: AuditContext, resource: string, resourceId: string, details?: Record<string, unknown>) =>
    auditLogger.logDataAccess(AuditEventType.DATA_DELETE, context, resource, resourceId, details),

  // Security
  accessDenied: (context: AuditContext, details?: Record<string, unknown>) =>
    auditLogger.logSecurity(AuditEventType.ACCESS_DENIED, context, details),
  
  suspiciousActivity: (context: AuditContext, details?: Record<string, unknown>) =>
    auditLogger.logSecurity(AuditEventType.SUSPICIOUS_ACTIVITY, context, details, AuditRiskLevel.CRITICAL),

  // Business events
  sessionCreated: (context: AuditContext, sessionId: string, details?: Record<string, unknown>) =>
    auditLogger.logBusiness(AuditEventType.SESSION_CREATED, context, 'coaching_session', sessionId, details),
  
  actionItemCreated: (context: AuditContext, itemId: string, details?: Record<string, unknown>) =>
    auditLogger.logBusiness(AuditEventType.ACTION_ITEM_CREATED, context, 'action_item', itemId, details),
};

// Types are already exported above with the interfaces