import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class CaptureObdDto {
  @Type(() => Number)
  @IsInt()
  device_id: number;

  @Type(() => Number)
  @IsInt()
  service_order_id: number;
}
