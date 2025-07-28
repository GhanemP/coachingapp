#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Common TypeScript error patterns and their fixes
const fixes = [
  // Fix environment variable access with bracket notation
  {
    pattern: /process\.env\.([A-Z_]+)/g,
    replacement: "process.env['$1']",
  },

  // Fix error handling with unknown type
  {
    pattern: /logger\.(error|warn|info)\(([^,]+),\s*error\)/g,
    replacement: 'logger.$1($2, error as Error)',
  },

  // Fix socket auth property access
  {
    pattern: /socket\.handshake\.auth\.([a-zA-Z]+)/g,
    replacement: "socket.handshake.auth['$1']",
  },

  // Fix optional property assignments for Prisma
  {
    pattern: /(\w+):\s*([^,\n]+)\s*\|\s*undefined/g,
    replacement: '$1: $2 || undefined',
  },
];

// Files to process (excluding node_modules, .next, etc.)
const excludePatterns = ['node_modules', '.next', 'dist', 'build', 'coverage', '.git'];

function shouldProcessFile(filePath) {
  const ext = path.extname(filePath);
  return (
    ['.ts', '.tsx'].includes(ext) && !excludePatterns.some(pattern => filePath.includes(pattern))
  );
}

function getAllFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory() && !excludePatterns.includes(entry.name)) {
      getAllFiles(fullPath, files);
    } else if (entry.isFile() && shouldProcessFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Apply each fix pattern
    for (const fix of fixes) {
      const originalContent = content;
      content = content.replace(fix.pattern, fix.replacement);
      if (content !== originalContent) {
        modified = true;
      }
    }

    // Specific fixes for common patterns

    // Fix Redis password optional property
    if (filePath.includes('redis.ts')) {
      content = content.replace(
        /password:\s*process\.env\['REDIS_PASSWORD'\]/g,
        "password: process.env['REDIS_PASSWORD'] || undefined"
      );
      modified = true;
    }

    // Fix Prisma data assignments with optional properties
    if (content.includes('data: {') && content.includes('| undefined')) {
      content = content.replace(/(\w+):\s*([^,\n]+)\s*\|\s*undefined,/g, '$1: $2 || undefined,');
      modified = true;
    }

    // Fix LogContext assignments
    if (content.includes('LogContext')) {
      content = content.replace(
        /userAgent:\s*([^,\n]+)\s*\|\s*undefined/g,
        "userAgent: $1 || 'unknown'"
      );
      content = content.replace(/userId:\s*([^,\n]+)\s*\|\s*undefined/g, 'userId: $1 || undefined');
      modified = true;
    }

    // Fix array access with optional chaining
    content = content.replace(/(\w+)\[(\w+)\]\.(\w+)/g, '$1[$2]?.$3');

    // Fix status assignments in Prisma data
    content = content.replace(/status:\s*([^,\n]+)\s*\|\s*undefined/g, 'status: $1 as string');

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Starting comprehensive TypeScript error fixes...\n');

  const files = getAllFiles('.');
  let fixedCount = 0;

  for (const file of files) {
    if (fixFile(file)) {
      fixedCount++;
    }
  }

  console.log(`\n✨ Fixed ${fixedCount} files out of ${files.length} processed`);
  console.log('🎯 Run "npx tsc --noEmit" to check remaining errors');
}

// Run main function if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
