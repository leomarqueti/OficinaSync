import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class SetResponsibleDto {
  @Type(() => Number)
  @IsInt()
  user_id: number;
}
