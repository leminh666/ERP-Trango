import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrderItemsService {
  constructor(private prisma: PrismaService) {}

  async findByProject(projectId: string, params: { includeDeleted?: boolean }) {
    const { includeDeleted } = params;

    const where: Prisma.OrderItemWhereInput = {
      projectId,
      ...(includeDeleted ? {} : { deletedAt: null }),
    };

    const items = await this.prisma.orderItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        product: true,
      },
    });

    // Get all acceptance items for this project
    const acceptanceItems = await this.prisma.orderAcceptanceItem.findMany({
      where: { projectId },
    });

    const acceptanceMap = new Map(
      acceptanceItems.map((ai) => [ai.orderItemId, ai])
    );

    // Merge acceptance data into items
    return items.map((item) => ({
      ...item,
      // Add acceptedQty from acceptance if exists, otherwise null
      acceptedQty: acceptanceMap.get(item.id)?.acceptedQty || null,
      acceptedUnitPrice: acceptanceMap.get(item.id)?.unitPrice || null,
    }));
  }

  async findOne(id: string) {
    const item = await this.prisma.orderItem.findFirst({
      where: { id },
      include: {
        product: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Hạng mục không tồn tại');
    }

    return item;
  }

  async create(projectId: string, data: Prisma.OrderItemCreateInput, userId?: string) {
    // Validation: qty >= 0 (cho phép SL = 0 vì sau nghiệm thu mới có số lượng)
    const qty = data.qty as any;
    if (qty !== undefined && qty !== null && Number(qty) < 0) {
      throw new BadRequestException('Số lượng không được âm');
    }

    // Validation: name không rỗng
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new BadRequestException('Tên hạng mục/sản phẩm là bắt buộc');
    }

    // Validation: unit không rỗng
    if (!data.unit || typeof data.unit !== 'string' || data.unit.trim() === '') {
      throw new BadRequestException('Đơn vị tính là bắt buộc');
    }

    // Validation: unitPrice >= 0
    const unitPrice = data.unitPrice as any;
    if (unitPrice !== undefined && unitPrice !== null && Number(unitPrice) < 0) {
      throw new BadRequestException('Đơn giá không được âm');
    }

    // Nếu có productId, lấy thông tin product để fill snapshot
    if (data.product?.connect?.id) {
      const product = await this.prisma.product.findUnique({
        where: { id: data.product.connect.id },
      });

      if (!product) {
        throw new NotFoundException('Sản phẩm không tồn tại');
      }

      // Fill snapshot name/unit từ Product nếu FE không gửi
      const name = (data.name as string) || product.name;
      const unit = (data.unit as string) || product.unit;

      // Tính amount = qty * unitPrice
      const qtyNum = Number(qty);
      const priceNum = unitPrice !== undefined ? Number(unitPrice) : Number(product.defaultSalePrice || 0);
      const amount = qtyNum * priceNum;

      return this.prisma.orderItem.create({
        data: {
          project: { connect: { id: projectId } },
          product: { connect: { id: product.id } },
          name: name,
          unit: unit,
          qty: qtyNum,
          unitPrice: priceNum,
          amount: amount,
          note: data.note,
          createdByUserId: userId,
        },
      });
    }

    // Không có productId (hạng mục custom)
    // Tính amount = qty * unitPrice
    const qtyNum = Number(qty);
    const unitPriceVal = unitPrice !== undefined ? Number(unitPrice) : 0;
    const amount = qtyNum * unitPriceVal;

    return this.prisma.orderItem.create({
      data: {
        project: { connect: { id: projectId } },
        name: data.name as string,
        unit: data.unit as string,
        qty: qtyNum,
        unitPrice: unitPriceVal,
        amount: amount,
        note: data.note,
        createdByUserId: userId,
      },
    });
  }

  async update(id: string, data: Prisma.OrderItemUpdateInput, userId?: string) {
    const existing = await this.findOne(id);

    // Validation: qty >= 0 (cho phép SL = 0)
    if (data.qty !== undefined) {
      const qty = data.qty as any;
      if (Number(qty) < 0) {
        throw new BadRequestException('Số lượng không được âm');
      }
    }

    // Validation: unit không rỗng
    if (data.unit !== undefined && typeof data.unit === 'string' && data.unit.trim() === '') {
      throw new BadRequestException('Đơn vị tính không được để trống');
    }

    // Validation: unitPrice >= 0
    if (data.unitPrice !== undefined) {
      const unitPrice = data.unitPrice as any;
      if (Number(unitPrice) < 0) {
        throw new BadRequestException('Đơn giá không được âm');
      }
    }

    // Nếu có productId change
    let productData: any = {};
    let name = (data.name as string) || existing.name;
    let unit = (data.unit as string) || existing.unit;
    // Fix: Use nullish coalescing (??) instead of logical OR (||) to allow qty=0
    let qty = data.qty !== undefined ? data.qty : existing.qty;
    let unitPrice = (data.unitPrice as any) !== undefined ? data.unitPrice : existing.unitPrice;

    if (data.product?.connect?.id) {
      const product = await this.prisma.product.findUnique({
        where: { id: data.product.connect.id },
      });

      if (!product) {
        throw new NotFoundException('Sản phẩm không tồn tại');
      }

      productData = { product: { connect: { id: product.id } } };
      // Nếu FE không gửi name/unit mới, dùng của product
      if (!data.name) name = product.name;
      if (!data.unit) unit = product.unit;
    } else if (data.product?.disconnect) {
      productData = { product: { disconnect: true } };
    }

    // Tính lại amount
    const qtyNum = Number(qty);
    const priceNum = Number(unitPrice);
    const amount = qtyNum * priceNum;

    return this.prisma.orderItem.update({
      where: { id },
      data: {
        ...data,
        ...productData,
        name: name,
        unit: unit,
        qty: qtyNum,
        unitPrice: priceNum,
        amount: amount,
        updatedByUserId: userId,
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);

    return this.prisma.orderItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string) {
    const item = await this.prisma.orderItem.findFirst({ where: { id } });

    if (!item) {
      throw new NotFoundException('Hạng mục không tồn tại');
    }

    return this.prisma.orderItem.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async getSummary(projectId: string) {
    const items = await this.prisma.orderItem.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
    });

    const estimatedTotal = items.reduce((sum, item) => sum + Number(item.amount), 0);

    return {
      projectId,
      itemCount: items.length,
      estimatedTotal,
    };
  }
}

