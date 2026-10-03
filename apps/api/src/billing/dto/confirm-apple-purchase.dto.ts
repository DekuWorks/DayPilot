import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmApplePurchaseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  productId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  transactionId!: string;

  /** StoreKit 2 signed transaction (JWS). Required in production. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  signedTransaction?: string;
}
