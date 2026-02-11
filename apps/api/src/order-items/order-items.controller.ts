import { Controller, Get, Post, Put, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { OrderItemsService } from './order-items.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('order-items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class OrderItemsController {
  constructor(private service: OrderItemsService) {}

  @Get(':projectId/items')
  @ApiOperation({ summary: 'Lấy danh sách hạng mục/sản phẩm của dự án' })
  @ApiQuery({ name: 'includeDeleted', required: false, type: Boolean })
  async findAll(
    @Param('projectId') projectId: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    return this.service.findByProject(projectId, {
      includeDeleted: includeDeleted === 'true',
    });
  }

  @Get(':projectId/summary')
  @ApiOperation({ summary: 'Lấy tổng ước tính của dự án' })
  async getSummary(@Param('projectId') projectId: string) {
    return this.service.getSummary(projectId);
  }

  @Post(':projectId/items')
  @ApiOperation({ summary: 'Tạo hạng mục/sản phẩm mới' })
  async create(
    @Param('projectId') projectId: string,
    @Body() data: {
      productId?: string;
      name: string;
      unit: string;
      qty: number;
      unitPrice: number;
      note?: string;
    },
    @Request() req: any,
  ) {
    const userId = req.user?.id;
    // Build Prisma input
    const prismaData: any = {
      name: data.name,
      unit: data.unit,
      qty: data.qty,
      unitPrice: data.unitPrice,
      note: data.note,
    };

    if (data.productId) {
      prismaData.product = { connect: { id: data.productId } };
    }

    return this.service.create(projectId, prismaData, userId);
  }

  @Put(':projectId/items/:itemId')
  @ApiOperation({ summary: 'Cập nhật hạng mục/sản phẩm' })
  async update(
    @Param('itemId') itemId: string,
    @Body() data: {
      productId?: string | null;
      name?: string;
      unit?: string;
      qty?: number;
      unitPrice?: number;
      note?: string;
    },
    @Request() req: any,
  ) {
    const userId = req.user?.id;

    // Build Prisma input
    const prismaData: any = {};
    if (data.name !== undefined) prismaData.name = data.name;
    if (data.unit !== undefined) prismaData.unit = data.unit;
    if (data.qty !== undefined) prismaData.qty = data.qty;
    if (data.unitPrice !== undefined) prismaData.unitPrice = data.unitPrice;
    if (data.note !== undefined) prismaData.note = data.note;

    if (data.productId !== undefined) {
      if (data.productId === null) {
        prismaData.product = { disconnect: true };
      } else {
        prismaData.product = { connect: { id: data.productId } };
      }
    }

    return this.service.update(itemId, prismaData, userId);
  }

  @Delete(':projectId/items/:itemId')
  @ApiOperation({ summary: 'Xóa hạng mục/sản phẩm (soft delete)' })
  async delete(@Param('itemId') itemId: string) {
    return this.service.delete(itemId);
  }

  @Post(':projectId/items/:itemId/restore')
  @ApiOperation({ summary: 'Khôi phục hạng mục/sản phẩm đã xóa' })
  async restore(@Param('itemId') itemId: string) {
    return this.service.restore(itemId);
  }
}

