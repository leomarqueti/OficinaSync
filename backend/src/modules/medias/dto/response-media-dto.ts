/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Expose, Transform } from 'class-transformer';
import { MediaType } from '../mediaType.enum';

export class ResponseMediaDto {
  @Expose()
  media_id: number;

  @Expose()
  type: MediaType;

  @Expose()
  url: string;

  @Expose()
  label: string | null;

  @Expose()
  created_at: Date;

  @Expose()
  @Transform(({ obj }) => obj.section?.section_id ?? null)
  section_id: number | null;
}
