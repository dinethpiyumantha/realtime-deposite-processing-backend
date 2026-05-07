import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { DepositsService } from './deposits.service';

@ApiTags('Deposits')
@ApiSecurity('x-api-key')
@UseGuards(ApiKeyGuard)
@Controller('deposits')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  /**
   * Accepts a deposit payload and returns the ingestion result.
   * @param dto Deposit request payload.
   * @returns An object containing idempotency status and the transaction record.
   */
  @Post()
  @ApiOperation({
    summary: 'Ingest a deposit',
    description:
      'Idempotent endpoint — duplicate `transactionHash` values are silently ignored. ' +
      'The deposit is saved as PENDING and processed asynchronously via a BullMQ worker.',
  })
  @ApiCreatedResponse({
    description: 'Deposit accepted (new or duplicate idempotent)',
  })
  @ApiBadRequestResponse({
    description: 'Wallet not registered or invalid payload',
  })
  ingest(@Body() dto: CreateDepositDto) {
    return this.depositsService.ingest(dto);
  }
}
