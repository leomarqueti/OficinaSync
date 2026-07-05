import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenants } from '../tenants/tenants.entity';
import { Users } from '../users/users.entity';
import { Role } from '../users/role.enum';

@Entity('invites')
@Check('check_values_invite_role', `"role" IN ('mechanic','receptionist')`)
export class Invites {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  token: string;

  @Column({ length: 100 })
  email: string;

  @Column({ type: 'varchar' })
  role: Role;

  @Column()
  expires_at: Date;

  @Column({ nullable: true })
  used_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Tenants)
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenants;

  @ManyToOne(() => Users)
  @JoinColumn({ name: 'invited_by' })
  invitedBy: Users;
}
