import { Expose, Exclude, Transform } from 'class-transformer';

@Exclude()
export class ResponseUserDto {
  @Expose()
  user_id: number;

  @Expose()
  name: string;

  @Expose()
  email: string;

  @Expose()
  created_at: Date;

  @Expose()
  @Transform(
    ({ obj }: { obj: { tenant?: { name: string } } }) => obj.tenant?.name ?? null,
    { toClassOnly: true },
  )
  tenant_name: string | null;
}
