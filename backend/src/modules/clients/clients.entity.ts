/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { IsCPF } from 'class-validator-cpf';

@Entity('clients')
export class Clients {
  @PrimaryGeneratedColumn()
  clients_id: number;

  @Column({ length: 150, type: 'varchar' })
  name: string;

  @Column({ length: 20, type: 'varchar' })
  phone: string;

  @Column({ length: 100, unique: true, nullable: true })
  email: string;

  @Column()
  @IsCPF({ message: 'Invalid CPF number' })
  cpf: string;

  @Column({ length: 200, type: 'varchar' })
  address: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @CreateDateColumn()
  created_at: Date;
}
