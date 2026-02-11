import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginInput } from '@tran-go-hoang-gia/shared';
import { randomBytes, createHash } from 'crypto';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private settingsService: SettingsService,
  ) {}

  async login(data: LoginInput) {
    const { email, password } = data;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.deletedAt || user.isActive === false) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    return this.issueToken(user);
  }

  issueToken(user: { id: string; email: string; role: 'ADMIN' | 'STAFF'; name: string }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async validateOAuthUser(profile: { email: string; name: string; avatarUrl?: string }) {
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      // Auto-create user if they don't exist
      const randomPassword = await bcrypt.hash(randomBytes(16).toString('hex'), 10);
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          password: randomPassword, // Required field, but not used for OAuth login
          avatarUrl: profile.avatarUrl,
          role: 'STAFF', // Default role for new OAuth users
          isActive: true,
        },
      });
    }

    return user;
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async forgotPassword(email: string) {
    const settings = await this.settingsService.getSettings('');
    const enabled = settings.auth?.passwordReset?.enabled;
    if (!enabled) {
      return { ok: true, message: 'Chức năng quên mật khẩu đang tắt' };
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return ok to avoid leaking existence
    if (!user) {
      return { ok: true, message: 'Nếu email tồn tại, hệ thống sẽ gửi link đặt lại mật khẩu.' };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const expireMinutes = settings.auth.passwordReset.tokenExpireMinutes || 30;
    const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    if (!settings.auth.passwordReset.smtp?.enabled) {
      // MVP: log to console
      // eslint-disable-next-line no-console
      console.log(`[MVP RESET LINK] ${user.email}: ${resetLink}`);
      return { ok: true, message: 'Đã tạo link reset (MVP xem console)' };
    }

    // SMTP sending is optional MVP; not implemented here to keep minimal changes.
    return { ok: true, message: 'Đã tạo link reset (MVP xem console)' };
  }

  async resetPassword(token: string, newPassword: string) {
    if (!token || token.length < 32) {
      throw new BadRequestException('Token không hợp lệ');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException('Mật khẩu mới phải từ 6 ký tự');
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const rec = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
      },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!rec || rec.usedAt) {
      throw new BadRequestException('Token không hợp lệ hoặc đã được sử dụng');
    }

    if (rec.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Token đã hết hạn');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: rec.userId },
        data: { password: passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: rec.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { ok: true, message: 'Đặt lại mật khẩu thành công' };
  }
}
