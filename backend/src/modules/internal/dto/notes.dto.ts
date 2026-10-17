import { IsString, MaxLength } from 'class-validator';

export class SetNotesDto {
  @IsString()
  @MaxLength(4000)
  notes: string;
}
