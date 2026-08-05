import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class DeviceEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  externalId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  location?: string;

  @IsOptional()
  @IsBoolean()
  allDay?: boolean;
}

/** Events read on-device via EventKit (iOS) — no CalDAV / app-specific password. */
export class ImportDeviceEventsDto {
  @IsOptional()
  @IsString()
  @MaxLength(320)
  deviceLabel?: string;

  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => DeviceEventDto)
  events!: DeviceEventDto[];
}
