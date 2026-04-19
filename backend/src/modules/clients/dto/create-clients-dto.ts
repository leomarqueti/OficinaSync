import { IsEmail, IsPhoneNumber, IsString, MaxLength } from 'class-validator';
import { IsCPF } from 'class-validator-cpf';

export class CreateClientDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(20)
  @IsPhoneNumber()
  phone: string;

  @IsString()
  @MaxLength(150)
  @IsEmail()
  email: string;

  @IsCPF({ message: 'Invalid CPF number' })
  cpf: string;

  @IsString()
  @MaxLength(200)
  address: string;
}
