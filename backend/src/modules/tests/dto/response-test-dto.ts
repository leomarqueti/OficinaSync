import { Expose, Transform } from 'class-transformer';
import { Verdict } from '../verdict.enum';
import { TestMeasurement } from '../testMeasurement.type';
import { TestTypeCategory } from '../testType.enum';

export class ResponseTestDto {
  @Expose()
  test_id: number;

  @Expose()
  title: string;

  @Expose()
  measurements: TestMeasurement[] | null;

  @Expose()
  test_type: TestTypeCategory | null;

  @Expose()
  data: Record<string, any> | null;

  @Expose()
  verdict: Verdict | null;

  @Expose()
  notes: string | null;

  @Expose()
  created_at: Date;

  @Expose()
  @Transform(({ obj }) => obj.section?.section_id ?? null)
  section_id: number | null;
}
