import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class JoinWaitlistDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsIn(['team', 'enterprise'])
  requestedPlan!: 'team' | 'enterprise';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  teamSize?: string;

  /** Stored only when the person checks the box. Never implied. */
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;
}
