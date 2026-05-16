import { IsString, MinLength, MaxLength, IsEmail } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;
}

export class LoginDto {
  @IsString()
  username: string;

  @IsString()
  password: string;
}
