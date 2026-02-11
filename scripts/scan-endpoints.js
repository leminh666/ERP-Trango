#!/usr/bin/env node

/**
 * Scan Endpoints Script
 * 
 * Scans the entire repository for API calls and identifies potential issues:
 * - Double /api/api/ prefixes
 * - Hardcoded localhost URLs
 * - Missing /api/ prefix in API calls
 * - Page routes called as API endpoints
 * - Suspicious string concatenations
 * 
 * Usage: 
 *   node scripts/scan-endpoints.js        # Normal scan
 *   node scripts/scan-endpoints.js --json # JSON output only
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Directories to scan
  scanDirs: ['apps', 'src', 'lib', 'components', 'scripts'],
  
  // File extensions to scan
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs'],
  
  // Directories to exclude
  excludeDirs: [
    'node_modules',
    '.next',
    'dist',
    'build',
    '.git',
    'coverage',
    '*.egg-info',
    '__pycache__',
    '.turbo',
    '.cursor-cache',
  ],
  
  // Whitelist patterns - paths that don't need /api/ prefix
  pathWhitelist: [
    '/_next/',
    '/images/',
    '/favicon',
    '/robots.txt',
    '/sitemap',
    '/fonts/',
    '/login',
    '/register',
    '/auth/',
    '/socket.io',
  ],
  
  // Page route prefixes that should NOT be called as API endpoints
  pageRoutePrefixes: [
    '/customers',
    '/suppliers',
    '/workshops',
    '/orders',
    '/cashbook',
    '/catalog',
    '/inventory',
    '/employees',
    '/reports',
    '/dashboard',
    '/settings',
    '/users',
    '/roles',
    '/permissions',
    '/wallets',
    '/categories',
    '/projects',
    '/transactions',
    '/reminders',
    '/jobs',
  ],
};

// ============================================================================
// Types
// ============================================================================

/**
 * @typedef {Object} Finding
 * @property {string} file
 * @property {number} line
 * @property {number} column
 * @property {string} code
 * @property {string} url
 * @property {'HIGH'|'MEDIUM'|'LOW'|'INFO'} type
 * @property {string} reason
 * @property {string} [fixSuggestion]
 */

// ============================================================================
// Helper Functions
// ============================================================================

function isWhitelisted(url) {
  return CONFIG.pathWhitelist.some(pattern => {
    if (typeof pattern === 'string') {
      return url.startsWith(pattern);
    }
    return pattern.test(url);
  });
}

function shouldSkipFile(filePath) {
  const ext = path.extname(filePath);
  
  // Check extension
  if (!CONFIG.extensions.includes(ext)) {
    return true;
  }
  
  // Check excluded directories
  const normalizedPath = filePath.split(/[/\\]/).join('/');
  return CONFIG.excludeDirs.some(dir => normalizedPath.includes(`/${dir}/`));
}

