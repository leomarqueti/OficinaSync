import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';
import { Tenants } from '../tenants/tenants.entity';
import { Users } from '../users/users.entity';
import { decimalTransformer } from './decimal.transformer';

/** Serviço / mão de obra executado na OS (para o escritório lançar na nota). */
@Entity('service_order_services')
export class ServiceOrderServices {
  @PrimaryGeneratedColumn()
  service_id: number;

  @Index()
  @ManyToOne(() => ServiceOrders, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder: ServiceOrders;

  @Index()
  @ManyToOne(() => Tenants, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenants;

  @Column({ type: 'varchar', length: 200 })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: decimalTransformer })
  price: number | null;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: Users | null;

  @CreateDateColumn()
  created_at: Date;
}
