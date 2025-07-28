import { NextRequest } from 'next/server';
import { z } from 'zod';

// Server-side fallback - basic sanitization
const serverSanitize = (input: string) => {
  // Basic sanitization for server-side
  return input
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;');
};

// Synchronous version for use in zod transforms
const syncSanitizeHTML = (input: string) => {
  // On server-side, use basic sanitization
  if (typeof window === 'undefined') {
    return serverSanitize(input);
  }
  
  // On client-side, we could use DOMPurify directly if available
  // For now, we'll use the same basic sanitization
  return serverSanitize(input);
};

// Function to get DOMPurify instance
const getDOMPurify = async () => {
  if (typeof window !== 'undefined') {
    // Client-side: use isomorphic-dompurify
    const dompurifyModule = await import('isomorphic-dompurify');
    return dompurifyModule.default;
  } else {
    // Server-side: return a mock with basic sanitization
    return {
      sanitize: serverSanitize
    };
  }
};

// SQL injection prevention patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
  /(-{2}|\/\*|\*\/|;|'|"|`|\\x00|\\n|\\r|\\x1a)/g,
  /(WAITFOR\s+DELAY|BENCHMARK|SLEEP|LOAD_FILE|OUTFILE)/gi,
];

// XSS prevention patterns
const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>/gi,
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\./g,
  /\.\.%2[fF]/g,
  /%2[eE]\./g,
  /\x00/g,
  /[<>:"|?*]/g,
];

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$(){}[\]<>]/g,
  /\$\{.*\}/g,
  /\$\(.*\)/g,
];

export class InputValidator {
  // Comprehensive SQL injection prevention
  static sanitizeSQLInput(input: string): string {
    let sanitized = input;
    
    // Check for SQL injection patterns
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        throw new Error('Potential SQL injection detected');
      }
    }
    
    // Escape special characters
    sanitized = sanitized
      .replace(/'/g, "''")
      .replace(/"/g, '""')
      .replace(/\\/g, '\\\\')
      .replace(/\0/g, '\\0')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\x1a/g, '\\Z');
    
    return sanitized;
  }
  
  // Enhanced XSS prevention
  static async sanitizeHTML(input: string, _options?: {
    allowedTags?: string[];
    allowedAttributes?: string[];
  }): Promise<string> {
    // Check for XSS patterns
    for (const pattern of XSS_PATTERNS) {
      if (pattern.test(input)) {
        console.warn('Potential XSS attempt detected');
      }
    }
    
    // Get DOMPurify instance
    const DOMPurify = await getDOMPurify();
    
    // Sanitize input
    return DOMPurify.sanitize(input);
  }
  
  // Path traversal prevention
  static sanitizePath(path: string): string {
    // Check for path traversal patterns
    for (const pattern of PATH_TRAVERSAL_PATTERNS) {
      if (pattern.test(path)) {
        throw new Error('Invalid path: potential path traversal detected');
      }
    }
    
    // Normalize and validate path
    const sanitized = path
      .split('/')
      .filter(segment => segment && segment !== '.' && segment !== '..')
      .join('/');
    
    // Ensure path doesn't start with system directories
    const forbiddenPaths = ['/etc', '/usr', '/var', '/proc', '/sys', '/dev'];
    if (forbiddenPaths.some(forbidden => sanitized.startsWith(forbidden))) {
      throw new Error('Access to system directories is forbidden');
    }
    
    return sanitized;
  }
  
  // Command injection prevention
  static sanitizeCommand(command: string): string {
    // Check for command injection patterns
    for (const pattern of COMMAND_INJECTION_PATTERNS) {
      if (pattern.test(command)) {
        throw new Error('Invalid command: potential command injection detected');
      }
    }
    
    // Whitelist allowed characters
    const sanitized = command.replace(/[^a-zA-Z0-9\s\-_.]/g, '');
    
    return sanitized;
  }
  
  // Email validation with additional security checks
  static validateEmail(email: string): string {
    const emailSchema = z.string()
      .email('Invalid email format')
      .max(254, 'Email too long')
      .toLowerCase()
      .transform(val => val.trim())
      .refine(val => {
        // Check for suspicious patterns
        const suspicious = [
          'script',
          // eslint-disable-next-line no-script-url
          'javascript:',
          'onclick', 'onerror',
          '<', '>', '"', "'", '`', '\n', '\r'
        ];
        return !suspicious.some(pattern => val.includes(pattern));
      }, 'Email contains suspicious content');
    
    return emailSchema.parse(email);
  }
  
  // URL validation with security checks
  static validateURL(url: string, options?: {
    allowedProtocols?: string[];
    allowedDomains?: string[];
  }): string {
    const allowedProtocols = options?.allowedProtocols || ['http:', 'https:'];
    const allowedDomains = options?.allowedDomains || [];
    
    try {
      const parsed = new URL(url);
      
      // Check protocol
      if (!allowedProtocols.includes(parsed.protocol)) {
        throw new Error(`Invalid protocol: ${parsed.protocol}`);
      }
      
      // Check domain if whitelist provided
      if (allowedDomains.length > 0 && !allowedDomains.includes(parsed.hostname)) {
        throw new Error(`Domain not allowed: ${parsed.hostname}`);
      }
      
      // Check for suspicious patterns
      // eslint-disable-next-line no-script-url
      if (url.includes('javascript:') || url.includes('data:') || url.includes('vbscript:')) {
        throw new Error('URL contains potentially dangerous protocol');
      }
      
      return parsed.toString();
    } catch {
      throw new Error('Invalid URL format');
    }
  }
  
  // File name sanitization
  static sanitizeFileName(fileName: string): string {
    // Remove path components
    const name = fileName.split(/[/\\]/).pop() || '';
    
    // Remove dangerous characters
    const sanitized = name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.{2,}/g, '.')
      .substring(0, 255); // Limit length
    
    // Check for dangerous extensions
    const dangerousExtensions = [
      '.exe', '.bat', '.cmd', '.com', '.pif', '.scr',
      '.vbs', '.js', '.jar', '.zip', '.rar'
    ];
    
    if (dangerousExtensions.some(ext => sanitized.toLowerCase().endsWith(ext))) {
      throw new Error('File type not allowed');
    }
    
    return sanitized;
  }
  
  // JSON validation with depth limit
  static validateJSON(input: string, maxDepth: number = 10): unknown {
    let depth = 0;
    
    const checkDepth = (obj: unknown): void => {
      if (depth > maxDepth) {
        throw new Error('JSON exceeds maximum depth');
      }
      
      depth++;
      
      if (Array.isArray(obj)) {
        obj.forEach(checkDepth);
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(checkDepth);
      }
      
      depth--;
    };
    
    try {
      const parsed = JSON.parse(input);
      checkDepth(parsed);
      return parsed;
    } catch {
      throw new Error('Invalid JSON format');
    }
  }
  
  // Request body size validation
  static validateRequestSize(
    request: NextRequest,
    maxSize: number = 1048576 // 1MB default
  ): Promise<void> {
    const contentLength = request.headers.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      throw new Error('Request body too large');
    }
    
    return Promise.resolve();
  }
  
  // Rate limiting key generation
  static generateRateLimitKey(request: NextRequest, userId?: string): string {
    const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const path = new URL(request.url).pathname;
    
    return `${ip}:${userId || 'anonymous'}:${path}:${userAgent}`;
  }
}

