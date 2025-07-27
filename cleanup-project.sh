#!/bin/bash

# Coaching App Cleanup Script
# This script removes unnecessary files and optimizes the project for production

echo "🧹 Starting Coaching App Cleanup..."
echo "=================================="

# Create backup of important files before cleanup
echo "📦 Creating backup of essential files..."
mkdir -p backup
cp .env* backup/ 2>/dev/null || true
cp README.md backup/ 2>/dev/null || true

# Remove all documentation files
echo "📄 Removing documentation files..."
rm -f AUDIT_SUMMARY.md
rm -f BUILD_FIX_SUMMARY.md
rm -f BUILD_NOTES.md
rm -f CALCULATION_FIXES_SUMMARY.md
rm -f COACH_APP_V2_ANALYSIS.md
rm -f COACH_APP_V2_COMPREHENSIVE_AUDIT.md
rm -f COMPREHENSIVE_PROJECT_AUDIT.md
rm -f DOCKER_DEPLOYMENT.md
rm -f EXECUTIVE_SUMMARY.md
rm -f FINAL_INFINITE_RERENDER_FIX.md
rm -f IMPLEMENTATION_GUIDE.md
rm -f INFINITE_RERENDER_DIAGNOSIS.md
rm -f MIGRATION_STRATEGY.md
rm -f POSTGRESQL_MIGRATION_GUIDE.md
rm -f PROFILE_IMPLEMENTATION_COMPLETE.md
rm -f PROJECT_STATUS_SUMMARY.md
rm -f TEST_USERS.md
rm -rf "Coach app v2"

# Remove debug and development files
echo "🐛 Removing debug files..."
rm -f debug-env.js
rm -f tsconfig.tsbuildinfo
rm -rf logs

# Remove test files
echo "🧪 Removing test files..."
rm -rf src/__tests__
rm -f src/test-*.ts
rm -f jest.config.js
rm -f jest.setup.js

# Remove Docker files if not using Docker
echo "🐳 Removing Docker files (uncomment if needed)..."
# rm -f Dockerfile
# rm -f .dockerignore
# rm -f docker-compose.yml

# Clean build artifacts
echo "🗑️  Cleaning build artifacts..."
rm -rf .next
rm -rf out
rm -rf build
rm -rf dist

# Remove unused scripts
echo "📜 Cleaning up scripts directory..."
# Keep only essential scripts
find scripts -type f -name "*.js" -o -name "*.ts" | grep -v "migrate-to-postgres" | xargs rm -f 2>/dev/null || true

# Create optimized .gitignore
echo "📝 Creating optimized .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.*

# Testing
coverage/

# Next.js
.next/
out/

# Production
build/
dist/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# Local env files
.env*.local
.env

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Logs
logs/
*.log

# Editor
.vscode/
.idea/

# OS
Thumbs.db

# Uploads
public/uploads/avatars/*
!public/uploads/avatars/.gitkeep
EOF

# Create minimal README
echo "📖 Creating minimal README..."
cat > README.md << 'EOF'
# Coaching App

A performance management and coaching application built with Next.js.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

3. Set up database:
   ```bash
   npx prisma db push
   npm run seed
   ```

4. Run development server:
   ```bash
   npm run dev
   ```

## Production Build

```bash
npm run build
npm start
```

## Environment Variables

See `.env.example` for required environment variables.
EOF

# Create production-ready package.json
echo "📦 Optimizing package.json..."
cat > package.json.tmp << 'EOF'
{
  "name": "coaching-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "node server.js",
    "build": "next build",
    "start": "NODE_ENV=production node server.js",
    "lint": "next lint",
    "seed": "tsx prisma/seed.ts",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate deploy"
  },
  "dependencies": {
    "@auth/prisma-adapter": "^2.10.0",
    "@hookform/resolvers": "^5.1.1",
    "@prisma/client": "^6.12.0",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-tabs": "^1.1.12",
    "@radix-ui/react-toast": "^1.2.14",
    "bcryptjs": "^3.0.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "exceljs": "^4.4.0",
    "ioredis": "^5.6.1",
    "lucide-react": "^0.525.0",
    "next": "^15.4.3",
    "next-auth": "^4.24.7",
    "openai": "^5.10.2",
    "prisma": "^6.12.0",
    "rate-limiter-flexible": "^7.1.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.60.0",
    "react-hot-toast": "^2.5.2",
    "recharts": "^3.1.0",
    "socket.io": "^4.8.1",
    "socket.io-client": "^4.8.1",
    "tailwind-merge": "^3.3.1",
    "winston": "^3.17.0",
    "zod": "3.25.76"
  },
  "devDependencies": {
    "@types/node": "^24.1.0",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "autoprefixer": "^10.4.21",
    "eslint": "^9",
    "eslint-config-next": "15.4.2",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "tsx": "^4.20.3",
    "typescript": "^5"
  }
}
EOF

# Check if we should update package.json
echo "⚠️  Review package.json.tmp and rename to package.json if correct"

# Create .gitkeep files for empty directories
echo "📁 Ensuring directory structure..."
mkdir -p public/uploads/avatars
touch public/uploads/avatars/.gitkeep

# Summary
echo ""
echo "✅ Cleanup Complete!"
echo "==================="
echo ""
echo "Files removed:"
echo "- All documentation files (.md)"
echo "- Test files and directories"
echo "- Debug and log files"
echo "- Build artifacts"
echo ""
echo "Next steps:"
echo "1. Review package.json.tmp and rename to package.json if correct"
echo "2. Run 'npm ci' to reinstall dependencies"
echo "3. Run 'npm run build' to create production build"
echo "4. Test the application thoroughly"
echo ""
echo "💡 Tip: Your backup files are in the 'backup' directory"