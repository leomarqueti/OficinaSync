import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsString, Length } from 'class-validator';
import { FuelType } from '../fuelType.enum';

export class CreateCarDto {
  @IsString()
  @IsNotEmpty()
  @Length(7, 8)
  plate: string;

  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @Type(() => Number)
  @IsInt()
  year: number;

  @IsEnum(FuelType)
  fuel_type: FuelType;

  @IsString()
  @IsNotEmpty()
  chassis: string;

  @IsString()
  @IsNotEmpty()
  color: string;

  @Type(() => Number)
  @IsInt()
  mileage_in: number;

  @Type(() => Number)
  @IsInt()
  client_id: number;
}
