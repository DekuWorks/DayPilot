import { IsNotEmpty, IsString } from 'class-validator';

export class MergeDuplicateDto {
  @IsString()
  @IsNotEmpty()
  donorAccessToken!: string;
}
