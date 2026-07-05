import { IsString, IsStrongPassword } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  current_password: string;

  @IsStrongPassword()
  @IsString()
  new_password: string;
}
