import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  SUGGESTION_CATEGORIES,
  SUGGESTION_STATUSES,
} from '../suggestion-rules';

export class CreateSuggestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  description!: string;

  @IsIn([...SUGGESTION_CATEGORIES])
  category!: (typeof SUGGESTION_CATEGORIES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  featureKey?: string;
}

export class SuggestionMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

export class AttachmentDto {
  @IsString()
  @MaxLength(180)
  fileName!: string;

  @IsString()
  @MaxLength(80)
  mimeType!: string;

  @IsString()
  @MaxLength(3_000_000)
  dataBase64!: string;
}

export class UpdateStatusDto {
  @IsIn([...SUGGESTION_STATUSES])
  status!: (typeof SUGGESTION_STATUSES)[number];
}

export class NotificationPrefsDto {
  @IsOptional()
  @IsBoolean()
  inApp?: boolean;

  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @IsOptional()
  @IsBoolean()
  email?: boolean;
}

export class RegisterDeviceDto {
  @IsString()
  @MinLength(8)
  @MaxLength(4096)
  token!: string;

  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';

  /** fcm is the Firebase token the app already collects. apns is a raw device token. */
  @IsOptional()
  @IsIn(['fcm', 'apns'])
  provider?: 'fcm' | 'apns';
}

export class BetaEnabledDto {
  @IsBoolean()
  enabled!: boolean;
}
