import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as path from 'path';
import * as fs from 'fs';
import * as net from 'net';
import * as http from 'http';
import { NestExpressApplication } from '@nestjs/platform-express';
import { GlobalExceptionFilter } from './common/global-exception.filter';

// =============================================================================
// CONSTANTS & CONFIG
// =============================================================================
const API_DIR = path.resolve(__dirname, '..', '..');
const ENV_PATH = path.resolve(API_DIR, '.env');
const LOCK_FILE_PATH = path.resolve(API_DIR, '.api-lock');
const DEFAULT_PORT = 4000;
const HOST = '0.0.0.0';

// =============================================================================
// ENVIRONMENT LOADING
// =============================================================================
interface EnvConfig {
  DATABASE_URL: string;
  JWT_SECRET: string;
  PORT: string;
}

function loadEnv(): EnvConfig {
  console.log('🔍 Checking for .env files...');
  console.log(`   - ${ENV_PATH}: ${fs.existsSync(ENV_PATH) ? 'EXISTS' : 'NOT FOUND'}`);

  const dotenv = require('dotenv');
  const result = dotenv.config({ path: ENV_PATH });

  if (result.error) {
    console.error('❌ Failed to load .env:', result.error.message);
    throw new Error('FATAL: Cannot load .env file');
  }

  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(k => !process.env[k]);

  if (missing.length > 0) {
    console.error(`❌ Missing env vars: ${missing.join(', ')}`);
    throw new Error(`FATAL: Missing env vars: ${missing.join(', ')}`);
  }

  console.log('✅ Environment loaded');
  return {
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    PORT: process.env.PORT || String(DEFAULT_PORT),
  };
}

const envConfig = loadEnv();
const DESIRED_PORT = parseInt(envConfig.PORT, 10);

// =============================================================================
// LOCK FILE MANAGEMENT (Singleton Pattern)
// =============================================================================
let lockHandle: number | null = null;

function acquireLock(): boolean {
  try {
    // Create lock file with current PID
    fs.writeFileSync(LOCK_FILE_PATH, String(process.pid), 'utf-8');
    lockHandle = fs.openSync(LOCK_FILE_PATH, 'r+');
    return true;
  } catch (err) {
    console.error('❌ Failed to acquire lock:', err);
    return false;
  }
}

function releaseLock(): void {
  try {
    if (lockHandle) {
      fs.closeSync(lockHandle);
      lockHandle = null;
    }
    if (fs.existsSync(LOCK_FILE_PATH)) {
      fs.unlinkSync(LOCK_FILE_PATH);
    }
  } catch (err) {
    console.warn('⚠️ Failed to release lock:', err);
  }
}

function getLockOwner(): { pid: number; exists: boolean } {
  try {
    if (fs.existsSync(LOCK_FILE_PATH)) {
      const pid = parseInt(fs.readFileSync(LOCK_FILE_PATH, 'utf-8'), 10);
      if (!isNaN(pid) && pid > 0) {
        return { pid, exists: true };
      }
    }
  } catch {}
  return { pid: 0, exists: false };
}

async function killLockOwner(): Promise<boolean> {
  const owner = getLockOwner();
  if (!owner.exists || owner.pid === process.pid) {
    return false;
  }

  console.log(`🔄 Found stale lock with PID ${owner.pid}, attempting to kill...`);

  // Check if process still exists
  try {
    process.kill(owner.pid, 0);
  } catch {
    // Process doesn't exist, just remove lock
    console.log('⚠️ Stale process dead, removing lock file');
    releaseLock();
    return true;
  }

  // Try to kill the process
  try {
    const { execSync } = require('child_process');
    execSync(`taskkill /PID ${owner.pid} /F`, { encoding: 'utf8', stdio: 'ignore' });
    console.log(`✅ Killed stale process ${owner.pid}`);

    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 2000));
    releaseLock();
    return true;
  } catch (err) {
    console.warn(`⚠️ Could not kill process ${owner.pid}:`, err);
    return false;
  }
}

// =============================================================================
// PORT MANAGEMENT
// =============================================================================
async function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(startPort: number, maxAttempts: number = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const inUse = await isPortInUse(port);
    if (!inUse) {
      return port;
    }
    console.log(`   Port ${port} in use, trying ${port + 1}...`);
  }
  throw new Error(`No available port after ${maxAttempts} attempts`);
}

// =============================================================================
// MIME TYPES
// =============================================================================
const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.html': 'text/html',
};

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================
let app: NestExpressApplication | null = null;
let server: ReturnType<typeof http.createServer> | null = null;
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    console.log(`⏳ ${signal}: Already shutting down...`);
    return;
  }
  isShuttingDown = true;

  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);

  try {
    // Close HTTP server
    if (server) {
      console.log('   Closing HTTP server...');
      await new Promise<void>((resolve) => {
        server!.close(() => {
          console.log('   HTTP server closed');
          resolve();
        });
      });
    }

    // Close NestJS app
    if (app) {
      console.log('   Closing NestJS app...');
      await app.close();
      console.log('   NestJS app closed');
    }

    // Release lock file
    releaseLock();

    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during shutdown:', err);
    releaseLock();
    process.exit(1);
  }
}

