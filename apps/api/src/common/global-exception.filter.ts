import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const timestamp = new Date().toISOString();
    const method = request.method;
    const url = request.url;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let code: string | undefined;
    let details: any = null;

    // Extract exception details
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error || exception.name;
        code = (exceptionResponse as any).code;
        details = (exceptionResponse as any).details;
      } else {
        message = exceptionResponse as string;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;

      // Handle Prisma errors
      const prismaError = exception as any;
      if (prismaError.code) {
        code = prismaError.code;

        // Prisma-specific error messages
        switch (prismaError.code) {
          case 'P2002':
            message = 'Dữ liệu đã tồn tại (unique constraint)';
            status = HttpStatus.CONFLICT;
            break;
          case 'P2025':
            message = 'Bản ghi không tồn tại';
            status = HttpStatus.NOT_FOUND;
            break;
          case 'P2003':
            message = 'Ràng buộc khóa ngoại thất bại';
            status = HttpStatus.BAD_REQUEST;
            break;
          default:
            message = `Prisma Error [${prismaError.code}]: ${exception.message}`;
        }

        // Include Prisma metadata in details
        details = {
          prismaCode: prismaError.code,
          meta: prismaError.meta,
        };
      }
    }

    // ==========================================
    // ENHANCED ERROR LOGGING WITH CONTEXT
    // ==========================================
    const userAgent = request.headers['user-agent'] || 'unknown';
    const contentType = request.headers['content-type'] || 'unknown';
    const contentLength = request.headers['content-length'] || 'unknown';

    // Get user info if available (from JWT guard)
    const user = (request as any).user;
    const userId = user?.id || user?.sub || 'anonymous';
    const userEmail = user?.email || 'unknown';

    // Sanitize sensitive data from body for logging
    const safeBody = this.sanitizeBody(request.body);

    console.error('='.repeat(60));
    console.error('❌ API ERROR');
    console.error('='.repeat(60));
    console.error(`🕐 Timestamp:  ${timestamp}`);
    console.error(`📍 Route:      ${method} ${url}`);
    console.error(`👤 User:       ${userEmail} (ID: ${userId})`);
    console.error(`📊 Status:     ${status} ${error}`);
    console.error(`🔢 Code:       ${code || 'N/A'}`);

    if (request.body && Object.keys(request.body).length > 0) {
      console.error(`📝 Request Body:`, JSON.stringify(safeBody, null, 2));
    }

    if (details) {
      console.error(`📋 Details:`, JSON.stringify(details, null, 2));
    }

    console.error(`🌐 User-Agent: ${userAgent}`);
    console.error(`📦 Content-Type: ${contentType}`);

    // Log stack trace for 5xx errors
    if (status >= 500 && exception instanceof Error) {
      console.error(`🔍 Stack Trace:`);
      exception.stack?.split('\n').forEach((line: string) => {
        console.error(`   ${line.trim()}`);
      });
    }

    console.error('='.repeat(60));

    // ==========================================
    // RESPONSE
    // ==========================================
    const isDev = process.env.NODE_ENV !== 'production';

    const errorResponse: any = {
      statusCode: status,
      message: message,
      error: error,
      timestamp: timestamp,
      path: url,
    };

    // Include code and details in dev mode or for specific errors
    if (isDev || code) {
      errorResponse.code = code;
    }

    if (isDev && details) {
      errorResponse.details = details;
    }

    // For validation errors (400), include field errors
    if (status === HttpStatus.BAD_REQUEST && details === null) {
      const validationDetails = (exception as any).response?.message;
      if (validationDetails) {
        errorResponse.validation = validationDetails;
      }
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Sanitize body to remove sensitive data before logging
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'apiKey', 'accessToken'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
