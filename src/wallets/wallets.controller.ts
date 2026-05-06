import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { WalletsService } from './wallets.service';

@UseGuards(ApiKeyGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  create(@Body() dto: CreateWalletDto) {
    return this.walletsService.create(dto);
  }

  @Get()
  findAll() {
    return this.walletsService.findAll();
  }

  @Get(':address')
  findOne(@Param('address') address: string) {
    return this.walletsService.findOne(address);
  }
}
