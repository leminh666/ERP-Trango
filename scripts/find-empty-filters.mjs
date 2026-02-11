/**
 * Find Empty Filters Script - Scan for API calls with filters that might cause empty data
 * Run: node scripts/find-empty-filters.mjs
 */

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const REPORT_FILE = 'scripts/find-empty-filters.report.json';

const results = {
  timestamp: new Date().toISOString(),
  files: [],
  endpoints: [],
};

// Patterns to find API calls with filters
const patterns = {
  // fetchJson/fetch calls with query params
  fetchWithParams: /fetchJson\(['"]([^'"]+)[^)]*\)/g,
  fetchRaw: /fetch\(['"]([^'"]+)[^)]*\)/g,
  // Common filter params
  dateParams: /(from=|to=|date=|start=|end=)/g,
  filterParams: /(status=|stage=|type=|includeDeleted=|search=)/g,
};

// List pages to check
const pagesToCheck = [
  'workshop-jobs',
  'transactions',
  'products',
  'income',
  'expense',
  'orders',
  'projects',
];

function scanFile(filePath, content) {
  const lines = content.split('\n');
  const relPath = path.relative(ROOT, filePath);
  const fileIssues = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // Check for fetchJson with params
    const fetchJsonMatches = line.matchAll(/fetchJson\(['"]([^'"]+)[^)]*\)/g);
    for (const match of fetchJsonMatches) {
      const endpoint = match[1];
      
      // Check if this endpoint has query params
      const hasDateParams = patterns.dateParams.test(endpoint);
      const hasFilterParams = patterns.filterParams.test(endpoint);
      
      if (endpoint.includes('/workshop-jobs') || 
          endpoint.includes('/transactions') ||
          endpoint.includes('/products') ||
          endpoint.includes('/income') ||
          endpoint.includes('/expense') ||
          endpoint.includes('/projects') ||
          endpoint.includes('/orders')) {
        
        fileIssues.push({
          type: 'ENDPOINT_WITH_FILTERS',
          file: relPath,
          line: lineNum,
          endpoint,
          hasDateParams,
          hasFilterParams,
          lineCode: line.trim().substring(0, 150),
        });
      }
    }

    // Check for useEffect with fetch that might set filters
    if (line.includes('useEffect')) {
      // Look for the function body
      const funcStart = idx;
      let braceCount = 0;
      let inEffect = false;
      
      for (let i = idx; i < Math.min(idx + 20, lines.length); i++) {
        for (const char of lines[i]) {
          if (char === '{') braceCount++;
          if (char === '}') braceCount--;
        }
        if (braceCount > 0) {
          inEffect = true;
        }
        if (braceCount === 0 && inEffect) {
          const effectContent = lines.slice(idx, i + 1).join('\n');
          
          // Check for hardcoded date filters
          const dateMatch = effectContent.match(/from['"]?\s*:\s*['"](\d{4}-\d{2}-\d{2})['"]?/);
          const toMatch = effectContent.match(/to['"]?\s*:\s*['"](\d{4}-\d{2}-\d{2})['"]?/);
          const yearMatch = effectContent.match(/new Date\(\d{4}/);
          
          if (dateMatch || toMatch || yearMatch) {
            fileIssues.push({
              type: 'DATE_FILTER_DETECTED',
              file: relPath,
              line: lineNum,
              details: dateMatch ? `from: ${dateMatch[1]}` : (toMatch ? `to: ${toMatch[1]}` : 'year hardcoded'),
              suggestion: 'Check if date range matches seed data',
            });
          }
          break;
        }
      }
    }
  });

  return fileIssues;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║           FIND EMPTY FILTERS - Scan API filters                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

  // Find all source files
  const extensions = ['.ts', '.tsx'];
  const allFiles = [];
  
  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (fullPath.includes('node_modules') || 
          fullPath.includes('.next') || 
          fullPath.includes('dist') ||
          fullPath.includes('build')) continue;
      
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (extensions.includes(path.extname(entry.name).toLowerCase())) {
        allFiles.push(fullPath);
      }
    }
  }

  scanDir(path.join(ROOT, 'apps/web/app'));

  console.log(`📁 Found ${allFiles.length} source files to scan\n`);

  // Scan each file
  for (const file of allFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const fileIssues = scanFile(file, content);
      
      if (fileIssues.length > 0) {
        results.files.push({
          file: path.relative(ROOT, file),
          issues: fileIssues,
        });
        results.endpoints.push(...fileIssues);
      }
    } catch (e) {
      // Skip unreadable files
    }
  }

  // Print results
  console.log('═'.repeat(70));
  console.log('📊 SCAN RESULTS');
  console.log('═'.repeat(70));

  console.log(`\n📁 Files scanned: ${allFiles.length}`);
  console.log(`🐛 Total potential issues: ${results.endpoints.length}`);

  // Group by type
  const byType = {};
  for (const issue of results.endpoints) {
    byType[issue.type] = (byType[issue.type] || 0) + 1;
  }

  console.log('\n📋 Issues by type:');
  for (const [type, count] of Object.entries(byType)) {
    const icon = count === 0 ? '✅' : '🔍';
    console.log(`   ${icon} ${type}: ${count}`);
  }

  console.log('\n📋 Files with API calls that might cause empty data:');
  for (const file of results.files) {
    console.log(`\n📄 ${file.file}`);
    for (const issue of file.issues) {
      if (issue.type === 'ENDPOINT_WITH_FILTERS') {
        console.log(`   🔍 Line ${issue.line}: ${issue.endpoint}`);
        if (issue.hasDateParams) console.log('      → Has date filters');
        if (issue.hasFilterParams) console.log('      → Has filter params');
      } else if (issue.type === 'DATE_FILTER_DETECTED') {
        console.log(`   ⚠️  Line ${issue.line}: ${issue.details}`);
      }
    }
  }

  // Write report
  fs.writeFileSync(REPORT_FILE, JSON.stringify(results, null, 2));
  console.log(`\n💾 Report saved: ${REPORT_FILE}`);

  // Summary
  console.log('\n' + '═'.repeat(70));
  
  if (results.endpoints.length === 0) {
    console.log('✅ No problematic filters found!');
  } else {
    console.log('⚠️  FOUND FILES THAT MAY CAUSE EMPTY DATA');
    console.log('\n💡 Recommendations:');
    console.log('   1. Check date ranges - seed data might be outside filter range');
    console.log('   2. Check includeDeleted - might be filtering out seed data');
    console.log('   3. Check status/stage filters - seed might not have matching status');
    console.log('   4. Run smoke-data.mjs to verify actual data counts');
  }
  console.log('═'.repeat(70));
}

main().catch(err => {
  console.error('Scan failed:', err);
  process.exit(2);
});

