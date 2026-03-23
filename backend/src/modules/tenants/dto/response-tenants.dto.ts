/* eslint-disable prettier/prettier */
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ResponseTenantDto {
  @Expose()
  name: string;

  @Expose()
  cnpj: string;

  @Expose()
  phone: string;

  @Expose()
  created_at: Date;
}
