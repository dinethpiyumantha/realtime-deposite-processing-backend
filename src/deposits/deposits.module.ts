import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { DepositsController } from './deposits.controller';
import { DepositsProcessor } from './deposits.processor';
import { DepositsService, DEPOSIT_QUEUE } from './deposits.service';

@Module({
  imports: [BullModule.registerQueue({ name: DEPOSIT_QUEUE }), HttpModule],
  controllers: [DepositsController],
  providers: [DepositsService, DepositsProcessor],
})
export class DepositsModule {}
