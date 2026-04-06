import { Expose, Exclude } from 'class-transformer';

@Exclude()
export class ResponseUserAuthDto {
  @Expose()
  name: string;

  @Expose()
  email: string;

  @Expose()
  created_at: Date;
}
