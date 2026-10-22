/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import {
  Check,
  Column,
  Index,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from './role.enum';
import { Tenants } from '../tenants/tenants.entity';
import { Email_verifications } from '../email_verifications/email_verifications.entity';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';
import { Sections } from '../sections/section.entity';

@Entity('users')
// e-mail e celular são opcionais (funcionário só com celular + PIN); no SQL Server um UNIQUE comum
// aceita um NULL só, por isso os índices únicos são filtrados.
@Index('UQ_users_email', ['email'], { unique: true, where: '"email" IS NOT NULL' })
@Index('UQ_users_phone', ['phone'], { unique: true, where: '"phone" IS NOT NULL' })
@Check(
  'check_values_user_role',
  `"role" IN  ('owner','mechanic','receptionist')`,
)
export class Users {
  @PrimaryGeneratedColumn()
  user_id: number;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 150, select: false, nullable: true })
  password_hash: string | null;

  /** Celular em E.164 (+5514999990000) — login do funcionário com PIN. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 150, select: false, nullable: true })
  pin_hash: string | null;

  @Column({ type: 'int', default: 0 })
  failed_pin_attempts: number;

  @Column({ type: 'datetime2', nullable: true })
  pin_locked_until: Date | null;

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
    () => Email_verifications,
    (email_verifications) => email_verifications.users,
  )
  email_verifications: Email_verifications[];

  @OneToMany(() => ServiceOrders, (serviceOrder) => serviceOrder.user)
  serviceOrders: ServiceOrders[];

  @OneToMany(() => Sections, (section) => section.publishedBy)
  publishedSections: Sections[];
}
