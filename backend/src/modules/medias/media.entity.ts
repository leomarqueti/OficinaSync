import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Sections } from '../sections/section.entity';
import { MediaType } from './mediaType.enum';

@Entity('medias')
@Check('check_values_media_type', `"type" IN ('photo','video','audio')`)
export class Media {
  @PrimaryGeneratedColumn()
  media_id: number;

  @Column()
  type: string;

  @Column()
  bucket: string;

  @Column()
  object_name: string;

  @Column()
  mime_type: string;

  @Column()
  size: number;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  label: string | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Sections, (section) => section.medias, {
    nullable: false,
  })
  @JoinColumn({ name: 'section_id' })
  section: Sections;
}
