import { IsString, IsStrongPassword } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsStrongPassword()
  @IsString()
  new_password: string;
}
