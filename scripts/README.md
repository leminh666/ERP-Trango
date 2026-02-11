# Scan Endpoints Script

## Purpose

Scans the entire repository for API calls and identifies potential issues such as:
- Double `/api/api/` prefixes (causes 404)
- Hardcoded localhost URLs (breaks in production)
- Missing `/api/` prefix in API calls
- Page routes called as API endpoints
- Suspicious string concatenations

## Usage

```bash
# Normal scan (console output + reports)
npm run scan:endpoints

# JSON output only
npm run scan:endpoints -- --json

# Auto-fix certain patterns (basic)
npm run scan:endpoints -- --fix
```

## Output

Reports are saved to `.cursor-reports/`:
- `endpoints-report.json` - Machine-readable JSON report
- `endpoints-report.md` - Human-readable Markdown report

## Severity Levels

| Level | Icon | Meaning |
|-------|------|---------|
| HIGH | 🔴 | Critical issues (double prefix, localhost) |
| MEDIUM | 🟡 | Likely issues (page routes, suspicious concat) |
| LOW | 🟢 | Possible issues (missing API prefix) |
| INFO | 🔵 | Informational |

## Exit Codes

- `0`: Scan passed (no HIGH severity issues)
- `1`: Scan failed (HIGH severity issues found)

## Configuration

Edit `scripts/scan-endpoints.ts` to customize:
- `CONFIG.scanDirs` - Directories to scan
- `CONFIG.excludeDirs` - Directories to skip
- `CONFIG.pathWhitelist` - URL patterns that don't need `/api/`
- `CONFIG.pageRoutePrefixes` - Page routes that should use `/api/`

## Examples

### Double API Prefix
```typescript
// ❌ WRONG
fetch('/api/api/customers')

// ✅ CORRECT
fetch('/api/customers')
```

### Page Route Called as API
```typescript
// ❌ WRONG - This is a page route, not an API
fetch('/customers/123')

// ✅ CORRECT
fetch('/api/customers/123')
```

### Hardcoded Localhost
```typescript
// ❌ WRONG
fetch('http://localhost:3000/api/wallets')

// ✅ CORRECT - Use relative paths
fetch('/api/wallets')
```

## Recommendations

1. **Use the API client**: Always use `fetchJson()` from `lib/api.ts` for API calls
2. **Relative paths**: Use paths starting with `/api/` instead of absolute URLs
3. **No double prefixes**: Ensure you don't accidentally concatenate `/api/` twice
4. **Check the report**: Run `npm run scan:endpoints` before deploying

