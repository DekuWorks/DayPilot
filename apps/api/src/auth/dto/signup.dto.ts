import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  firstName: string;

  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}
