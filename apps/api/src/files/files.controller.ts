import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, Body, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Tải lên file (logo, ảnh...)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: any,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file');
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Chỉ chấp nhận file ảnh (JPG, PNG, GIF, WebP, SVG)');
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('File không được vượt quá 5MB');
    }

    // Get host from request for proper LAN URL generation
    const host = req.get('host') || 'localhost:4000';
    const protocol = req.protocol === 'https' ? 'https' : 'http';

    const result = await this.filesService.uploadFile(file, { host, protocol });
    return result;
  }
}
