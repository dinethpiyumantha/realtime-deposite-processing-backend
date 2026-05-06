import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class CreateWalletDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_-]{1,100}$/, {
    message: 'address must be alphanumeric (hyphens and underscores allowed)',
  })
  address: string;
}
