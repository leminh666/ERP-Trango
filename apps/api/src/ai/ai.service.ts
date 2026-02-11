import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ParseTransactionDto {
  text?: string;
  transcript?: string;
  modeHint?: 'income' | 'expense' | 'auto';
  attachmentUrls?: string[];
  context?: {
    defaultWalletId?: string;
    defaultIncomeCategoryId?: string;
    defaultExpenseCategoryId?: string;
  };
}

export interface ParsedTransaction {
  type: 'INCOME' | 'EXPENSE';
  date: string;
  amount: number;
  walletId?: string;
  incomeCategoryId?: string;
  expenseCategoryId?: string;
  projectId?: string;
  isCommonCost?: boolean;
  note: string;
  confidence: number;
  missingFields: string[];
}

@Injectable()
export class AiService {
  constructor(private prisma: PrismaService) {}

  async parseTransaction(dto: ParseTransactionDto): Promise<ParsedTransaction> {
    const rawText = (dto.text || dto.transcript || '').trim();
    if (!rawText) {
      throw new BadRequestException('text hoặc transcript là bắt buộc');
    }

    const lower = rawText.toLowerCase();

    const result: ParsedTransaction = {
      type: dto.modeHint === 'income' ? 'INCOME' : dto.modeHint === 'expense' ? 'EXPENSE' : 'INCOME',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      note: rawText,
      confidence: 0,
      missingFields: [],
    };

    // 0) Attachments (MVP: append to note)
    if (dto.attachmentUrls?.length) {
      result.note = `${result.note}\n\n[Đính kèm]\n${dto.attachmentUrls.join('\n')}`;
    }

    // 1) Parse amount
    const amountPatterns = [
      /(\d+(?:[.,]\d{1,3})?(?:\s*(?:triệu|million|m))?)\s*(?:vnd|đ)?/gi,
      /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/,
    ];

    for (const pattern of amountPatterns) {
      const match = rawText.match(pattern);
      if (match) {
        let amountStr = (match as any)[1] || match[0];
        amountStr = amountStr.replace(/,/g, '').replace(/\./g, '');

        if (lower.includes('triệu') || lower.includes('million')) {
          result.amount = parseFloat(amountStr) * 1000000;
        } else {
          result.amount = parseFloat(amountStr);
        }
        result.confidence += 30;
        break;
      }
    }

    if (result.amount <= 0) {
      result.missingFields.push('amount');
    }

    // 2) Parse date
    const today = new Date();
    if (lower.includes('hôm nay')) {
      result.date = today.toISOString().split('T')[0];
      result.confidence += 10;
    } else if (lower.includes('hôm qua')) {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      result.date = yesterday.toISOString().split('T')[0];
      result.confidence += 10;
    }

    // 3) Parse transaction type (keyword override, but respect explicit modeHint)
    if (!dto.modeHint || dto.modeHint === 'auto') {
      if (lower.includes('chi') && !lower.includes('thu')) {
        result.type = 'EXPENSE';
        result.confidence += 20;
      } else if (lower.includes('thu')) {
        result.type = 'INCOME';
        result.confidence += 20;
      }
    }

    // 4) Parse common cost
    if (lower.includes('chi phí chung') || lower.includes('chung')) {
      result.isCommonCost = true;
      result.type = 'EXPENSE';
      result.confidence += 15;
    }

    // 5) Parse wallet
    const walletKeywords: Record<string, string[]> = {
      'tiền mặt': ['tiền mặt', 'cash'],
      vcb: ['vcb', 'vietcombank'],
      mb: ['mb', 'military', 'quân đội'],
      bidv: ['bidv'],
      agribank: ['agribank'],
    };

    for (const [walletName, keywords] of Object.entries(walletKeywords)) {
      if (keywords.some((kw) => lower.includes(kw))) {
        const wallet = await this.prisma.wallet.findFirst({
          where: {
            deletedAt: null,
            name: { contains: walletName, mode: 'insensitive' },
          },
        });
        if (wallet) {
          result.walletId = wallet.id;
          result.confidence += 15;
          break;
        }
      }
    }

    // 6) Parse category
    if (result.type === 'INCOME') {
      const incomeKeywords: Record<string, string[]> = {
        'Đặt cọc': ['đặt cọc', 'coc'],
        'Thanh toán': ['thanh toán', 'tt'],
        'Tất toán': ['tất toán', 'quyết toán'],
        'Phí dịch vụ': ['phí dịch vụ', 'fee'],
      };

      for (const [catName, keywords] of Object.entries(incomeKeywords)) {
        if (keywords.some((kw) => lower.includes(kw))) {
          const cat = await this.prisma.incomeCategory.findFirst({
            where: {
              deletedAt: null,
              name: { contains: catName, mode: 'insensitive' },
            },
          });
          if (cat) {
            result.incomeCategoryId = cat.id;
            result.confidence += 15;
            break;
          }
        }
      }
    } else {
      const expenseKeywords: Record<string, string[]> = {
        'Vận chuyển': ['vận chuyển', 'ship', 'giao hàng'],
        'Vật liệu': ['vật liệu', 'vatlieu'],
        'Nhân công': ['nhân công', 'công trình'],
        'Điện nước': ['điện', 'nước'],
        'Sơn': ['sơn', 'son'],
        'Keo': ['keo', 'chất kết dính'],
      };

      for (const [catName, keywords] of Object.entries(expenseKeywords)) {
        if (keywords.some((kw) => lower.includes(kw))) {
          const cat = await this.prisma.expenseCategory.findFirst({
            where: {
              deletedAt: null,
              name: { contains: catName, mode: 'insensitive' },
            },
          });
          if (cat) {
            result.expenseCategoryId = cat.id;
            result.confidence += 15;
            break;
          }
        }
      }
    }

    // 7) Parse project by explicit code/name
    const projectMatch = rawText.match(/(?:đơn|dự án|project)\s*(?:code\s*)?[:\s]*([a-zA-Z0-9-]+)/i);
    if (projectMatch) {
      const projectCodeOrName = projectMatch[1];
      const project = await this.prisma.project.findFirst({
        where: {
          deletedAt: null,
          OR: [
            { code: { equals: projectCodeOrName, mode: 'insensitive' } },
            { name: { contains: projectCodeOrName, mode: 'insensitive' } },
          ],
        },
      });
      if (project) {
        result.projectId = project.id;
        result.isCommonCost = false;
        result.confidence += 10;
      }
    }

    // 8) Parse project from customer code KHxxxx
    const customerMatch = rawText.match(/(?:khách|kh)\s*([0-9]{4})/i);
    if (customerMatch) {
      const customerCode = `KH${customerMatch[1]}`;
      const customer = await this.prisma.customer.findUnique({
        where: { code: customerCode },
      });

      if (customer) {
        const project = await this.prisma.project.findFirst({
          where: {
            deletedAt: null,
            customerId: customer.id,
          },
          orderBy: { updatedAt: 'desc' },
        });

        if (project) {
          result.projectId = project.id;
          result.isCommonCost = false;
          result.confidence += 10;
        }
      }
    }

    // Apply context defaults
    if (dto.context?.defaultWalletId && !result.walletId) {
      result.walletId = dto.context.defaultWalletId;
    }
    if (result.type === 'INCOME' && dto.context?.defaultIncomeCategoryId && !result.incomeCategoryId) {
      result.incomeCategoryId = dto.context.defaultIncomeCategoryId;
    }
    if (result.type === 'EXPENSE' && dto.context?.defaultExpenseCategoryId && !result.expenseCategoryId) {
      result.expenseCategoryId = dto.context.defaultExpenseCategoryId;
    }

    // Missing fields enforce (Phase 18 rules)
    if (!result.walletId) {
      result.missingFields.push('walletId');
    }

    if (result.type === 'INCOME') {
      if (!result.incomeCategoryId) {
        result.missingFields.push('incomeCategoryId');
      }
    } else {
      if (!result.expenseCategoryId) {
        result.missingFields.push('expenseCategoryId');
      }
      if (!result.projectId && result.isCommonCost !== true) {
        result.missingFields.push('projectId_or_isCommonCost');
      }
    }

    // Cap confidence at 100
    result.confidence = Math.min(result.confidence, 100);

    return result;
  }
}
