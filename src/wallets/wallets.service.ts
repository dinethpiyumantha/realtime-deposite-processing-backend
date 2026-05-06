import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWalletDto } from './dto/create-wallet.dto';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWalletDto) {
    try {
      const wallet = await this.prisma.wallet.create({
        data: { address: dto.address },
      });
      this.logger.log(`Wallet registered: ${wallet.address}`);
      return wallet;
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError.code === 'P2002') {
        throw new ConflictException(
          `Wallet address '${dto.address}' is already registered`,
        );
      }
      throw error;
    }
  }

  async findAll() {
    return this.prisma.wallet.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(address: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { address },
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
    });
    if (!wallet) {
      throw new NotFoundException(`Wallet '${address}' not found`);
    }
    return wallet;
  }
}
