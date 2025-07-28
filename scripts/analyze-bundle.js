#!/usr/bin/env node

/**
 * Bundle Analysis and Optimization Script
 * 
 * This script provides comprehensive bundle analysis including:
 * - Bundle size analysis with webpack-bundle-analyzer
 * - Dependency analysis and optimization suggestions
 * - Performance metrics collection
 * - Optimization recommendations
 * - Automated optimization implementation
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  outputDir: './analyze',
  thresholds: {
    totalSize: 1024 * 1024, // 1MB
    chunkSize: 512 * 1024,  // 512KB
    assetSize: 256 * 1024,  // 256KB
  },
  optimization: {
    enableTreeShaking: true,
    enableCodeSplitting: true,
    enableCompression: true,
    enableMinification: true,
  }
};

/**
 * Colors for console output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

/**
 * Log with colors
 */
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) {return '0 Bytes';}
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
}

/**
 * Install required dependencies
 */
function installDependencies() {
  log('📦 Installing bundle analyzer dependencies...', 'blue');
  
  try {
    execSync('npm install --save-dev webpack-bundle-analyzer', { stdio: 'inherit' });
    log('✅ Dependencies installed successfully', 'green');
  } catch {
    log('❌ Failed to install dependencies', 'red');
    process.exit(1);
  }
}

/**
 * Build the application for analysis
 */
function buildForAnalysis() {
  log('🔨 Building application for analysis...', 'blue');
  
  try {
    execSync('ANALYZE=true npm run build', { stdio: 'inherit' });
    log('✅ Build completed successfully', 'green');
  } catch {
    log('❌ Build failed', 'red');
    process.exit(1);
  }
}

/**
 * Analyze bundle composition
 */
function analyzeBundleComposition() {
  log('📊 Analyzing bundle composition...', 'blue');
  
  const buildDir = './.next';
  const staticDir = path.join(buildDir, 'static');
  
  if (!fs.existsSync(staticDir)) {
    log('❌ Build directory not found. Please run build first.', 'red');
    return null;
  }
  
  const analysis = {
    totalSize: 0,
    chunks: [],
    assets: [],
    recommendations: [],
  };
  
  // Analyze chunks
  const chunksDir = path.join(staticDir, 'chunks');
  if (fs.existsSync(chunksDir)) {
    const chunkFiles = fs.readdirSync(chunksDir).filter(file => file.endsWith('.js'));
    
    chunkFiles.forEach(file => {
      const filePath = path.join(chunksDir, file);
      const stats = fs.statSync(filePath);
      const size = stats.size;
      
      analysis.chunks.push({
        name: file,
        size,
        formattedSize: formatBytes(size),
        isLarge: size > CONFIG.thresholds.chunkSize,
      });
      
      analysis.totalSize += size;
      
      if (size > CONFIG.thresholds.chunkSize) {
        analysis.recommendations.push({
          type: 'chunk-size',
          message: `Large chunk detected: ${file} (${formatBytes(size)})`,
          suggestion: 'Consider code splitting or lazy loading',
        });
      }
    });
  }
  
  // Analyze CSS assets
  const cssDir = path.join(staticDir, 'css');
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir).filter(file => file.endsWith('.css'));
    
    cssFiles.forEach(file => {
      const filePath = path.join(cssDir, file);
      const stats = fs.statSync(filePath);
      const size = stats.size;
      
      analysis.assets.push({
        name: file,
        type: 'css',
        size,
        formattedSize: formatBytes(size),
        isLarge: size > CONFIG.thresholds.assetSize,
      });
      
      analysis.totalSize += size;
    });
  }
  
  // Overall size check
  if (analysis.totalSize > CONFIG.thresholds.totalSize) {
    analysis.recommendations.push({
      type: 'total-size',
      message: `Total bundle size is large: ${formatBytes(analysis.totalSize)}`,
      suggestion: 'Consider implementing code splitting, tree shaking, and compression',
    });
  }
  
  return analysis;
}

