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
   * StoreKit original transaction id. Renewals and restores reuse it so a
   * founding spot is not consumed twice. Falls back to transactionId.
   */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  originalTransactionId?: string;
}
