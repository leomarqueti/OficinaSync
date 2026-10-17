import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';
import { Tenants } from '../tenants/tenants.entity';
import { Users } from '../users/users.entity';
import { decimalTransformer } from './decimal.transformer';

@Entity('service_order_parts')
export class ServiceOrderParts {
  @PrimaryGeneratedColumn()
  part_id: number;

  @Index()
  @ManyToOne(() => ServiceOrders, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder: ServiceOrders;

  // isolamento entre oficinas: toda consulta filtra por aqui também
  @Index()
  @ManyToOne(() => Tenants, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenants;

  @Column({ type: 'varchar', length: 150 })
  description: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  code: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer })
  taken_quantity: number;

  /** null = a peça foi retirada mas ainda não foi acertada (quanto realmente usou). */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: decimalTransformer })
  used_quantity: number | null;

  /** null = "preço não informado". */
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, transformer: decimalTransformer })
  unit_price: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  photo_object_name: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  photo_mime: string | null;

  @Column({ type: 'int', nullable: true })
  photo_size: number | null;

  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: Users | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
