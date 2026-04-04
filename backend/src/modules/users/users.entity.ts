/* eslint-disable prettier/prettier */
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
import { Role } from './role.enum';
import { Tenants } from '../tenants/tenants.entity';
import { Email_verificarions } from '../email_verifications/email_verifications.entity';

@Entity('users')
@Check(
  'check_values_user_role',
  `"role" IN  ('owner','mechanic','receptionist')`,
)
export class Users {
  @PrimaryGeneratedColumn()
  user_id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 150, select: false })
  password_hash: string;

  @Column({
    type: 'varchar',
    default: Role.OWNER,
  })
  role: Role;

  @Column({
    type: 'bit',
    default: false,
  })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Tenants, (Tenant) => Tenant.users, {
    nullable: true,
  })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenants | null;

  @OneToMany(
    () => Email_verificarions,
    (email_verifications) => email_verifications.users,
  )
  email_verifications: Email_verificarions[];
}
