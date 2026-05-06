import { Logger } from '@nestjs/common';
import { Transaction } from '@prisma/client';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/deposits',
  cors: { origin: '*' },
})
export class DepositUpdatesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(DepositUpdatesGateway.name);

  @WebSocketServer()
  private server: Server;

  handleConnection(client: Socket): void {
    this.logger.log(`Socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe.wallet')
  subscribeWallet(
    @ConnectedSocket() client: Socket,
    walletAddress: string,
  ): { ok: boolean; room: string } {
    const room = this.walletRoom(walletAddress);
    client.join(room);
    return { ok: true, room };
  }

  emitTransactionProcessed(transaction: Transaction): void {
    const payload = {
      id: transaction.id,
      walletAddress: transaction.walletAddress,
      transactionHash: transaction.transactionHash,
      amount: transaction.amount.toString(),
      status: transaction.status,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };

    this.server.emit('deposit.processed', payload);
    this.server
      .to(this.walletRoom(transaction.walletAddress))
      .emit('deposit.processed', payload);
  }

  emitCallbackFailed(transaction: Transaction, reason: string): void {
    const payload = {
      walletAddress: transaction.walletAddress,
      transactionHash: transaction.transactionHash,
      status: transaction.status,
      reason,
      updatedAt: transaction.updatedAt,
    };

    this.server.emit('deposit.callback_failed', payload);
    this.server
      .to(this.walletRoom(transaction.walletAddress))
      .emit('deposit.callback_failed', payload);
  }

  private walletRoom(walletAddress: string): string {
    return `wallet:${walletAddress}`;
  }
}
