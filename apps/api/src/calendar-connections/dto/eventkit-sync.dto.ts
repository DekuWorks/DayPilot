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

export class EventKitCalendarDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  externalCalendarId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  calendarType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sourceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  color?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isReadOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  isSelected?: boolean;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;
}

export class EventKitEventDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  externalEventId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(512)
  externalCalendarId!: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(120)
  timezone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  recurrenceRule?: string;

  @IsOptional()
  @IsDateString()
  sourceUpdatedAt?: string;
}

export class EventKitSyncDto {
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  deviceId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  deviceLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  calendarStatus?: string;

  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => EventKitCalendarDto)
  calendars!: EventKitCalendarDto[];

  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => EventKitEventDto)
  events!: EventKitEventDto[];

  @IsOptional()
  @IsBoolean()
  reconcileDeletes?: boolean;

  @IsOptional()
  @IsDateString()
  rangeStart?: string;

  @IsOptional()
  @IsDateString()
  rangeEnd?: string;
}

export class PatchExternalCalendarsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventKitCalendarDto)
  calendars!: EventKitCalendarDto[];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;
}

export class DisconnectEventKitDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceId?: string;

  @IsOptional()
  @IsBoolean()
  keepEvents?: boolean;
}
