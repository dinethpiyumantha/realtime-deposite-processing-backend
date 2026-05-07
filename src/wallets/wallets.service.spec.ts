import { ConflictException, NotFoundException } from '@nestjs/common';
import { WalletsService } from './wallets.service';

describe('WalletsService', () => {
  const prisma = {
    wallet: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  let service: WalletsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WalletsService(prisma as never);
  });

  it('creates a wallet', async () => {
    const wallet = { address: 'wallet-1', createdAt: new Date() };
    prisma.wallet.create.mockResolvedValue(wallet);

    const result = await service.create({ address: 'wallet-1' });

    expect(prisma.wallet.create).toHaveBeenCalledWith({
      data: { address: 'wallet-1' },
    });
    expect(result).toEqual(wallet);
  });

  it('throws ConflictException on duplicate wallet address', async () => {
    prisma.wallet.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create({ address: 'wallet-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns all wallets sorted by newest first', async () => {
    const wallets = [{ address: 'wallet-2' }, { address: 'wallet-1' }];
    prisma.wallet.findMany.mockResolvedValue(wallets);

    const result = await service.findAll();

    expect(prisma.wallet.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(wallets);
  });

  it('returns wallet with transactions by address', async () => {
    const wallet = {
      address: 'wallet-1',
      transactions: [{ id: 'tx-1' }],
    };
    prisma.wallet.findUnique.mockResolvedValue(wallet);

    const result = await service.findOne('wallet-1');

    expect(prisma.wallet.findUnique).toHaveBeenCalledWith({
      where: { address: 'wallet-1' },
      include: { transactions: { orderBy: { createdAt: 'desc' } } },
    });
    expect(result).toEqual(wallet);
  });

  it('throws NotFoundException when wallet does not exist', async () => {
    prisma.wallet.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing-wallet')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
