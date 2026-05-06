import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({
    example: 'wallet-abc123',
    description:
      'Unique wallet address (alphanumeric, hyphens and underscores allowed)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]{1,100}$/, {
    message: 'address must be alphanumeric (hyphens and underscores allowed)',
  })
  address: string;
}
