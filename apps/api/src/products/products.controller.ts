import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private service: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách sản phẩm' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'productType', required: false, enum: ['CEILING_WOOD', 'FURNITURE', 'OTHER_ITEM'] })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  async findAll(
    @Query('search') search?: string,
    @Query('productType') productType?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.service.findAll({
      search,
      productType,
      includeDeleted: includeDeleted === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin sản phẩm' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Lấy thông tin đầy đủ sản phẩm (bao gồm thuộc tính & biến thể)' })
  async findOneWithDetails(@Param('id') id: string) {
    return this.service.findOneWithDetails(id);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed dữ liệu sản phẩm mẫu (development only)' })
  async seed() {
    return this.service.seedSampleData();
  }

  @Post()
  @ApiOperation({ summary: 'Tạo sản phẩm mới' })
  async create(
    @Body() data: {
      name: string;
      unit: string;
      productType: 'CEILING_WOOD' | 'FURNITURE' | 'OTHER_ITEM';
      visualType?: string;
      iconKey?: string;
      imageUrl?: string;
      color?: string;
    },
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    console.log('[CREATE_PRODUCT_CONTROLLER] Received body:', JSON.stringify(data, null, 2));
    return this.service.create(data as any, req?.user?.id, req?.user?.email);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật sản phẩm' })
  async update(
    @Param('id') id: string,
    @Body() data: {
      name?: string;
      unit?: string;
      productType?: 'CEILING_WOOD' | 'FURNITURE' | 'OTHER_ITEM';
      visualType?: string;
      iconKey?: string;
      imageUrl?: string;
      color?: string;
    },
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.service.update(id, data as any, req?.user?.id, req?.user?.email);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa sản phẩm (soft delete)' })
  async delete(
    @Param('id') id: string,
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.service.delete(id, req?.user?.id, req?.user?.email);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Khôi phục sản phẩm' })
  async restore(
    @Param('id') id: string,
    @Request() req?: { user: { id: string; email?: string } },
  ) {
    return this.service.restore(id, req?.user?.id, req?.user?.email);
  }
}
