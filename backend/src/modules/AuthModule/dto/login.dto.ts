/* eslint-disable prettier/prettier */
import { IsEmail } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  password: string;
}
