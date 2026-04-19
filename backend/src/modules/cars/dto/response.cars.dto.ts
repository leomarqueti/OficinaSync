import { Expose } from 'class-transformer';
import { FuelType } from '../fuelType.enum';

export class ResponseCarDto {
  @Expose()
  car_id: number;

  @Expose()
  plate: string;

  @Expose()
  brand: string;

  @Expose()
  model: string;

  @Expose()
  year: number;

  @Expose()
  fuel_type: FuelType;

  @Expose()
  chassis: string;

  @Expose()
  color: string;

  @Expose()
  mileage_in: number;

  @Expose()
  created_at: Date;
}