function extractQuotedStrings(content) {
  const results = [];
  const lines = content.split('\n');
  
  // Match patterns
  const patterns = [
    // fetch("...") or fetch(`...`)
    /fetch\s*\(\s*["'`]([^"'`]+)["'`]/g,
    // axios.method("url", ...)
    /axios\.(get|post|put|patch|delete|head|options)\s*\(\s*["'`]([^"'`]+)["'`]/gi,
    // axios({ url: "..." })
    /axios\s*\(\s*\{[^}]*url\s*:\s*["'`]([^"'`]+)["'`]/gi,
    // api client calls
    /(?:api|fetchJson|apiFetch)\s*\.\s*(?:get|post|put|patch|delete|request)\s*\(\s*["'`]([^"'`]+)["'`]/gi,
  ];
  
  lines.forEach((line, lineIndex) => {
    patterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.source, pattern.flags);
      while ((match = regex.exec(line)) !== null) {
        const fullMatch = match[0];
        const captured = match[1] || match[2] || match[3];
        
        if (captured && !captured.startsWith('http')) {
          results.push({
            line: lineIndex + 1,
            col: line.indexOf(fullMatch) + (fullMatch.length - captured.length),
            value: captured.trim(),
          });
        }
      }
    });
  });
  
  return results;
}

function isPageRoute(pathname) {
  return CONFIG.pageRoutePrefixes.some(prefix => pathname.startsWith(prefix));
}

/**
 * @param {string} filePath
 * @param {number} line
 * @param {string} url
 * @param {string} context
 * @returns {Finding|null}
 */
function analyzeUrl(filePath, line, url, context) {
  let reason = '';
  let type = 'INFO';
  let fixSuggestion;
  
  // Skip whitelisted paths
  if (isWhitelisted(url)) {
    return null;
  }
  
  // Check for double /api/api/
  if (/^\/api\/api\//i.test(url)) {
    reason = 'DOUBLE_API_PREFIX: Path contains /api/api/ which will cause 404';
    type = 'HIGH';
    fixSuggestion = url.replace(/\/api\/api\//i, '/api/');
  }
  // Check for hardcoded localhost
  else if (/https?:\/\/(localhost|127\.0\.0\.1)[:/]/i.test(url)) {
    reason = 'HARDCODE_LOCALHOST: URL contains localhost which will break in production';
    type = 'HIGH';
    fixSuggestion = url.replace(/https?:\/\/(localhost|127\.0\.0\.1)[:/]\w*/gi, '');
  }
  // Check for missing /api/ prefix
  else if (url.startsWith('/') && !url.startsWith('/api/') && !url.startsWith('/_next/')) {
    if (isPageRoute(url)) {
      reason = 'PAGE_ROUTE_CALLED_AS_API: This looks like a page route, not an API endpoint. Should start with /api/';
      type = 'HIGH';
      fixSuggestion = `/api${url}`;
    } else if (/^[a-z][a-z0-9-]*$/i.test(url.split('/')[1])) {
      reason = 'POSSIBLE_MISSING_API_PREFIX: Path should likely start with /api/';
      type = 'MEDIUM';
    } else {
      reason = 'SUSPICIOUS_PATH: Path may need /api/ prefix';
      type = 'LOW';
    }
  }
  // Check for suspicious string concatenation
  else if (/\/api\/api\//i.test(url) || (url.includes('${') && /apiUrl|baseUrl|API_URL/i.test(context))) {
    reason = 'SUSPICIOUS_STRING_CONCAT: Path may have been concatenated incorrectly';
    type = 'MEDIUM';
  }
  // Check for relative paths
  else if (/^\.\.?\/[a-z]/i.test(url)) {
    reason = 'RELATIVE_PATH_IN_FETCH: This relative path might not point to the correct API';
    type = 'MEDIUM';
  }
  
  if (!reason) {
    return null;
  }
  
  return {
    file: filePath,
    line,
    column: 0,
    code: context.trim().substring(0, 100),
    url,
    type,
    reason,
    fixSuggestion,
  };
}

function scanFile(filePath) {
  const findings = [];
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const quotes = extractQuotedStrings(content);
    const lines = content.split('\n');
    
    quotes.forEach(({ line, col, value }) => {
      const context = lines[line - 1] || '';
      const finding = analyzeUrl(filePath, line, value, context);
      if (finding) {
        finding.column = col;
        findings.push(finding);
      }
    });
  } catch (error) {
    // Skip files that can't be read
  }
  
  return findings;
}

/**
 * Recursively find all files matching extensions
 */
function findAllFiles(dir, extensions, excludeDirs, results = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!excludeDirs.includes(item)) {
        findAllFiles(fullPath, extensions, excludeDirs, results);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      if (extensions.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  
  return results;
}

function generateReport(findings) {
  const findingsByType = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFO: 0,
  };
  
  findings.forEach(f => {
    findingsByType[f.type]++;
  });
  
  const fileCounts = {};
  findings.forEach(f => {
    fileCounts[f.file] = (fileCounts[f.file] || 0) + 1;
  });
  
  const topOffenders = Object.entries(fileCounts)
    .map(([file, count]) => ({ file, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
  
  return {
    timestamp: new Date().toISOString(),
    totalFilesScanned: 0,
    totalFindings: findings.length,
    findingsByType,
    findings,
    topOffenders,
  };
}

function printFindings(findings) {
  if (findings.length === 0) {
    console.log('\n✅ No API issues found!\n');
    return;
  }
  
  // Sort by severity and file
  const sorted = [...findings].sort((a, b) => {
    const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, INFO: 3 };
    if (severityOrder[a.type] !== severityOrder[b.type]) {
      return severityOrder[a.type] - severityOrder[b.type];
    }
    return a.file.localeCompare(b.file);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('🔍 API ENDPOINT SCAN RESULTS');
  console.log('='.repeat(80));
  
  // Summary by type
  const byType = sorted.reduce((acc, f) => {
    acc[f.type] = (acc[f.type] || 0) + 1;
    return acc;
  }, {});
  
  console.log('\n📊 Summary by Severity:');
  console.log(`   🔴 HIGH: ${byType['HIGH'] || 0}`);
  console.log(`   🟡 MEDIUM: ${byType['MEDIUM'] || 0}`);
  console.log(`   🟢 LOW: ${byType['LOW'] || 0}`);
  console.log(`   🔵 INFO: ${byType['INFO'] || 0}`);
  
  console.log('\n' + '-'.repeat(80));
  console.log('📋 Findings:');
  console.log('-'.repeat(80));
  
  let currentFile = '';
  sorted.forEach(f => {
    if (f.file !== currentFile) {
      currentFile = f.file;
      console.log(`\n📁 ${f.file}`);
    }
    
    const severityIcon = f.type === 'HIGH' ? '🔴' : f.type === 'MEDIUM' ? '🟡' : f.type === 'LOW' ? '🟢' : '🔵';
    console.log(`   ${severityIcon} [${f.type}] Line ${f.line}: ${f.reason}`);
    console.log(`      URL: ${f.url}`);
    console.log(`      Code: ${f.code.substring(0, 60)}...`);
    if (f.fixSuggestion) {
      console.log(`      💡 Fix: ${f.fixSuggestion}`);
    }
  });
  
  console.log('\n' + '-'.repeat(80));
  
  const report = generateReport(findings);
  if (report.topOffenders.length > 0) {
    console.log('\n🏆 Top Offenders (files with most issues):');
    report.topOffenders.slice(0, 10).forEach(({ file, count }, i) => {
      console.log(`   ${i + 1}. ${file} (${count} issues)`);
    });
  }
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const args = process.argv.slice(2);
  const mode = args.includes('--json') ? 'json' : 'normal';
  
  console.log('\n🚀 Starting API Endpoint Scan...\n');
  
  // Find all files to scan
  const allFiles = [];
  for (const dir of CONFIG.scanDirs) {
    if (fs.existsSync(dir)) {
      const files = findAllFiles(dir, CONFIG.extensions, CONFIG.excludeDirs);
      allFiles.push(...files);
    }
  }
  
  console.log(`📁 Found ${allFiles.length} files to scan`);
  
  // Scan each file
  const allFindings = [];
  for (const file of allFiles) {
    if (!shouldSkipFile(file)) {
      const findings = scanFile(file);
      allFindings.push(...findings);
    }
  }
  
  // Generate report
  const report = generateReport(allFindings);
  report.totalFilesScanned = allFiles.length;
  
  // Output based on mode
  if (mode === 'json') {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printFindings(allFindings);
  }
  
  // Save report files
  const reportsDir = '.cursor-reports';
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // JSON report
  fs.writeFileSync(
    path.join(reportsDir, 'endpoints-report.json'),
    JSON.stringify(report, null, 2)
  );
  
  // Markdown report
  let md = `# API Endpoint Scan Report\n`;
  md += `Generated: ${report.timestamp}\n\n`;
  md += `## Summary\n`;
  md += `- Files Scanned: ${report.totalFilesScanned}\n`;
  md += `- Total Findings: ${report.totalFindings}\n`;
  md += `- HIGH: ${report.findingsByType['HIGH'] || 0}\n`;
  md += `- MEDIUM: ${report.findingsByType['MEDIUM'] || 0}\n`;
  md += `- LOW: ${report.findingsByType['LOW'] || 0}\n\n`;
  
  if (report.topOffenders.length > 0) {
    md += `## Top Offenders\n\n`;
    report.topOffenders.forEach(({ file, count }) => {
      md += `- \`${file}\`: ${count} issues\n`;
    });
    md += '\n';
  }
  
  md += `## Detailed Findings\n\n`;
  const sorted = [...report.findings].sort((a, b) => a.file.localeCompare(b.file));
  sorted.forEach(f => {
    md += `### ${f.file}:${f.line}\n`;
    md += `- **Type**: ${f.type}\n`;
    md += `- **Reason**: ${f.reason}\n`;
    md += `- **URL**: \`${f.url}\`\n`;
    md += `- **Code**: \`${f.code.substring(0, 80)}\`\n`;
    if (f.fixSuggestion) {
      md += `- **Suggestion**: \`${f.fixSuggestion}\`\n`;
    }
    md += '\n';
  });
  
  fs.writeFileSync(
    path.join(reportsDir, 'endpoints-report.md'),
    md
  );
  
  console.log(`\n📄 Reports saved to ${reportsDir}/`);
  console.log(`   - endpoints-report.json`);
  console.log(`   - endpoints-report.md`);
  
  // Exit code based on severity
  const highCount = report.findingsByType['HIGH'] || 0;
  if (highCount > 0) {
    console.log(`\n❌ Exiting with code 1 (${highCount} HIGH severity issues found)`);
    process.exit(1);
  } else {
    console.log(`\n✅ Scan complete (no critical issues)`);
    process.exit(0);
  }
}

// Run
main();

