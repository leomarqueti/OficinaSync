import { Expose, Exclude } from 'class-transformer';

@Exclude()
export class ResponseUserDto {
  @Expose()
  name: string;

  @Expose()
  email: string;

  @Expose()
  created_at: Date;
}