// Register signal handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason: any) => {
  console.error('❌ Unhandled Rejection:', {
    message: reason?.message || reason,
    stack: reason?.stack,
    code: reason?.code,
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// =============================================================================
// BOOTSTRAP
// =============================================================================
async function bootstrap() {
  console.log('='.repeat(60));
  console.log('🚀 STARTING API SERVER');
  console.log(`   PID: ${process.pid}`);
  console.log('='.repeat(60));

  // Check for existing lock
  const owner = getLockOwner();
  if (owner.exists && owner.pid !== process.pid) {
    console.log(`⚠️  Another instance may be running (PID: ${owner.pid})`);
    await killLockOwner();
  }

  // Try to acquire lock
  if (!acquireLock()) {
    console.error('❌ Cannot acquire lock, another instance may be starting');
    console.error('   Try: del apps/api/.api-lock');
    process.exit(1);
  }

  // Find available port
  console.log(`🔍 Checking port ${DESIRED_PORT}...`);
  let port = DESIRED_PORT;

  try {
    port = await findAvailablePort(DESIRED_PORT, 10);
  } catch {
    console.error(`❌ Could not find available port near ${DESIRED_PORT}`);
    releaseLock();
    process.exit(1);
  }

  if (port !== DESIRED_PORT) {
    console.log(`⚠️  Port ${DESIRED_PORT} busy, using port ${port}`);
  } else {
    console.log(`✅ Port ${port} available`);
  }

  // Create NestJS app
  app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Apply global exception filter with enhanced logging
  app.useGlobalFilters(new GlobalExceptionFilter());

  // =============================================================================
  // CORS Configuration - Flexible for LAN/Mobile Access
  // =============================================================================
  const corsOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];

  // Add custom CORS origins from environment
  if (process.env.WEB_CORS_ORIGINS) {
    const customOrigins = process.env.WEB_CORS_ORIGINS.split(',').map(o => o.trim());
    corsOrigins.push(...customOrigins);
    console.log(`📝 Adding custom CORS origins: ${customOrigins.join(', ')}`);
  }

  // Auto-detect LAN IPs and add to CORS
  const os = require('os');
  let lanIpCount = 0;
  for (const iface of Object.values(os.networkInterfaces() as Record<string, Array<{family: string, address: string, internal: boolean}>>)) {
    if (iface) {
      for (const info of iface) {
        if (info.family === 'IPv4' && !info.internal && !info.address.startsWith('169.')) {
          const origin = `http://${info.address}:3000`;
          if (!corsOrigins.includes(origin)) {
            corsOrigins.push(origin);
            lanIpCount++;
          }
        }
      }
    }
  }

  if (lanIpCount > 0) {
    console.log(`🌐 Auto-detected ${lanIpCount} LAN IP(s) for CORS`);
  }

  // In development mode, allow all origins for easier mobile testing
  // WARNING: Only use this in development!
  const isDevelopment = process.env.NODE_ENV !== 'production';
  if (isDevelopment && process.env.ALLOW_ALL_CORS === 'true') {
    console.warn('⚠️  WARNING: ALLOW_ALL_CORS is enabled! This is insecure for production!');
    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    });
  } else {
    app.enableCors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    });
  }

  console.log(`✅ CORS configured with ${corsOrigins.length} origins:`);
  corsOrigins.forEach((origin, i) => {
    console.log(`   ${i + 1}. ${origin}`);
  });

  // Health check endpoint
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (req: any, res: any) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      port,
      pid: process.pid,
      lockOwner: getLockOwner().pid,
      apiUrl: `http://localhost:${port}`,
      uploadsUrl: `http://localhost:${port}/uploads`,
    });
  });

  // Static files with proper MIME types and caching headers
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (fs.existsSync(uploadsDir)) {
    app.useStaticAssets(uploadsDir, {
      prefix: '/uploads/',
      setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
        res.set('Content-Type', mimeType);
        
        // Cache strategy based on file type
        const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext);
        const isCacheable = ['.js', '.css', '.html', '.json'].includes(ext);
        
        if (isImage) {
          // Images: aggressive caching (7 days)
          res.set('Cache-Control', 'public, max-age=604800, immutable');
        } else if (isCacheable) {
          // Static assets: 1 day
          res.set('Cache-Control', 'public, max-age=86400');
        } else {
          // Other files: no cache
          res.set('Cache-Control', 'no-store, must-revalidate');
        }
        
        res.set('X-Content-Type-Options', 'nosniff');
      },
    });
  }

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TRẦN GỖ HOÀNG GIA ERP API')
    .setDescription('API documentation for ERP system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Start server
  await app.listen(port, HOST);

  console.log('');
  console.log('='.repeat(60));
  console.log('✅ API SERVER STARTED');
  console.log('='.repeat(60));
  console.log(`📡 Local URL:   http://localhost:${port}`);
  console.log(`📡 LAN URL:      http://${HOST}:${port}`);
  console.log(`📡 Health:       http://localhost:${port}/health`);
  console.log(`📚 Swagger:      http://localhost:${port}/docs`);
  console.log(`📁 Uploads:      http://localhost:${port}/uploads`);
  console.log(`🆔 PID:          ${process.pid}`);
  console.log('='.repeat(60));
  console.log('');
  console.log('💡 Mobile access: Find your PC IP with "ipconfig"');
  console.log(`   Then access: http://<PC_IP>:${port}`);
  console.log('');
}

bootstrap().catch((error: Error) => {
  console.error('❌ FATAL: Failed to start:', error.message);
  console.error('   Stack:', error.stack);
  releaseLock();
  process.exit(1);
});
