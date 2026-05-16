import { IsString, IsInt, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateServerDto {
  @IsString() @MinLength(1) @MaxLength(100)
  name: string;

  @IsString()
  host: string;

  @IsInt()
  port: number;

  @IsString()
  sshUsername: string;

  @IsString()
  authType: string;

  @IsOptional() @IsString()
  sshPassword?: string;

  @IsOptional() @IsString()
  sshKey?: string;
}

export class UpdateServerDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(100)
  name?: string;

  @IsOptional() @IsString()
  host?: string;

  @IsOptional() @IsInt()
  port?: number;

  @IsOptional() @IsString()
  sshUsername?: string;

  @IsOptional() @IsString()
  authType?: string;

  @IsOptional() @IsString()
  sshPassword?: string;

  @IsOptional() @IsString()
  sshKey?: string;
}
