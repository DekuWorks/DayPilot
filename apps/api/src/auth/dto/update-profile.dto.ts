import { IsOptional, IsUrl, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @ValidateIf((_o, v) => v != null && v !== '')
  @IsUrl({}, { message: 'avatarUrl must be a valid URL' })
  avatarUrl?: string | null;
}
