import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('product-attributes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('product-attributes')
export class ProductAttributesController {
  constructor(private prisma: PrismaService) {}

  // === ATTRIBUTE GROUPS ===

  @Get(':productId/groups')
  @ApiOperation({ summary: 'Lấy danh sách nhóm thuộc tính của sản phẩm' })
  async getGroups(@Param('productId') productId: string) {
    return this.prisma.productAttributeGroup.findMany({
      where: { productId },
      include: {
        values: {
          orderBy: { sortOrder: 'asc' },
          include: {
            childValues: {
              orderBy: { sortOrder: 'asc' }
            }
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });
  }

  @Post(':productId/groups')
  @ApiOperation({ summary: 'Tạo nhóm thuộc tính mới' })
  async createGroup(
    @Param('productId') productId: string,
    @Body() data: { name: string; sortOrder?: number },
  ) {
    return this.prisma.productAttributeGroup.create({
      data: {
        productId,
        name: data.name,
        sortOrder: data.sortOrder ?? 0
      }
    });
  }

  @Put('groups/:groupId')
  @ApiOperation({ summary: 'Cập nhật nhóm thuộc tính' })
  async updateGroup(
    @Param('groupId') groupId: string,
    @Body() data: { name?: string; sortOrder?: number },
  ) {
    return this.prisma.productAttributeGroup.update({
      where: { id: groupId },
      data
    });
  }

  @Delete('groups/:groupId')
  @ApiOperation({ summary: 'Xóa nhóm thuộc tính (cascade)' })
  async deleteGroup(@Param('groupId') groupId: string) {
    return this.prisma.productAttributeGroup.delete({
      where: { id: groupId }
    });
  }

  // === ATTRIBUTE VALUES ===

  @Post('values')
  @ApiOperation({ summary: 'Tạo giá trị thuộc tính' })
  async createValue(
    @Body() data: {
      groupId: string;
      value: string;
      parentValueId?: string;
      sortOrder?: number;
    },
  ) {
    return this.prisma.productAttributeValue.create({
      data: {
        groupId: data.groupId,
        value: data.value,
        parentValueId: data.parentValueId,
        sortOrder: data.sortOrder ?? 0
      }
    });
  }

  @Put('values/:valueId')
  @ApiOperation({ summary: 'Cập nhật giá trị thuộc tính' })
  async updateValue(
    @Param('valueId') valueId: string,
    @Body() data: { value?: string; parentValueId?: string | null; sortOrder?: number },
  ) {
    return this.prisma.productAttributeValue.update({
      where: { id: valueId },
      data
    });
  }

  @Delete('values/:valueId')
  @ApiOperation({ summary: 'Xóa giá trị thuộc tính' })
  async deleteValue(@Param('valueId') valueId: string) {
    return this.prisma.productAttributeValue.delete({
      where: { id: valueId }
    });
  }

  // === VARIANTS ===

  @Get(':productId/variants')
  @ApiOperation({ summary: 'Lấy danh sách biến thể của sản phẩm' })
  async getVariants(@Param('productId') productId: string) {
    return this.prisma.productVariant.findMany({
      where: { productId },
      include: {
        attributes: {
          include: {
            value: {
              include: {
                group: true,
                parentValue: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  @Post(':productId/variants')
  @ApiOperation({ summary: 'Tạo biến thể mới' })
  async createVariant(
    @Param('productId') productId: string,
    @Body() data: {
      name: string;
      code?: string;
      price?: number;
      imageUrl?: string;
      attributeValueIds: string[];
    },
  ) {
    // Start transaction to create variant with attributes
    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.create({
        data: {
          productId,
          name: data.name,
          code: data.code,
          price: data.price,
          imageUrl: data.imageUrl,
        }
      });

      // Create variant-attribute relationships
      if (data.attributeValueIds.length > 0) {
        await tx.productVariantAttribute.createMany({
          data: data.attributeValueIds.map(valueId => ({
            variantId: variant.id,
            valueId
          }))
        });
      }

      return tx.productVariant.findUnique({
        where: { id: variant.id },
        include: {
          attributes: {
            include: {
              value: {
                include: {
                  group: true,
                  parentValue: true
                }
              }
            }
          }
        }
      });
    });
  }

  @Put('variants/:variantId')
  @ApiOperation({ summary: 'Cập nhật biến thể' })
  async updateVariant(
    @Param('variantId') variantId: string,
    @Body() data: {
      name?: string;
      code?: string | null;
      price?: number | null;
      imageUrl?: string | null;
      isActive?: boolean;
      attributeValueIds?: string[];
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Build update data - only include fields that are explicitly provided
      const updateData: Record<string, any> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.code !== undefined) updateData.code = data.code;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      // Update variant basic info
      await tx.productVariant.update({
        where: { id: variantId },
        data: updateData
      });

      // Update attributes if provided
      if (data.attributeValueIds !== undefined) {
        // Delete existing attributes
        await tx.productVariantAttribute.deleteMany({
          where: { variantId }
        });

        // Create new attributes
        if (data.attributeValueIds.length > 0) {
          await tx.productVariantAttribute.createMany({
            data: data.attributeValueIds.map(valueId => ({
              variantId,
              valueId
            }))
          });
        }
      }

      return tx.productVariant.findUnique({
        where: { id: variantId },
        include: {
          attributes: {
            include: {
              value: {
                include: {
                  group: true,
                  parentValue: true
                }
              }
            }
          }
        }
      });
    });
  }

  @Delete('variants/:variantId')
  @ApiOperation({ summary: 'Xóa biến thể' })
  async deleteVariant(@Param('variantId') variantId: string) {
    return this.prisma.productVariant.delete({
      where: { id: variantId }
    });
  }
}

