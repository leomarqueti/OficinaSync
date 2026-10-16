import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { FuelType } from '../fuelType.enum';

export class CreateCarDto {
  @IsString()
  @IsNotEmpty()
  @Length(7, 8)
  plate: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  brand?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1900)
  year?: number;

  @IsOptional()
  @IsEnum(FuelType)
  fuel_type?: FuelType;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  chassis?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  mileage_in?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  client_id?: number;
}
