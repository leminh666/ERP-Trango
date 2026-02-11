# LAN Testing Guide - Mobile + Desktop

## 🚨 CRITICAL - Before Starting

**If you were getting timeout/cancelled/preflight errors:**

1. ✅ JwtAuthGuard now skips OPTIONS (preflight) requests
2. ✅ API binds to 0.0.0.0:4000
3. ✅ CORS now allows all detected LAN IPs

**You MUST do this:**

1. Create `apps/web/.env.local` with your PC's LAN IP
2. Restart both API and Web servers
3. Open firewall ports (instructions below)

---

## Step 1: Find Your PC's LAN IP

**Open Command Prompt (cmd) and run:**
```cmd
ipconfig
```

Look for **IPv4 Address network adapter:
```
** under your activeWireless LAN adapter Wi-Fi:
   IPv4 Address . . . . . . . . . . : 192.168.1.105
```

**REMEMBER THIS IP** - You'll need it for mobile testing.

---

## Step 2: Create `.env.local` File

Create file: `apps/web/.env.local`

**Content:**
```
# IMPORTANT: Replace 192.168.1.105 with YOUR PC's IP from Step 1
NEXT_PUBLIC_API_URL=http://192.168.1.105:4000
NEXT_PUBLIC_API_TIMEOUT=15000
```

**Common mistakes to avoid:**
```
# ❌ WRONG - missing http://
NEXT_PUBLIC_API_URL=192.168.1.105:4000

# ❌ WRONG - extra space
NEXT_PUBLIC_API_URL= http://192.168.1.105:4000

# ❌ WRONG - using localhost (won't work on mobile!)
NEXT_PUBLIC_API_URL=http://localhost:4000

# ✅ CORRECT
NEXT_PUBLIC_API_URL=http://192.168.1.105:4000
```

---

## Step 3: Open Firewall (Windows)

**Run PowerShell as Administrator:**
```powershell
# Allow Node.js through Firewall
Get-Process -Name node | ForEach-Object {
    $path = $_.Path
    New-NetFirewallRule -DisplayName "Allow Node ($path)" -Direction Inbound -Program $path -Action Allow -Profile Private
}
```

**Or allow specific ports:**
```powershell
# Allow port 4000 (API)
New-NetFirewallRule -DisplayName "Allow API Port 4000" -Direction Inbound -Port 4000 -Protocol TCP -Action Allow -Profile Private

# Allow port 3000 (Web)
New-NetFirewallRule -DisplayName "Allow Web Port 3000" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow -Profile Private
```

---

## Step 4: Run API Server

**Terminal 1:**
```cmd
cd E:\tran-go-hoang-gia-erp\apps\api
npm run start:dev
```

**Expected output:**
```
🔍 Checking port 4000 availability...
✅ Port 4000 is available
🚀 API SERVER STARTED SUCCESSFULLY
📡 Server URL:      http://localhost:4000
📡 LAN URL:         http://0.0.0.0:4000
📚 Swagger Docs:     http://localhost:4000/docs
```

---

## Step 5: Run Web Server

**Terminal 2:**
```cmd
cd E:\tran-go-hoang-gia-erp\apps\web
npm run dev:lan
```

**Expected output:**
```
ready - started server on 0.0.0.0:3000, url = http://localhost:3000
```

---

## Step 6: Verify API is Accessible

### From PC Browser:
```
http://localhost:4000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 10.5,
  "port": 4000,
  "host": "0.0.0.0"
}
```

### From Mobile Browser (same WiFi):
```
http://192.168.1.105:4000/health
```

**Should return the same JSON response.**

---

## Step 7: Test the Application

| Platform | URL | Expected |
|----------|-----|----------|
| **Desktop** | `http://localhost:3000` | ✅ Login works, data loads |
| **Desktop** | `http://192.168.1.105:3000` | ✅ Login works, data loads |
| **Mobile** | `http://192.168.1.105:3000` | ✅ Login works, data loads |

---

## Console Verification

Open DevTools → Console on both PC and mobile:

### ✅ CORRECT (for LAN):
```
[API CONFIG] Raw env: "http://192.168.1.105:4000"
[API CONFIG] Sanitized: http://192.168.1.105:4000
[API CONFIG] Protocol: http:
[API CONFIG] Host: 192.168.1.105:4000
[API CONFIG] Initialized: {baseUrl: "http://192.168.1.105:4000", envSet: true}
[API] WITH auth → http://192.168.1.105:4000/projects/xxx
[API] ✅ Success: data
```

