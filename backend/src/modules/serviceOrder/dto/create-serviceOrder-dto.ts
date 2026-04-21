import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength } from 'class-validator';

export class CreateServiceOrderDto {
  @Type(() => Number)
  @IsInt()
  car_id: number;

  @IsString()
  @MaxLength(500)
  client_complaint: string;
}
