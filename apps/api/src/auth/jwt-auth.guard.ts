import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Skip authentication for OPTIONS (preflight) requests
    const request = context.switchToHttp().getRequest();
    if (request.method === 'OPTIONS') {
      console.log('[JwtAuthGuard] Skipping OPTIONS (preflight) request');
      return true;
    }

    console.log('[JwtAuthGuard] canActivate called for:', request.method, request.url);
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    console.log('[JwtAuthGuard] handleRequest called');
    console.log('[JwtAuthGuard] err:', err);
    console.log('[JwtAuthGuard] user:', user);
    console.log('[JwtAuthGuard] info:', info);
    if (err) {
      console.error('[JwtAuthGuard] Error thrown:', err);
      throw err;
    }
    if (!user) {
      console.error('[JwtAuthGuard] No user found, throwing Unauthorized');
      throw new UnauthorizedException('Unauthorized');
    }
    return user;
  }
}

