import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenants } from '../tenants/tenants.entity';
import { Cars } from '../cars/cars.entity';

@Entity('clients')
export class Clients {
  @PrimaryGeneratedColumn()
  client_id: number;

  @Index()
  @Column({ length: 150, type: 'varchar' })
  name: string;

  @Column({ length: 20, type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ length: 100, type: 'varchar', nullable: true })
  email: string | null;

  @Index()
  @Column({ type: 'nvarchar', length: 255, nullable: true })
  cpf: string | null;

  @Column({ length: 200, type: 'varchar', nullable: true })
  address: string | null;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @Column({
    type: 'bit',
    default: true,
  })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Cars, (car) => car.client)
  cars: Cars[];

  // SQL Server não indexa FKs automaticamente — toda query do sistema filtra por tenant.
  @Index()
  @ManyToOne(() => Tenants, (tenant) => tenant.clients, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenants;
}
