import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { MediaType } from '../mediaType.enum';

export class CreateMediaDto {
  @Type(() => Number)
  @IsInt()
  section_id: number;

  @IsEnum(MediaType)
  type: MediaType;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  label?: string;
}
