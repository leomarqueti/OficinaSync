import { Expose, Exclude } from 'class-transformer';
import { Status } from '../status.enum';

@Exclude()
export class ResponseServiceOrderDto {
  @Expose()
  service_order_id: number;

  @Expose()
  status: Status;

  @Expose()
  public_token: string;

  @Expose()
  client_complaint: string | null;

  @Expose()
  created_at: Date;
}
