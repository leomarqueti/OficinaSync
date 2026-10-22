import { IsOptional, IsString, IsStrongPassword, Matches, MaxLength } from 'class-validator';

/** Convite por e-mail aceita com senha; por celular (ou "novo acesso") aceita com PIN de 6 dígitos. */
export class AcceptInviteDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsStrongPassword()
  @IsString()
  password?: string;

  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'O PIN tem 6 números.' })
  pin?: string;
}
