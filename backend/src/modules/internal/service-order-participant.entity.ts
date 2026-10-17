import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';
import { Tenants } from '../tenants/tenants.entity';
import { Users } from '../users/users.entity';

/** Quem ajudou na OS (além do responsável), com o quê e quanto (%). */
@Entity('service_order_participants')
@Unique('UQ_participant_order_user', ['serviceOrder', 'user'])
export class ServiceOrderParticipants {
  @PrimaryGeneratedColumn()
  participant_id: number;

  @Index()
  @ManyToOne(() => ServiceOrders, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder: ServiceOrders;

  @Index()
  @ManyToOne(() => Tenants, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenants;

  @ManyToOne(() => Users, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @Column({ type: 'int' })
  share_percent: number;

  @Column({ type: 'varchar', length: 150 })
  task: string;

  @CreateDateColumn()
  created_at: Date;
}
