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
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';
import { Users } from '../users/users.entity';
import { SectionStatus } from './statusSection.enum';
import { SectionType } from './typeSection.enum';
import { Media } from '../medias/media.entity';

@Entity('sections')
@Check(
  'check_values_section_type',
  `"type" IN ('checkin','obd_scan','diagnosis','repair','preventive','final')`,
)
@Check('check_values_section_status', `"status" IN ('draft','published')`)
export class Sections {
  @PrimaryGeneratedColumn()
  section_id: number;

  @Column({
    type: 'varchar',
    default: SectionType.CHECKIN,
  })
  type: SectionType;

  @Column({
    type: 'varchar',
    default: SectionStatus.DRAFT,
  })
  status: SectionStatus;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes: string | null;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  published_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => ServiceOrders, (serviceOrder) => serviceOrder.sections, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'service_order_id' })
  serviceOrder: ServiceOrders;

  @ManyToOne(() => Users, (user) => user.publishedSections, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'published_by' })
  publishedBy: Users | null;

  @OneToMany(() => Media, (media) => media.section)
  medias: Media[];
}
