import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ConfirmApplePurchaseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  productId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  transactionId!: string;
}
