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

  /**
   * StoreKit original transaction id. Renewals reuse it so a founding spot
   * is not consumed twice. The signed transaction is authoritative when present.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  originalTransactionId?: string;

  /** StoreKit 2 signed transaction (JWS). Required in production. */
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  signedTransaction?: string;
}
