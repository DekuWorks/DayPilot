import { IsOptional, IsString, MinLength } from 'class-validator';

/** Graph tokens from Supabase Azure SSO (`provider_token`). */
export class ImportOutlookTokenDto {
  @IsString()
  @MinLength(20)
  accessToken!: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  expiresIn?: number;
}
