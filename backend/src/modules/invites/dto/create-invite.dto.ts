import { IsEmail, IsIn, IsString } from 'class-validator';
import { Role } from '../../users/role.enum';

export class CreateInviteDto {
  @IsString()
  @IsEmail()
  email: string;

  @IsIn([Role.MECHANIC, Role.RECEPTIONIST])
  role: Role;
}
