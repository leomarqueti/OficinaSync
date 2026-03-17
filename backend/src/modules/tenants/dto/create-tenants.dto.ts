/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  IsDefined,
  IsString,
  IsNumberString,
  IsNotEmpty,
  IsPhoneNumber,
} from 'class-validator';
import { IsCNPJ } from 'validation-br';

//Esse dto serve para criar um tenant
export class CreateTenantDto {
  //Somente o nome, nada de mais aqui
  @IsString()
  @IsDefined()
  name: string;

  //aqui usamos uma biblioteca de validação do brasil para o cnpj
  @IsNotEmpty()
  @IsNumberString()
  @IsCNPJ({ message: 'CNPJ invalido' })
  cnpj: string;

  //O no phonenumber passamos a regiao br
  @IsPhoneNumber('BR')
  @IsNotEmpty()
  phone: string;
}
