import { IsEmail, IsString, MinLength } from 'class-validator';

/** iCloud CalDAV: Apple ID email + app-specific password (not Sign in with Apple). */
export class ConnectAppleDto {
  @IsEmail()
  appleId!: string;

  @IsString()
  @MinLength(8, { message: 'App-specific password is required' })
  appSpecificPassword!: string;
}
