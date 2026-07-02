import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenants } from '../tenants/tenants.entity';
import { Cars } from '../cars/cars.entity';
import { Users } from '../users/users.entity';
import { Status } from './status.enum';
import { FinalVerdict } from './finalVerdict.enum';
import { PromoVideoStatus } from './promoVideoStatus.enum';
import { Sections } from '../sections/section.entity';

@Entity('service_orders')
@Check(
  'check_values_orders_status',
  `"status" IN  ('open','in_progress','done','cancelled')`,
)
@Check(
  'check_values_orders_final_verdict',
  `"final_verdict" IN ('resolved','not_resolved','partial')`,
)
@Check(
  'check_values_orders_promo_video_status',
  `"promo_video_status" IN ('none','processing','ready','failed')`,
)
export class ServiceOrders {
  @PrimaryGeneratedColumn()
  service_order_id: number;

  @Column({
    type: 'varchar',
    default: Status.OPEN,
  })
  status: Status;

  @Column({
    type: 'varchar',
    unique: true,
  })
  public_token: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  client_complaint: string | null;

  @CreateDateColumn()
  created_at: Date;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  finished_at: Date | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  root_cause: string | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  conclusion: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  final_verdict: FinalVerdict | null;

  @Column({
    type: 'varchar',
    default: PromoVideoStatus.NONE,
  })
  promo_video_status: PromoVideoStatus;

  @ManyToOne(() => Tenants, (tenant) => tenant.serviceOrders, {
    nullable: false,
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenants;

  @ManyToOne(() => Cars, (car) => car.serviceOrders, {
    nullable: false,
  })
  @JoinColumn({ name: 'car_id' })
  car: Cars;

  @ManyToOne(() => Users, (user) => user.serviceOrders, {
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @OneToMany(() => Sections, (section) => section.serviceOrder)
  sections: Sections[];
}
