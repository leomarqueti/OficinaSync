import { IsEnum, IsOptional, IsString } from 'class-validator';
import { FinalVerdict } from '../finalVerdict.enum';

export class FinishServiceOrderDto {
  @IsOptional()
  @IsString()
  root_cause?: string;

  @IsOptional()
  @IsString()
  conclusion?: string;

  @IsOptional()
  @IsEnum(FinalVerdict)
  final_verdict?: FinalVerdict;
}
