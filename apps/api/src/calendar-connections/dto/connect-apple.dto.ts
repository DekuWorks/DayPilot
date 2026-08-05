import { IsEmail, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

/** iCloud CalDAV: Apple ID email + app-specific password (not Sign in with Apple). */
export class ConnectAppleDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  appleId!: string;

  /** Spaces/hyphens OK — Nest normalises before CalDAV. Never log this field. */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(8, { message: 'App-specific password is required' })
  appSpecificPassword!: string;
}
