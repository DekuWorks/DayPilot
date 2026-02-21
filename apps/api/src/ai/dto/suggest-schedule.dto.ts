import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class SuggestScheduleDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  prompt: string;
}
