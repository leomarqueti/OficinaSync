import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateServiceOrderDto {
  @Type(() => Number)
  @IsInt()
  car_id: number;

  @IsString()
  @MaxLength(500)
  client_complaint: string;

  // KM do veículo nessa visita específica — independente do mileage_in do
  // cadastro do carro (que só reflete a primeira entrada). Opcional pra não
  // quebrar nenhum fluxo existente que não envia esse campo.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mileage_in?: number;
}
