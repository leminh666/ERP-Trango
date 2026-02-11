/**
 * API Regression Guard Script
 * 
 * Purpose: Prevent frontend from calling backend endpoints incorrectly
 * Usage: Run `node tools/check-bad-fetch.mjs` before commit or in CI
 * 
 * Rules enforced:
 * 1. NO fetch('/settings'), fetch('/wallets'), fetch('/transfers'), 
 *    fetch('/adjustments'), fetch('/cashflow') - must use apiClient
 * 2. NO fetch with absolute localhost:3000 URLs for API calls
 * 3. All API calls should use apiClient from '@/lib/api'
 */

import fs from 'fs';
import path from 'path';

const FORBIDDEN_PATTERNS = [
  { pattern: /fetch\s*\(\s*['"](\/settings|\/wallets|\/transfers|\/adjustments|\/cashflow)['"]/g, message: 'Direct fetch to API endpoint - use apiClient instead' },
  { pattern: /fetch\s*\(\s*['"]http:\/\/localhost:3000/g, message: 'Fetching from frontend (3000) - use apiClient for backend (4000)' },
];

const VALID_PATTERNS = [
  /apiClient\s*\(/,
  /from\s+['"]@\/lib\/api['"]/,
];

const IGNORE_DIRS = ['node_modules', '.next', 'dist', 'build'];
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const errors = [];

  for (const { pattern, message } of FORBIDDEN_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        errors.push({ file: filePath, message, match });
      }
    }
  }

  // Check if file uses apiClient (for validation purposes)
  const hasApiClient = VALID_PATTERNS.some(p => p.test(content));
  
  return { errors, hasApiClient };
}

function scanDirectory(dir) {
  const errors = [];
  const filesWithApiClient = new Set();

  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry)) {
          traverse(fullPath);
        }
      } else if (EXTENSIONS.includes(path.extname(entry).toLowerCase())) {
        const { errors: fileErrors, hasApiClient } = scanFile(fullPath);
        if (hasApiClient) {
          filesWithApiClient.add(entry);
        }
        errors.push(...fileErrors);
      }
    }
  }

  traverse(dir);
  return { errors, filesWithApiClient };
}

function main() {
  const webDir = path.join(process.cwd(), 'apps', 'web');
  
  if (!fs.existsSync(webDir)) {
    console.error('Error: apps/web directory not found');
    process.exit(1);
  }

  console.log('🔍 Scanning for bad API call patterns...\n');
  
  const { errors, filesWithApiClient } = scanDirectory(webDir);

  if (errors.length > 0) {
    console.log('❌ ERRORS FOUND:\n');
    for (const { file, message, match } of errors) {
      console.log(`  ${path.relative(webDir, file)}`);
      console.log(`    Pattern: ${match}`);
      console.log(`    Reason: ${message}\n`);
    }
    console.log(`\nTotal: ${errors.length} issues found\n`);
    console.log('💡 FIX: Replace fetch() calls with apiClient() from @/lib/api');
    process.exit(1);
  } else {
    console.log('✅ No bad API call patterns found!\n');
    console.log(`📁 Files using apiClient: ${filesWithApiClient.size}`);
    process.exit(0);
  }
}

main();

