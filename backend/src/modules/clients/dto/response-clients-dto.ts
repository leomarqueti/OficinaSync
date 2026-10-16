import { Expose, Exclude } from 'class-transformer';

@Exclude()
export class ResponseClientDto {
  @Expose()
  client_id: number;

  @Expose()
  name: string;

  @Expose()
  phone: string;

  @Expose()
  cpf: string;

  @Expose()
  email: string | null;

  @Expose()
  address: string;

  @Expose()
  created_at: Date;
}
