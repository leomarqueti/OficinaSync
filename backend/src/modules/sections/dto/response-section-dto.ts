import { Expose, Transform } from 'class-transformer';
import { SectionStatus } from '../statusSection.enum';
import { SectionType } from '../typeSection.enum';

export class ResponseSectionDto {
  @Expose()
  section_id: number;

  @Expose()
  type: SectionType;

  @Expose()
  status: SectionStatus;

  @Expose()
  notes: string | null;

  @Expose()
  published_at: Date | null;

  @Expose()
  created_at: Date;

  @Expose()
  @Transform(({ obj }) => obj.serviceOrder?.service_order_id ?? null)
  service_order_id: number | null;

  @Expose()
  @Transform(({ obj }) => obj.publishedBy?.user_id ?? null)
  published_by: number | null;
}
