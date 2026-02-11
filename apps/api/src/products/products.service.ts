import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

// =============================================================================
// HELPER: Generate next code with prefix
// =============================================================================
function generateNextCode(prefix: string, lastCode: number | null): string {
  const nextNum = (lastCode || 0) + 1;
  return `${prefix}${String(nextNum).padStart(4, '0')}`;
}

interface CreateProductInput {
  name: string;
  unit: string;
  productType: string;
  imageUrl?: string;
  visualType?: string;
  iconKey?: string;
  color?: string;
}

interface UpdateProductInput {
  name?: string;
  unit?: string;
  productType?: string;
  imageUrl?: string;
  visualType?: string;
  iconKey?: string;
  color?: string;
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly CODE_PREFIX = 'SP';
  private readonly MAX_RETRIES = 3;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(params: { search?: string; productType?: string; includeDeleted?: boolean }) {
    const { search, productType, includeDeleted } = params;

    const where: Prisma.ProductWhereInput = {
      ...(includeDeleted ? {} : { deletedAt: null }),
      ...(productType ? { productType: productType as any } : {}),
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException(`Sản phẩm không tồn tại`);
    }

    return product;
  }

  async findOneWithDetails(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        attributeGroups: {
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
        },
        variants: {
          where: { isActive: true },
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
        }
      }
    });

    if (!product) {
      throw new NotFoundException(`Sản phẩm không tồn tại`);
    }

    return product;
  }

  async create(data: CreateProductInput, userId?: string, userEmail?: string) {
    this.logger.log('[CREATE_PRODUCT] Starting product creation');
    this.logger.log('[CREATE_PRODUCT] Input data:', JSON.stringify(data, null, 2));

    // =============================================================================
    // VALIDATION FIRST (before transaction)
    // =============================================================================
    this.logger.log('[CREATE_PRODUCT] Validating fields...');
    this.logger.log('[CREATE_PRODUCT] data.name:', data.name, typeof data.name);
    this.logger.log('[CREATE_PRODUCT] data.unit:', data.unit, typeof data.unit);
    this.logger.log('[CREATE_PRODUCT] data.productType:', data.productType, typeof data.productType);
    this.logger.log('[CREATE_PRODUCT] data.imageUrl:', data.imageUrl, typeof data.imageUrl);
    this.logger.log('[CREATE_PRODUCT] data.visualType:', data.visualType, typeof data.visualType);

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      this.logger.error('[CREATE_PRODUCT] Validation failed: name is required');
      throw new BadRequestException('Tên sản phẩm là bắt buộc');
    }

    if (!data.unit || typeof data.unit !== 'string' || data.unit.trim() === '') {
      this.logger.error('[CREATE_PRODUCT] Validation failed: unit is required');
      throw new BadRequestException('Đơn vị tính là bắt buộc');
    }

    // Validate productType
    if (!data.productType || typeof data.productType !== 'string') {
      this.logger.error('[CREATE_PRODUCT] Validation failed: productType is required');
      throw new BadRequestException('Loại sản phẩm là bắt buộc');
    }

    const validTypes = ['CEILING_WOOD', 'FURNITURE', 'OTHER_ITEM'];
    this.logger.log('[CREATE_PRODUCT] Checking valid types:', validTypes);
    this.logger.log('[CREATE_PRODUCT] data.productType value:', data.productType);

    if (!validTypes.includes(data.productType as string)) {
      this.logger.error('[CREATE_PRODUCT] Validation failed: invalid productType', data.productType);
      throw new BadRequestException('Loại sản phẩm không hợp lệ');
    }

    // Phase 7.1: Product CHỈ DÙNG LOGO
    const imageUrl = data.imageUrl as string | undefined;
    this.logger.log('[CREATE_PRODUCT] imageUrl:', imageUrl);

    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim() === '') {
      this.logger.error('[CREATE_PRODUCT] Validation failed: imageUrl is required');
      throw new BadRequestException('Logo sản phẩm là bắt buộc');
    }

    // Validate URL format
    const urlPattern = /^https?:\/\//i;
    if (!urlPattern.test(imageUrl)) {
      this.logger.error('[CREATE_PRODUCT] Validation failed: imageUrl must be a valid URL', imageUrl);
      throw new BadRequestException('Logo sản phẩm phải là URL hợp lệ (bắt đầu với http:// hoặc https://)');
    }

    // Reject any request trying to use ICON for Product
    const visualType = (data.visualType as string) || 'IMAGE';
    this.logger.log('[CREATE_PRODUCT] visualType:', visualType);

    if (visualType !== 'IMAGE') {
      this.logger.error('[CREATE_PRODUCT] Validation failed: visualType must be IMAGE');
      throw new BadRequestException('Sản phẩm chỉ được sử dụng Logo, không hỗ trợ Icon');
    }

    this.logger.log('[CREATE_PRODUCT] All validations passed, creating product...');

    // =============================================================================
    // TRANSACTION WITH RETRY: Handle race condition for code generation
    // =============================================================================
    let result: any;
    let retries = 0;

    while (retries < this.MAX_RETRIES) {
      try {
        result = await this.prisma.$transaction(async (tx) => {
          // 1. Get the latest code within transaction
          const lastProduct = await tx.product.findFirst({
            orderBy: { code: 'desc' },
          });

          // 2. Generate new code
          const lastCode = lastProduct
            ? parseInt(lastProduct.code.replace(this.CODE_PREFIX, ''), 10)
            : 0;
          const newCode = generateNextCode(this.CODE_PREFIX, lastCode);
          this.logger.log('[CREATE_PRODUCT] Generated code:', newCode);

          // 3. Create product WITHIN transaction
          const product = await tx.product.create({
            data: {
              code: newCode,
              name: data.name.trim(),
              unit: data.unit.trim(),
              productType: data.productType as any,
              imageUrl: imageUrl,
              visualType: 'IMAGE',
              isActive: true,
              deletedAt: null,
            },
          });

          return product;
        });

        // Success - break out of retry loop
        this.logger.log('[CREATE_PRODUCT] Product created successfully:', result.id);
        break;

      } catch (error) {
        // Check if it's a unique constraint violation (P2002)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          retries++;
          this.logger.warn(
            `[CREATE_PRODUCT] Duplicate code detected (attempt ${retries}/${this.MAX_RETRIES}), retrying...`
          );

          if (retries >= this.MAX_RETRIES) {
            this.logger.error(
              `[CREATE_PRODUCT] Failed after ${this.MAX_RETRIES} retries`,
              error.message
            );
            throw new ConflictException(
              'Hệ thống đang bận, vui lòng thử lại sau (mã lỗi: CONFLICT_RETRY)'
            );
          }

          // Small delay before retry
          await new Promise((resolve) => setTimeout(resolve, 100));
          continue;
        }

        // Re-throw other errors
        throw error;
      }
    }

    // =============================================================================
    // AUDIT LOG (outside transaction to avoid blocking)
    // =============================================================================
    try {
      await this.auditService.log({
        entity: 'Product',
        entityId: result.id,
        action: 'CREATE',
        beforeJson: null,
        afterJson: result as any,
        userId: userId || 'system',
        userEmail,
      });
    } catch (auditError) {
      // Audit failures should not break the main flow
      this.logger.error('[CREATE_PRODUCT] Audit log failed:', auditError.message);
    }

    return result;
  }

  async update(id: string, data: UpdateProductInput, userId?: string, userEmail?: string) {
    const existing = await this.findOne(id);
    const beforeJson = existing as any;

    if (data.unit && typeof data.unit === 'string' && data.unit.trim() === '') {
      throw new BadRequestException('Đơn vị tính không được để trống');
    }

    // Validate productType if provided
    if (data.productType) {
      const validTypes = ['CEILING_WOOD', 'FURNITURE', 'OTHER_ITEM'];
      if (!validTypes.includes(data.productType as string)) {
        throw new BadRequestException('Loại sản phẩm không hợp lệ');
      }
    }

    // Phase 7.1: Product CHỈ DÙNG LOGO
    // Always force visualType to IMAGE
    const imageUrl = (data.imageUrl as string | undefined) ?? existing.imageUrl;

    if (!imageUrl || imageUrl.trim() === '') {
      throw new BadRequestException('Logo sản phẩm là bắt buộc');
    }

    // CRITICAL: Only update fields that exist in Prisma schema
    // Do NOT spread ...data blindly as it may contain fields not in schema (like iconKey, color)
    const result = await this.prisma.product.update({
      where: { id },
      data: {
        // Only include fields that are provided and exist in schema
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.unit ? { unit: data.unit.trim() } : {}),
        ...(data.productType ? { productType: data.productType as any } : {}),
        visualType: 'IMAGE',
        imageUrl: imageUrl,
      },
    });

    // Audit log for UPDATE
    await this.auditService.log({
      entity: 'Product',
      entityId: result.id,
      action: 'UPDATE',
      beforeJson,
      afterJson: result as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  async delete(id: string, userId?: string, userEmail?: string) {
    const existing = await this.findOne(id);
    const beforeJson = existing as any;

    const result = await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Audit log for DELETE
    await this.auditService.log({
      entity: 'Product',
      entityId: result.id,
      action: 'DELETE',
      beforeJson,
      afterJson: { ...result, deletedAt: result.deletedAt } as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  async restore(id: string, userId?: string, userEmail?: string) {
    const product = await this.prisma.product.findFirst({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    const beforeJson = product as any;
    const result = await this.prisma.product.update({
      where: { id },
      data: { deletedAt: null, isActive: true },
    });

    // Audit log for RESTORE
    await this.auditService.log({
      entity: 'Product',
      entityId: result.id,
      action: 'RESTORE',
      beforeJson,
      afterJson: result as any,
      userId: userId || 'system',
      userEmail,
    });

    return result;
  }

  async seedSampleData() {
    // Updated seed data using productType
    const products = [
      // Trần gỗ (CEILING_WOOD)
      { code: 'SP0001', name: 'Trần gỗ óc chó', unit: 'm2', productType: 'CEILING_WOOD' as const, imageUrl: '/placeholder-product.png' },
      { code: 'SP0002', name: 'Trần gỗ sồi', unit: 'm2', productType: 'CEILING_WOOD' as const, imageUrl: '/placeholder-product.png' },
      { code: 'SP0003', name: 'Trần gỗ tếch', unit: 'm2', productType: 'CEILING_WOOD' as const, imageUrl: '/placeholder-product.png' },
      { code: 'SP0004', name: 'Trần gỗ xoan đào', unit: 'm2', productType: 'CEILING_WOOD' as const, imageUrl: '/placeholder-product.png' },
      { code: 'SP0005', name: 'Trần gỗ cao cấp gõ đỏ', unit: 'm2', productType: 'CEILING_WOOD' as const, imageUrl: '/placeholder-product.png' },
      // Nội thất (FURNITURE)
      { code: 'SP0013', name: 'Bàn gỗ óc chó', unit: 'cái', productType: 'FURNITURE' as const, imageUrl: '/placeholder-product.png' },
      { code: 'SP0014', name: 'Tủ quần áo gỗ sồi', unit: 'cái', productType: 'FURNITURE' as const, imageUrl: '/placeholder-product.png' },
      { code: 'SP0015', name: 'Kệ sách gỗ tếch', unit: 'cái', productType: 'FURNITURE' as const, imageUrl: '/placeholder-product.png' },
      // Hạng mục khác (OTHER_ITEM) - old "phụ kiện" become OTHER_ITEM
      { code: 'SP0006', name: 'Keo dán gỗ chuyên dụng', unit: 'thùng', productType: 'OTHER_ITEM' as const, imageUrl: '/placeholder-product.png' },
      { code: 'SP0007', name: 'Đinh bấm gỗ', unit: 'hộp', productType: 'OTHER_ITEM' as const, imageUrl: '/placeholder-product.png' },
      { code: 'SP0008', name: 'Vít inox 3cm', unit: 'hộp', productType: 'OTHER_ITEM' as const, imageUrl: '/placeholder-product.png' },
      { code: 'SP0009', name: 'Ray trượt ngăn kéo', unit: 'bộ', productType: 'OTHER_ITEM' as const, imageUrl: '/placeholder-product.png' },
      { code: 'SP0010', name: 'Bản lề cửa gỗ', unit: 'cái', productType: 'OTHER_ITEM' as const, imageUrl: '/placeholder-product.png' },
      { code: 'SP0011', name: 'Sơn lót gỗ chống mối', unit: 'thùng', productType: 'OTHER_ITEM' as const, imageUrl: '/placeholder-product.png' },
      { code: 'SP0012', name: 'Sơn bóng gỗ ngoại thất', unit: 'thùng', productType: 'OTHER_ITEM' as const, imageUrl: '/placeholder-product.png' },
    ];

    let createdCount = 0;
    for (const p of products) {
      const existing = await this.prisma.product.findUnique({ where: { code: p.code } });
      if (!existing) {
        await this.prisma.product.create({
          data: {
            ...p,
            visualType: 'IMAGE',
            isActive: true,
            deletedAt: null,
          },
        });
        createdCount++;
      }
    }

    return { message: `Đã tạo ${createdCount} sản phẩm mẫu`, createdCount, total: products.length };
  }
}