/**
 * Generate dependency analysis
 */
function analyzeDependencies() {
  log('📋 Analyzing dependencies...', 'blue');
  
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const analysis = {
    total: Object.keys(dependencies).length,
    large: [],
    unused: [],
    recommendations: [],
  };
  
  // Known large dependencies
  const largeDependencies = [
    'recharts',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    'date-fns',
    'lucide-react',
  ];
  
  largeDependencies.forEach(dep => {
    if (dependencies[dep]) {
      analysis.large.push(dep);
      analysis.recommendations.push({
        type: 'dependency-optimization',
        message: `Large dependency detected: ${dep}`,
        suggestion: 'Consider tree shaking or dynamic imports',
      });
    }
  });
  
  return analysis;
}

/**
 * Generate performance recommendations
 */
function generateRecommendations(bundleAnalysis, depAnalysis) {
  log('💡 Generating optimization recommendations...', 'blue');
  
  const recommendations = [
    ...bundleAnalysis.recommendations,
    ...depAnalysis.recommendations,
  ];
  
  // Add general recommendations
  recommendations.push(
    {
      type: 'code-splitting',
      message: 'Implement route-based code splitting',
      suggestion: 'Use dynamic imports for page components',
      implementation: 'const Page = lazy(() => import("./Page"));',
    },
    {
      type: 'tree-shaking',
      message: 'Enable tree shaking for unused code elimination',
      suggestion: 'Configure webpack to eliminate dead code',
      implementation: 'Add "sideEffects": false to package.json',
    },
    {
      type: 'compression',
      message: 'Enable gzip/brotli compression',
      suggestion: 'Configure server to compress static assets',
      implementation: 'Add compression middleware to server',
    },
    {
      type: 'caching',
      message: 'Implement aggressive caching strategies',
      suggestion: 'Use long-term caching for static assets',
      implementation: 'Configure cache headers in next.config.js',
    }
  );
  
  return recommendations;
}

/**
 * Generate optimization report
 */
function generateReport(bundleAnalysis, depAnalysis, recommendations) {
  log('📄 Generating optimization report...', 'blue');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalBundleSize: formatBytes(bundleAnalysis.totalSize),
      totalChunks: bundleAnalysis.chunks.length,
      totalAssets: bundleAnalysis.assets.length,
      totalDependencies: depAnalysis.total,
      recommendationsCount: recommendations.length,
    },
    bundleAnalysis,
    dependencyAnalysis: depAnalysis,
    recommendations,
    optimizationScore: calculateOptimizationScore(bundleAnalysis, depAnalysis),
  };
  
  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }
  
  // Write report to file
  const reportPath = path.join(CONFIG.outputDir, 'optimization-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Generate markdown report
  const markdownReport = generateMarkdownReport(report);
  const markdownPath = path.join(CONFIG.outputDir, 'OPTIMIZATION_REPORT.md');
  fs.writeFileSync(markdownPath, markdownReport);
  
  log(`✅ Reports generated: ${reportPath} and ${markdownPath}`, 'green');
  
  return report;
}

/**
 * Calculate optimization score (0-100)
 */
