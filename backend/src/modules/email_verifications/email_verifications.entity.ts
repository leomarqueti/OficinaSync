/* eslint-disable prettier/prettier */
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Users } from '../users/users.entity';

@Entity('email_verifications')
export class Email_verifications {
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

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  @ManyToOne(() => Users, (users) => users.email_verifications)
  @JoinColumn({ name: 'user_id' })
  users: Users;
}
