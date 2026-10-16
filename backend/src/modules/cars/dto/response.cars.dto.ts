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
  brand: string | null;

  @Expose()
  model: string | null;

  @Expose()
  year: number | null;

  @Expose()
  fuel_type: FuelType | null;

  @Expose()
  chassis: string | null;

  @Expose()
  color: string | null;

  @Expose()
  mileage_in: number | null;

  @Expose()
  created_at: Date;
}
