import { HttpService } from '@nestjs/axios';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Prisma, Transaction } from '@prisma/client';
import { Job } from 'bullmq';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { DepositUpdatesGateway } from './deposit-updates.gateway';
import { DEPOSIT_QUEUE } from './deposits.service';

type ProcessJobData = { transactionId: string };

const MAX_CALLBACK_RETRIES = 3;

@Processor(DEPOSIT_QUEUE)
export class DepositsProcessor extends WorkerHost {
  private readonly logger = new Logger(DepositsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly depositUpdatesGateway: DepositUpdatesGateway,
  ) {
    super();
  }

  /**
   * Processes queued deposit jobs and transitions transactions to PROCESSED.
   * @param job Queue job containing the transaction identifier.
   * @returns A promise that resolves after processing and callback handling complete.
   */
  async process(job: Job<ProcessJobData>): Promise<void> {
    const { transactionId } = job.data;

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
    this.depositUpdatesGateway.emitTransactionProcessed(updated);

    await this.sendCallbackWithRetry(updated);
  }

  /**
   * Sends the callback payload with exponential-backoff retry behavior.
   * @param txRecord Processed transaction to send to the callback endpoint.
   * @returns A promise that resolves after callback success or final failure handling.
   */
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
        return;
      } catch (error: unknown) {
        lastError = error as Error;
        if (attempt < MAX_CALLBACK_RETRIES) {
          const delay = Math.pow(2, attempt) * 1000;
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

    this.depositUpdatesGateway.emitCallbackFailed(
      txRecord,
      lastError?.message ?? 'Unknown callback error',
    );
  }
}
