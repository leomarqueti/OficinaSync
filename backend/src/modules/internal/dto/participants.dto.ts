import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class ParticipantItemDto {
  @Type(() => Number)
  @IsInt()
  user_id: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  share_percent: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  task: string;
}

export class SetParticipantsDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ParticipantItemDto)
  participants: ParticipantItemDto[];
}
