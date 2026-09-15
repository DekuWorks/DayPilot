import { IsIn, IsString } from 'class-validator';

/** Body for DELETE /auth/me — typed confirmation avoids accidental deletes. */
export class DeleteAccountDto {
  @IsString()
  @IsIn(['DELETE'])
  confirm!: 'DELETE';
}
