#!/usr/bin/env node
/**
 * Scan Backend Endpoints Script
 * Scans all NestJS controllers to generate a list of API endpoints
 * 
 * Usage: node tools/scan-endpoints.mjs
 */

import { readFileSync, existsSync, readdirSync, writeFileSync, statSync } from 'fs';
import { join, relative } from 'path';

const apiDir = './apps/api/src';
const outputFile = './docs/ENDPOINTS_BACKEND.md';

function extractEndpoints(content) {
  const endpoints = [];
  
  // Match @Get, @Post, @Put, @Patch, @Delete decorators
  const decoratorRegex = /@(@)?(Get|Post|Put|Patch|Delete)\(['"]([^'"]+)['"]\)/g;
  const controllerPrefixRegex = /@Controller\(['"]([^'"]+)['"]\)/;
  
  // Find controller prefix
  const controllerMatch = content.match(controllerPrefixRegex);
  const controllerPrefix = controllerMatch ? controllerMatch[1] : '';
  
  let match;
  while ((match = decoratorRegex.exec(content)) !== null) {
    const [, , method, path] = match;
    const fullPath = controllerPrefix + path;
    
    endpoints.push({
      method: method.toUpperCase(),
      path: fullPath,
    });
  }
  
  return endpoints;
}

function scanDirectory(dir) {
  const endpoints = [];
  
  if (!existsSync(dir)) {
    return endpoints;
  }
  
  const files = readdirSync(dir);
  
  for (const file of files) {
    const fullPath = join(dir, file);
    
    if (file.endsWith('.controller.ts')) {
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const controllerEndpoints = extractEndpoints(content);
        const relativePath = relative(apiDir, fullPath).replace(/\\/g, '/');
        controllerEndpoints.forEach(ep => {
          ep.controller = relativePath;
        });
        endpoints.push(...controllerEndpoints);
      } catch (error) {
        console.error(`⚠️ Error reading ${fullPath}:`, error.message);
      }
    }
    
    if (statSync(fullPath).isDirectory()) {
      endpoints.push(...scanDirectory(fullPath));
    }
  }
  
  return endpoints;
}

// Main execution
console.log('🔍 Scanning API endpoints...');
console.log(`📂 Scanning directory: ${apiDir}\n`);

const allEndpoints = scanDirectory(apiDir);

// Sort by path
allEndpoints.sort((a, b) => a.path.localeCompare(b.path));

// Print summary
console.log(`✅ Found ${allEndpoints.length} endpoints:\n`);

const byMethod = {};
allEndpoints.forEach(ep => {
  if (!byMethod[ep.method]) byMethod[ep.method] = [];
  byMethod[ep.method].push(ep);
});

for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
  if (byMethod[method]) {
    console.log(`\n${method} (${byMethod[method].length}):`);
    byMethod[method].forEach(ep => {
      console.log(`  ${method.padEnd(6)} ${ep.path.padEnd(40)} // ${ep.controller}`);
    });
  }
}

// Generate Markdown report
let md = `# Backend API Endpoints\n\n`;
md += `Generated: ${new Date().toISOString()}\n\n`;
md += `| Method | Path | Controller |\n`;
md += `|--------|------|------------|\n`;

allEndpoints.forEach(ep => {
  md += `| ${ep.method} | ${ep.path} | ${ep.controller} |\n`;
});

md += `\n## Summary\n\n`;
md += `| Method | Count |\n`;
md += `|--------|-------|\n`;
for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
  if (byMethod[method]) {
    md += `| ${method} | ${byMethod[method].length} |\n`;
  }
}

// Ensure docs directory exists
const docsDir = './docs';
if (!existsSync(docsDir)) {
  mkdirSync(docsDir, { recursive: true });
}

writeFileSync(outputFile, md);
console.log(`\n💾 Endpoints saved to: ${outputFile}`);
