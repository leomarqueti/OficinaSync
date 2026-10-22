import { IsEmail, IsIn, IsOptional, IsPhoneNumber, IsString, MaxLength } from 'class-validator';
import { Role } from '../../users/role.enum';

/** Convite por e-mail (como antes) OU por celular (WhatsApp/QR + PIN). Com celular, o nome é obrigatório. */
export class CreateInviteDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @IsIn([Role.MECHANIC, Role.RECEPTIONIST])
  role: Role;
}
