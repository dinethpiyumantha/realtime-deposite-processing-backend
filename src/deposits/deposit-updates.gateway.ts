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
  private server!: Server;

  /**
   * Logs client connections to the deposits namespace.
   * @param client Connected socket client.
   * @returns Nothing.
   */
  handleConnection(client: Socket): void {
    this.logger.log(`Socket connected: ${client.id}`);
  }

  /**
   * Logs client disconnect events from the deposits namespace.
   * @param client Disconnected socket client.
   * @returns Nothing.
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe.wallet')
  /**
   * Subscribes a client to wallet-specific realtime update rooms.
   * @param client Active socket client.
   * @param walletAddress Wallet address used to derive the room name.
   * @returns Subscription status with the room identifier.
   */
  subscribeWallet(
    @ConnectedSocket() client: Socket,
    walletAddress: string,
  ): { ok: boolean; room: string } {
    const room = this.walletRoom(walletAddress);
    void client.join(room);
    return { ok: true, room };
  }

  /**
   * Broadcasts a successful transaction processing event.
   * @param transaction Processed transaction model.
   * @returns Nothing.
   */
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

  /**
   * Broadcasts callback delivery failures for a transaction.
   * @param transaction Transaction related to the failed callback.
   * @param reason Failure reason to include in the event payload.
   * @returns Nothing.
   */
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

  /**
   * Builds a deterministic Socket.IO room name for a wallet address.
   * @param walletAddress Wallet address string.
   * @returns Room name in `wallet:<address>` format.
   */
  private walletRoom(walletAddress: string): string {
    return `wallet:${walletAddress}`;
  }
}
