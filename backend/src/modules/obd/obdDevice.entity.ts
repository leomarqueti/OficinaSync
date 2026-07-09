import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Tenants } from '../tenants/tenants.entity';

/**
 * Dongle OBD da oficina (ESP32 + ELM327). O dispositivo NÃO é um usuário:
 * autentica nas rotas de ingestão via device_token (header X-Device-Token).
 * Só o último snapshot fica aqui (efêmero) — o que importa pro histórico é
 * capturado pra OS e vira um Test (test_type obd_snapshot).
 */
@Entity('obd_devices')
export class ObdDevices {
  @PrimaryGeneratedColumn()
  device_id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
  })
  device_token: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'varchar', length: 45, nullable: true })
  last_ip: string | null;

  @Column({ type: 'datetime', nullable: true })
  last_seen_at: Date | null;

  @Column({ type: 'simple-json', nullable: true })
  last_reading: Record<string, any> | null;

  @Column({ type: 'datetime', nullable: true })
  last_reading_at: Date | null;

  // Canal de comandos: a UI seta ('read_dtc'/'clear_dtc'), o dispositivo
  // recebe na resposta do próximo push e o campo é limpo ao entregar.
  @Column({ type: 'varchar', length: 50, nullable: true })
  pending_command: string | null;

  @CreateDateColumn()
  created_at: Date;

  // SQL Server não indexa FKs automaticamente — toda query filtra por tenant.
  @Index()
  @ManyToOne(() => Tenants, { nullable: false })
  @JoinColumn({ name: 'tenant_id' })
  tenant: Tenants;
}
