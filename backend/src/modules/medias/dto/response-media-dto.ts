import { Exclude, Expose } from 'class-transformer';
import { MediaType } from '../mediaType.enum';

@Exclude()
export class ResponseMediaDto {
  @Expose()
  media_id: number;

  @Expose()
  type: MediaType;

  @Expose()
  bucket: string;

  @Expose()
  object_name: string;

  @Expose()
  mime_type: string;

  @Expose()
  size: number;

  @Expose()
  label: string | null;

  @Expose()
  created_at: Date;

  @Expose()
  section_id: number | null;
}
