/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Column,
  CreateDateColumn,
  Entity,
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

  @Column({
    type: 'varchar',
    length: 7,
  })
  plate: string;

  @Column({
    type: 'varchar',
  })
  brand: string;

  @Column({
    type: 'varchar',
  })
  model: string;

  @Column({
    type: 'integer',
  })
  year: number;

  @Column({
    type: 'varchar',
    enum: FuelType,
  })
  fuel_type: FuelType;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  chassis: string;

  @Column({
    type: 'varchar',
  })
  color: string;

  @Column({
    type: 'integer',
  })
  mileage_in: number;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Clients, (client) => client.cars, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'client_id' })
  client: Clients;

  @ManyToOne(() => Tenants, (tenant) => tenant.cars, {
    nullable: false,
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenants;

  @OneToMany(() => ServiceOrders, (serviceOrder) => serviceOrder.car)
  serviceOrders: ServiceOrders[];
}
