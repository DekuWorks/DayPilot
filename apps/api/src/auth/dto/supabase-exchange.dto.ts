import { IsNotEmpty, IsString } from 'class-validator';

export class SupabaseExchangeDto {
  @IsString()
  @IsNotEmpty()
  accessToken!: string;
}
