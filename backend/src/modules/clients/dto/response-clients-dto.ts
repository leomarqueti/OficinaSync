import { Expose, Exclude } from 'class-transformer';

@Exclude()
export class ResponseClientDto {
  @Expose()
  client_id: number;

  @Expose()
  name: string;

  @Expose()
  phone: string | null;

  @Expose()
  cpf: string | null;

  @Expose()
  email: string | null;

  @Expose()
  address: string | null;

  @Expose()
  created_at: Date;
}
