import { HttpService } from '@nestjs/axios';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Prisma, Transaction } from '@prisma/client';
import { Job } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { DEPOSIT_QUEUE } from './deposits.service';

type ProcessJobData = { transactionId: string };

const MAX_CALLBACK_RETRIES = 3;

@Processor(DEPOSIT_QUEUE)
export class DepositsProcessor extends WorkerHost {
  private readonly logger = new Logger(DepositsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  async process(job: Job<ProcessJobData>): Promise<void> {
    const { transactionId } = job.data;

    // Use a serializable transaction to prevent concurrent processing of the
    // same record (guards against retried jobs or race conditions).
    const updated = await this.prisma.$transaction(
      async (tx) => {
        const found = await tx.transaction.findUnique({
          where: { id: transactionId },
        });

        if (!found) {
          this.logger.warn(`Transaction ${transactionId} not found — skipping`);
          return null;
        }

        if (found.status !== 'PENDING') {
          this.logger.warn(
            `Transaction ${transactionId} is already ${found.status} — skipping`,
          );
          return null;
        }

        // Simulate processing work
        await new Promise((resolve) => setTimeout(resolve, 500));

        return tx.transaction.update({
          where: { id: transactionId },
          data: { status: 'PROCESSED' },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (!updated) return;

    this.logger.log(`Processing success: ${updated.transactionHash}`);

    await this.sendCallbackWithRetry(updated);
  }

  private async sendCallbackWithRetry(txRecord: Transaction): Promise<void> {
    const callbackUrl =
      process.env.CALLBACK_URL ?? 'https://example.com/webhook';

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= MAX_CALLBACK_RETRIES; attempt++) {
      try {
        await firstValueFrom(
          this.httpService.post(
            callbackUrl,
            {
              walletAddress: txRecord.walletAddress,
              amount: txRecord.amount.toString(),
              transactionHash: txRecord.transactionHash,
            },
            { timeout: 5000 },
          ),
        );
        return; // success
      } catch (error: unknown) {
        lastError = error as Error;
        if (attempt < MAX_CALLBACK_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
          this.logger.warn(
            `Callback failed (attempt ${attempt}/${MAX_CALLBACK_RETRIES}), ` +
              `retrying in ${delay}ms — ${txRecord.transactionHash}`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    this.logger.error(
      `Callback failed after ${MAX_CALLBACK_RETRIES} attempts ` +
        `for ${txRecord.transactionHash}: ${lastError?.message}`,
    );
  }
}