### ❌ WRONG (localhost won't work on mobile):
```
[API CONFIG] Initialized: {baseUrl: "http://localhost:4000", envSet: true}
```

### ❌ WRONG (env not set):
```
[API CONFIG ERROR] NEXT_PUBLIC_API_URL is not set!
```

---

## Troubleshooting

### Issue 1: Timeout Errors / Pending Requests → Cancelled

**Symptoms:**
- Requests show as "pending" then "cancelled"
- Timeout after 15000ms
- "Load failed" on mobile

**Causes & Fixes:**

1. **API not accessible from mobile:**
   ```
   curl http://192.168.1.105:4000/health
   ```
   - If fails → Firewall issue (see Step 3)
   - If succeeds → API is reachable

2. **Wrong base URL:**
   - Check console for `[API CONFIG]`
   - Must show your LAN IP, not localhost

3. **CORS preflight blocked:**
   - Check Network tab for OPTIONS requests
   - Should return 204, not 401/403
   - JwtAuthGuard now skips OPTIONS

### Issue 2: CORS Error / Preflight Failed

**Symptoms:**
- "Access to fetch at 'http://192.168.1.105:4000/...' from origin 'http://192.168.1.105:3000' has been blocked by CORS policy"

**Fix:**
1. API auto-detects LAN IPs
2. If still blocked, add to `apps/api/.env`:
   ```
   WEB_CORS_ORIGINS=http://192.168.1.105:3000
   ```
3. Restart API server

### Issue 3: "URL is not valid or contains user credentials"

**Cause:** Invalid URL format in `NEXT_PUBLIC_API_URL`

**Fix:**
1. Check console for `[API CONFIG] Raw env:`
2. Ensure no extra quotes, spaces, or newlines
3. Use format: `http://192.168.1.105:4000`

### Issue 4: Network Tab Shows Many Cancelled Requests

**Cause:** Components unmounting before requests complete

**Fix:**
- This is normal during navigation
- Requests should complete on new page
- If persistent → AbortController may be firing

---

## Debug Commands

```powershell
# Test API from PC
curl http://localhost:4000/health

# Test API from Mobile (replace IP)
curl http://192.168.1.105:4000/health

# Check what's listening on port 4000
netstat -ano | findstr :4000

# Kill process on port 4000
taskkill /PID <PID> /F
```

---

## Files Changed

| File | Purpose |
|------|---------|
| `apps/api/src/auth/jwt-auth.guard.ts` | Skip OPTIONS (preflight) requests |
| `apps/api/src/main.ts` | Bind 0.0.0.0 + CORS + /health |
| `apps/web/lib/config.ts` | Sanitize env + detailed logging |
| `apps/web/lib/api.ts` | Uses centralized config |
| `apps/web/package.json` | `dev:lan` script |
| `apps/web/.env.local` | **YOU NEED TO CREATE THIS** |

---

## Quick Commands Summary

```cmd
# Step 1: Find IP
ipconfig

# Step 2: Create .env.local
# File: apps/web/.env.local
# Content: NEXT_PUBLIC_API_URL=http://192.168.1.105:4000

# Terminal 1: API
cd E:\tran-go-hoang-gia-erp\apps\api
npm run start:dev

# Terminal 2: Web
cd E:\tran-go-hoang-gia-erp\apps\web
npm run dev:lan
```

**Test URLs:**
- API Health: `http://localhost:4000/health`
- API from Mobile: `http://192.168.1.105:4000/health`
- Web: `http://localhost:3000`
- Web from Mobile: `http://192.168.1.105:3000`

---

## Checklist (Must Pass All)

- [ ] `http://localhost:4000/health` returns `{"status":"ok"}`
- [ ] `http://192.168.1.105:4000/health` returns `{"status":"ok"}` (from mobile)
- [ ] `.env.local` created with `NEXT_PUBLIC_API_URL=http://<IP>:4000`
- [ ] Console shows `[API CONFIG] Initialized` with correct LAN IP
- [ ] No "localhost" warning in console
- [ ] `http://localhost:3000` loads and data fetches OK
- [ ] `http://192.168.1.105:3000` loads and data fetches OK (from mobile)
- [ ] Network tab shows no cancelled requests (except during navigation)
- [ ] No CORS errors in console
