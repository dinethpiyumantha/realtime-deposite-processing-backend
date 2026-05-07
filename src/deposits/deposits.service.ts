import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepositDto } from './dto/create-deposit.dto';

export const DEPOSIT_QUEUE = 'deposit-processing';
export const DEPOSIT_PROCESS_JOB = 'process';

@Injectable()
export class DepositsService {
  private readonly logger = new Logger(DepositsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(DEPOSIT_QUEUE) private readonly depositQueue: Queue,
  ) {}

  /**
   * Validates and stores a deposit request, then queues it for async processing.
   * @param dto Deposit payload containing wallet address, hash, and amount.
   * @returns An object containing `idempotent` and the matching transaction.
   */
  async ingest(dto: CreateDepositDto) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { address: dto.walletAddress },
    });
    if (!wallet) {
      throw new BadRequestException(
        `Wallet '${dto.walletAddress}' is not registered`,
      );
    }

    const existing = await this.prisma.transaction.findUnique({
      where: { transactionHash: dto.transactionHash },
    });
    if (existing) {
      this.logger.log(
        `Duplicate deposit ignored (idempotent): ${dto.transactionHash}`,
      );
      return { idempotent: true, transaction: existing };
    }

    const txRecord = await this.prisma.transaction.create({
      data: {
        walletAddress: dto.walletAddress,
        transactionHash: dto.transactionHash,
        amount: dto.amount,
      },
    });

    this.logger.log(`Deposit ingested: ${dto.transactionHash}`);

    await this.depositQueue.add(
      DEPOSIT_PROCESS_JOB,
      { transactionId: txRecord.id },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    );

    return { idempotent: false, transaction: txRecord };
  }
}