// Validation schemas for common entities
export const validationSchemas = {
  // User registration
  userRegistration: z.object({
    email: z.string().email().transform(val => InputValidator.validateEmail(val)),
    password: z.string().min(12).max(128),
    name: z.string().min(2).max(100).transform(val => syncSanitizeHTML(val)),
    role: z.enum(['AGENT', 'TEAM_LEADER', 'MANAGER', 'ADMIN']),
  }),
  
  // Quick note creation
  quickNote: z.object({
    content: z.string().min(1).max(5000).transform(val => syncSanitizeHTML(val)),
    category: z.enum(['PERFORMANCE', 'BEHAVIORAL', 'TRAINING', 'OTHER']),
    isPrivate: z.boolean(),
    agentId: z.string().uuid(),
  }),
  
  // Action item creation
  actionItem: z.object({
    title: z.string().min(1).max(200).transform(val => syncSanitizeHTML(val)),
    description: z.string().max(2000).optional().transform(val => val ? syncSanitizeHTML(val) : undefined),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    dueDate: z.string().datetime(),
    assignedTo: z.string().uuid(),
  }),
  
  // File upload
  fileUpload: z.object({
    filename: z.string().transform(val => InputValidator.sanitizeFileName(val)),
    mimetype: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9\/+\-\.]*$/),
    size: z.number().max(10485760), // 10MB
  }),
  
  // Search query
  searchQuery: z.object({
    q: z.string().max(100).transform(val => syncSanitizeHTML(val)),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    sort: z.enum(['asc', 'desc']).optional(),
    sortBy: z.string().regex(/^[a-zA-Z_]+$/).optional(),
  }),
};

// Middleware factory for request validation
export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<{
    success: boolean;
    data?: T;
    error?: string;
    details?: Array<{
      field: string;
      message: string;
      code: string;
    }>;
  }> => {
    try {
      // Validate request size
      await InputValidator.validateRequestSize(request);
      
      // Parse and validate body
      const body = await request.json();
      const validated = schema.parse(body);
      
      return { success: true, data: validated };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
            code: e.code,
          })),
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Validation error',
      };
    }
  };
}