import { Expose, Transform } from 'class-transformer';
import { FuelType } from '../fuelType.enum';

export class ResponseCarDto {
  @Expose()
  car_id: number;

  // { toClassOnly: true } evita que o ClassSerializerInterceptor global rode o
  // @Transform de novo no segundo passe (quando `obj` já é o DTO, sem `.client`).
  @Expose()
  @Transform(({ obj }) => obj.client?.client_id ?? null, { toClassOnly: true })
  client_id: number | null;

  @Expose()
  @Transform(({ obj }) => obj.client?.name ?? null, { toClassOnly: true })
  client_name: string | null;

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
