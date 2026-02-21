import { IsString, IsOptional, IsDateString, MinLength } from 'class-validator';

export class UpdateEventDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  title?: string;

  @IsDateString()
  @IsOptional()
  start?: string;

  @IsDateString()
  @IsOptional()
  end?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  location?: string;
}
