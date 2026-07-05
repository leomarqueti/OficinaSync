import { IsString, IsStrongPassword, MaxLength } from 'class-validator';

export class AcceptInviteDto {
  @IsString()
  token: string;

  @IsString()
  @MaxLength(100)
  name: string;

  @IsStrongPassword()
  @IsString()
  password: string;
}
