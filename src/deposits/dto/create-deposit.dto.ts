import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDepositDto {
  @ApiProperty({
    example: 'wallet-abc123',
    description: 'Registered wallet address',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({
    example: '0xabc123def456',
    description: 'Unique on-chain transaction hash',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  transactionHash: string;

  @ApiProperty({
    example: 1.5,
    description: 'Deposit amount (up to 8 decimal places)',
  })
  @IsNumber({ maxDecimalPlaces: 8 })
  @IsPositive()
  @Type(() => Number)
  amount: number;
}
