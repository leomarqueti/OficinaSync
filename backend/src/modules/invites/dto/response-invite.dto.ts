import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ResponseInviteDto {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Expose()
  role: string;

  @Expose()
  created_at: Date;

  @Expose()
  expires_at: Date;

  @Expose()
  used_at: Date | null;
}
