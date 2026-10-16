/* eslint-disable @typescript-eslint/no-unsafe-return */
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
import { Clients } from '../clients/clients.entity';
import { Tenants } from '../tenants/tenants.entity';
import { FuelType } from './fuelType.enum';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';

@Entity('cars')
export class Cars {
  @PrimaryGeneratedColumn()
  car_id: number;

  @Index()
  @Column({
    type: 'varchar',
    length: 7,
  })
  plate: string;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  brand: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  model: string | null;

  @Column({
    type: 'integer',
    nullable: true,
  })
  year: number | null;

  @Column({
    type: 'varchar',
    enum: FuelType,
    nullable: true,
  })
  fuel_type: FuelType | null;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  chassis: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  color: string | null;

  @Column({
    type: 'integer',
    nullable: true,
  })
  mileage_in: number | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Clients, (client) => client.cars, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'client_id' })
  client: Clients | null;

  // SQL Server não indexa FKs automaticamente — toda query do sistema filtra por tenant.
  @Index()
  @ManyToOne(() => Tenants, (tenant) => tenant.cars, {
    nullable: false,
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenants;

  @OneToMany(() => ServiceOrders, (serviceOrder) => serviceOrder.car)
  serviceOrders: ServiceOrders[];
}
