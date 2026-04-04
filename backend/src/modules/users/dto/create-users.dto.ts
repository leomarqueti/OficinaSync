import {
  IsEmail,
  IsString,
  IsStrongPassword,
  MaxLength,
} from 'class-validator';

// Dto para criar o user
export class CreateUserDto {
  @IsString()
  @MaxLength(100)
  name: string;

  //Vamos tratar o email
  @IsString()
  @MaxLength(150)
  @IsEmail()
  email: string;

  @IsStrongPassword()
  @IsString()
  password: string;
}
