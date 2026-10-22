import { IsInt, IsPositive } from 'class-validator';

export class AccessLinkDto {
  @IsInt()
  @IsPositive()
  user_id: number;
}