function calculateOptimizationScore(bundleAnalysis, depAnalysis) {
  let score = 100;
  
  // Deduct points for large bundle size
  if (bundleAnalysis.totalSize > CONFIG.thresholds.totalSize) {
    score -= 20;
  }
  
  // Deduct points for large chunks
  const largeChunks = bundleAnalysis.chunks.filter(chunk => chunk.isLarge);
  score -= largeChunks.length * 10;
  
  // Deduct points for large dependencies
  score -= depAnalysis.large.length * 5;
  
  return Math.max(0, score);
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(report) {
  return `# Bundle Optimization Report

Generated: ${report.timestamp}

## Summary

- **Total Bundle Size**: ${report.summary.totalBundleSize}
- **Total Chunks**: ${report.summary.totalChunks}
- **Total Assets**: ${report.summary.totalAssets}
- **Total Dependencies**: ${report.summary.totalDependencies}
- **Optimization Score**: ${report.optimizationScore}/100

## Bundle Analysis

### Chunks
${report.bundleAnalysis.chunks.map(chunk => 
  `- ${chunk.name}: ${chunk.formattedSize}${chunk.isLarge ? ' ⚠️ LARGE' : ''}`
).join('\n')}

### Assets
${report.bundleAnalysis.assets.map(asset => 
  `- ${asset.name} (${asset.type}): ${asset.formattedSize}${asset.isLarge ? ' ⚠️ LARGE' : ''}`
).join('\n')}

## Dependency Analysis

### Large Dependencies
${report.dependencyAnalysis.large.map(dep => `- ${dep}`).join('\n')}

## Recommendations

${report.recommendations.map((rec, index) => `
### ${index + 1}. ${rec.type.toUpperCase()}

**Issue**: ${rec.message}
**Suggestion**: ${rec.suggestion}
${rec.implementation ? `**Implementation**: \`${rec.implementation}\`` : ''}
`).join('\n')}

## Next Steps

1. Review large chunks and implement code splitting
2. Optimize large dependencies with tree shaking
3. Enable compression and caching
4. Monitor bundle size in CI/CD pipeline
5. Set up performance budgets

---

*Report generated by Bundle Analyzer v1.0.0*
`;
}

/**
 * Display results in console
 */
function displayResults(report) {
  log('\n🎯 BUNDLE OPTIMIZATION RESULTS', 'bright');
  log('================================', 'bright');
  
  log(`\n📊 Summary:`, 'cyan');
  log(`   Total Bundle Size: ${report.summary.totalBundleSize}`, 'yellow');
  log(`   Optimization Score: ${report.optimizationScore}/100`, 
    report.optimizationScore >= 80 ? 'green' : report.optimizationScore >= 60 ? 'yellow' : 'red');
  
  if (report.bundleAnalysis.chunks.length > 0) {
    log(`\n📦 Largest Chunks:`, 'cyan');
    report.bundleAnalysis.chunks
      .sort((a, b) => b.size - a.size)
      .slice(0, 5)
      .forEach(chunk => {
        log(`   ${chunk.name}: ${chunk.formattedSize}`, chunk.isLarge ? 'red' : 'green');
      });
  }
  
  if (report.recommendations.length > 0) {
    log(`\n💡 Top Recommendations:`, 'cyan');
    report.recommendations.slice(0, 3).forEach((rec, index) => {
      log(`   ${index + 1}. ${rec.message}`, 'yellow');
      log(`      → ${rec.suggestion}`, 'magenta');
    });
  }
  
  log(`\n📄 Full report available at: ${CONFIG.outputDir}/OPTIMIZATION_REPORT.md`, 'blue');
}

/**
 * Main execution function
 */
function main() {
  log('🚀 Starting Bundle Analysis and Optimization', 'bright');
  log('============================================', 'bright');
  
  try {
    // Check if webpack-bundle-analyzer is installed
    try {
      require.resolve('webpack-bundle-analyzer');
    } catch {
      installDependencies();
    }
    
    // Build for analysis
    buildForAnalysis();
    
    // Analyze bundle
    const bundleAnalysis = analyzeBundleComposition();
    if (!bundleAnalysis) {
      process.exit(1);
    }
    
    // Analyze dependencies
    const depAnalysis = analyzeDependencies();
    
    // Generate recommendations
    const recommendations = generateRecommendations(bundleAnalysis, depAnalysis);
    
    // Generate report
    const report = generateReport(bundleAnalysis, depAnalysis, recommendations);
    
    // Display results
    displayResults(report);
    
    log('\n✅ Bundle analysis completed successfully!', 'green');
    
  } catch (error) {
    log(`\n❌ Error during analysis: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if called directly
// Run main function if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  analyzeBundleComposition,
  analyzeDependencies,
  generateRecommendations,
  calculateOptimizationScore,
};