import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ResponseInviteDto {
  @Expose()
  id: number;

  @Expose()
  email: string | null;

  @Expose()
  phone: string | null;

  @Expose()
  name: string | null;

  @Expose()
  role: string;

  @Expose()
  created_at: Date;

  @Expose()
  expires_at: Date;

  @Expose()
  used_at: Date | null;
}
