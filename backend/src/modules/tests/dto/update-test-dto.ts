import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Verdict } from '../verdict.enum';
import { TestTypeCategory } from '../testType.enum';
import { TestMeasurementDto } from './test-measurement-dto';

export class UpdateTestDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TestMeasurementDto)
  measurements?: TestMeasurementDto[];

  @IsOptional()
  @IsEnum(TestTypeCategory)
  test_type?: TestTypeCategory;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsEnum(Verdict)
  verdict?: Verdict;

  @IsOptional()
  @IsString()
  notes?: string;
}
