import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class FilesService {
  private uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(file: any, options?: { host?: string; protocol?: string }): Promise<{ url: string }> {
    if (!file) {
      throw new Error('No file uploaded');
    }

    // Generate unique filename
    const ext = path.extname(file.originalname);
    const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const filepath = path.join(this.uploadDir, filename);

    // Write file
    fs.writeFileSync(filepath, file.buffer);

    // Return URL - use provided host/protocol or fallback to environment
    const protocol = options?.protocol || (process.env.API_URL?.startsWith('https') ? 'https' : 'http');
    const host = options?.host || (process.env.API_URL ? new URL(process.env.API_URL).host : 'localhost:4000');

    return {
      url: `${protocol}://${host}/uploads/${filename}`,
    };
  }

  getFilePath(filename: string): string {
    return path.join(this.uploadDir, filename);
  }
}
