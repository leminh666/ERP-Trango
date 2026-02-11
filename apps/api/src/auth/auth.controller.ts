import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginInput, LoginResponse } from '@tran-go-hoang-gia/shared';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

console.log('[AUTH-CONTROLLER] Module loaded');

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập' })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 401, description: 'Email hoặc mật khẩu không đúng' })
  async login(@Body() data: LoginInput): Promise<LoginResponse> {
    return this.authService.login(data);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lấy thông tin user hiện tại' })
  @ApiResponse({ status: 200, description: 'Thông tin user' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  async getProfile(@Request() req: any) {
    return this.authService.validateUser(req.user.id);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quên mật khẩu' })
  async forgotPassword(@Body() { email }: { email: string }) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu' })
  async resetPassword(@Body() { token, newPassword }: { token: string; newPassword: string }) {
    return this.authService.resetPassword(token, newPassword);
  }

  @Get('google/start')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Bắt đầu đăng nhập Google' })
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth Callback' })
  async googleAuthRedirect(@Request() req: any) {
    return this.authService.issueToken(req.user);
  }
}
