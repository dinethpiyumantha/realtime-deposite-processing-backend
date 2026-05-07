import { BadRequestException } from '@nestjs/common';
import { DepositsService, DEPOSIT_PROCESS_JOB } from './deposits.service';

describe('DepositsService', () => {
  const prisma = {
    wallet: {
      findUnique: jest.fn(),
    },
    transaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const depositQueue = {
    add: jest.fn(),
  };

  let service: DepositsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DepositsService(prisma as never, depositQueue as never);
  });

  const dto = {
    walletAddress: 'wallet-1',
    transactionHash: '0xabc123',
    amount: 10.5,
  };

  it('throws BadRequestException when wallet is not registered', async () => {
    prisma.wallet.findUnique.mockResolvedValue(null);

    await expect(service.ingest(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.transaction.findUnique).not.toHaveBeenCalled();
    expect(depositQueue.add).not.toHaveBeenCalled();
  });

  it('returns idempotent response when transaction hash already exists', async () => {
    const existingTx = {
      id: 'tx-existing',
      transactionHash: dto.transactionHash,
      walletAddress: dto.walletAddress,
      amount: dto.amount,
      status: 'PENDING',
    };

    prisma.wallet.findUnique.mockResolvedValue({ address: dto.walletAddress });
    prisma.transaction.findUnique.mockResolvedValue(existingTx);

    const result = await service.ingest(dto);

    expect(result).toEqual({ idempotent: true, transaction: existingTx });
    expect(prisma.transaction.create).not.toHaveBeenCalled();
    expect(depositQueue.add).not.toHaveBeenCalled();
  });

  it('creates a transaction and enqueues a processing job', async () => {
    const createdTx = {
      id: 'tx-new',
      transactionHash: dto.transactionHash,
      walletAddress: dto.walletAddress,
      amount: dto.amount,
      status: 'PENDING',
    };

    prisma.wallet.findUnique.mockResolvedValue({ address: dto.walletAddress });
    prisma.transaction.findUnique.mockResolvedValue(null);
    prisma.transaction.create.mockResolvedValue(createdTx);
    depositQueue.add.mockResolvedValue(undefined);

    const result = await service.ingest(dto);

    expect(prisma.transaction.create).toHaveBeenCalledWith({
      data: {
        walletAddress: dto.walletAddress,
        transactionHash: dto.transactionHash,
        amount: dto.amount,
      },
    });
    expect(depositQueue.add).toHaveBeenCalledWith(
      DEPOSIT_PROCESS_JOB,
      { transactionId: 'tx-new' },
      { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
    );
    expect(result).toEqual({ idempotent: false, transaction: createdTx });
  });
});
