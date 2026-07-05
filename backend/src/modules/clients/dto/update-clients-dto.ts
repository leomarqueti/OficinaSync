import { IsEmail, IsOptional, IsPhoneNumber, IsString, MaxLength } from 'class-validator';
import { IsCPF } from 'class-validator-cpf';

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsCPF({ message: 'Invalid CPF number' })
  cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;
}
