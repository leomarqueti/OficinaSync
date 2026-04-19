import {
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

@Entity('clients')
export class Clients {
  @PrimaryGeneratedColumn()
  client_id: number;

  @Column({ length: 150, type: 'varchar' })
  name: string;

  @Column({ length: 20, type: 'varchar' })
  phone: string;

  @Column({ length: 100, type: 'varchar', nullable: true })
  email: string | null;

  @Column()
  cpf: string;

  @Column({ length: 200, type: 'varchar' })
  address: string;

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

  @ManyToOne(() => Tenants, (tenant) => tenant.clients, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenants;
}
