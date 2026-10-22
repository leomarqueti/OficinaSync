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

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  email: string | null;

  /** Convite por celular (WhatsApp/QR): o funcionário cria um PIN. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  /** Nome digitado pelo dono no convite por celular. */
  @Column({ type: 'nvarchar', length: 150, nullable: true })
  name: string | null;

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

  /** Preenchido = "novo acesso" de um funcionário que já existe (troca o PIN dele). */
  @ManyToOne(() => Users, { nullable: true })
  @JoinColumn({ name: 'target_user_id' })
  targetUser: Users | null;
}
