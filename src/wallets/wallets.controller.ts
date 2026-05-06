import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { WalletsService } from './wallets.service';

@ApiTags('Wallets')
@ApiSecurity('x-api-key')
@UseGuards(ApiKeyGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new wallet' })
  @ApiCreatedResponse({ description: 'Wallet registered successfully' })
  @ApiConflictResponse({ description: 'Wallet address already registered' })
  create(@Body() dto: CreateWalletDto) {
    return this.walletsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all registered wallets' })
  @ApiOkResponse({ description: 'Array of wallets' })
  findAll() {
    return this.walletsService.findAll();
  }

  @Get(':address')
  @ApiOperation({ summary: 'Get a wallet and its transactions by address' })
  @ApiOkResponse({ description: 'Wallet with transactions' })
  @ApiNotFoundResponse({ description: 'Wallet not found' })
  findOne(@Param('address') address: string) {
    return this.walletsService.findOne(address);
  }
}
