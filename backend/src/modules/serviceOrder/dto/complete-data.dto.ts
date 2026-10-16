import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsCPF } from 'class-validator-cpf';
import { FuelType } from '../../cars/fuelType.enum';

export class CompleteClientDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @IsPhoneNumber()
  phone?: string;

  @IsOptional()
  @IsCPF({ message: 'Invalid CPF number' })
  cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @IsEmail()
  email?: string;
}

export class CompleteCarDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
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
  @MaxLength(100)
  color?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  chassis?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  mileage_in?: number;
}

export class CompleteDataDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  client_id?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CompleteClientDto)
  client?: CompleteClientDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CompleteCarDto)
  car?: CompleteCarDto;
}
