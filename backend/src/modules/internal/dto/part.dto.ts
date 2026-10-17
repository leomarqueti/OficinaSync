import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const QTY = { maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false } as const;

export class CreatePartDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  code?: string;

  @Type(() => Number)
  @IsNumber(QTY)
  @Min(0)
  @Max(100000)
  taken_quantity: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(QTY)
  @Min(0)
  @Max(100000)
  used_quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(QTY)
  @Min(0)
  @Max(10000000)
  unit_price?: number;
}

/** No PATCH, `null` em code/used_quantity/unit_price LIMPA o campo (@IsOptional deixa null passar). */
export class UpdatePartDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  code?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(QTY)
  @Min(0)
  @Max(100000)
  taken_quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(QTY)
  @Min(0)
  @Max(100000)
  used_quantity?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(QTY)
  @Min(0)
  @Max(10000000)
  unit_price?: number | null;
}
