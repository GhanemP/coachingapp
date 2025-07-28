#!/usr/bin/env node

import fs from 'fs';
import _path from 'path';

// Files with syntax errors that need manual fixes
const filesToFix = [
  'scripts/migrate-to-postgres.ts',
  'src/app/api/session-planning/agent-context/[id]/route.ts',
  'src/app/api/users/profile/route.ts',
  'src/app/team-leader/dashboard/page.tsx',
  'src/components/ui/date-range-picker.tsx',
  'src/hooks/use-socket.ts',
  'src/lib/audit-logger.ts',
  'src/lib/audit-middleware.ts',
  'src/lib/database-monitor.ts',
  'src/lib/performance-monitor.ts',
  'src/lib/prisma-optimized.ts',
  'src/lib/prisma.ts',
  'src/lib/simple-database-monitor.ts',
  'src/lib/socket-helpers.ts',
  'src/lib/type-utils.ts',
  'src/middleware/logging.ts',
];

function fixSyntaxErrors(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const _modified = false;

    // Fix double pipe syntax errors: | | || -> ||
    const originalContent = content;
    content = content.replace(/\s*\|\s*\|\s*\|\|\s*/g, ' || ');
    content = content.replace(/\s*\|\s*\|\|\s*/g, ' || ');

    // Fix specific patterns
    content = content.replace(/:\s*([^|]+)\s*\|\s*\|\|\s*undefined/g, ': $1 | undefined');
    content = content.replace(/:\s*([^|]+)\s*\|\|\s*undefined/g, ': $1 | undefined');

    // Fix type annotations with || undefined
    content = content.replace(/:\s*([A-Za-z\[\]]+)\s*\|\|\s*undefined/g, ': $1 | undefined');

    // Fix function return types
    content = content.replace(/\):\s*([A-Za-z\[\]<>]+)\s*\|\|\s*undefined/g, '): $1 | undefined');

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed syntax errors in: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing TypeScript syntax errors...\n');

  let fixedCount = 0;

  for (const file of filesToFix) {
    if (fs.existsSync(file)) {
      if (fixSyntaxErrors(file)) {
        fixedCount++;
      }
    } else {
      console.log(`⚠️  File not found: ${file}`);
    }
  }

  console.log(`\n✨ Fixed syntax errors in ${fixedCount} files`);
  console.log('🎯 Run "npx tsc --noEmit" to check remaining errors');
}

// Run main function if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
