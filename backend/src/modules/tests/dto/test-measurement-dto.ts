import { IsOptional, IsString } from 'class-validator';

export class TestMeasurementDto {
  @IsString()
  label: string;

  @IsOptional()
  @IsString()
  expected?: string;

  @IsString()
  actual: string;
}
