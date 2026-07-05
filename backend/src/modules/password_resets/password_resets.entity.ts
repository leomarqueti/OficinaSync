import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Users } from '../users/users.entity';

@Entity('password_resets')
export class PasswordResets {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  token: string;

  @Column()
  expires_at: Date;

  @Column({
    nullable: true,
  })
  used_at: Date;

  @ManyToOne(() => Users)
  @JoinColumn({ name: 'user_id' })
  users: Users;
}
