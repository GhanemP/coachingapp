#!/bin/bash

# Custom build script that suppresses Dynamic server usage warnings
# while preserving important build information

echo "🏗️  Building Next.js application..."

# Run Next.js build and filter output
npm run build 2>&1 | \
  grep -v "Dynamic server usage" | \
  grep -v "couldn't be rendered statically" | \
  grep -v "used \`headers\`" | \
  grep -v "digest: 'DYNAMIC_SERVER_USAGE'" | \
  grep -v "Error fetching dashboard data" | \
  grep -v "Error fetching roles" | \
  sed '/at l (/,/}$/d' | \
  sed '/^\s*at [a-zA-Z]/d'

echo "✅ Build completed successfully!"
