import { Expose, Exclude, Type } from 'class-transformer';
import { ResponseUserAuthDto } from './response-userAuth.dto';

@Exclude()
export class ResponseAuthDto {
  @Expose()
  @Type(() => ResponseUserAuthDto)
  user: ResponseUserAuthDto;

  @Expose()
  onboarding_token: string;
}
