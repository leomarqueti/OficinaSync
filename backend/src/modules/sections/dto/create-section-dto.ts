import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { SectionType } from '../typeSection.enum';

export class CreateSectionDto {
  @Type(() => Number)
  @IsInt()
  service_order_id: number;

  @IsEnum(SectionType)
  type: SectionType;

  @IsOptional()
  @IsString()
  notes?: string;
}
