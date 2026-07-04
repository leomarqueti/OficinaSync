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
import { Verdict } from './verdict.enum';
import { TestMeasurement } from './testMeasurement.type';
import { TestTypeCategory } from './testType.enum';

@Entity('tests')
@Check(
  'check_values_test_verdict',
  `"verdict" IN ('approved','failed','inconclusive')`,
)
@Check(
  'check_values_test_type',
  `"test_type" IN ('compressao_mecanica','leitura_dtc','bateria','injetores_banco','achado_adicional','antes_depois')`,
)
export class Tests {
  @PrimaryGeneratedColumn()
  test_id: number;

  @Column({
    type: 'varchar',
    length: 150,
  })
  title: string;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  measurements: TestMeasurement[] | null;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  test_type: TestTypeCategory | null;

  @Column({
    type: 'simple-json',
    nullable: true,
  })
  data: Record<string, any> | null;

  @Column({
    type: 'varchar',
    nullable: true,
  })
  verdict: Verdict | null;

  @Column({
    type: 'text',
    nullable: true,
  })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Sections, (section) => section.tests, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'section_id' })
  section: Sections;
}
