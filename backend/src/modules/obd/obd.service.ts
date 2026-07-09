import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { ObdDevices } from './obdDevice.entity';
import { CreateObdDeviceDto } from './dto/create-obd-device.dto';
import { UpdateObdDeviceDto } from './dto/update-obd-device.dto';
import { ObdReadingDto } from './dto/obd-reading.dto';
import { ObdCommandDto } from './dto/obd-command.dto';
import { CaptureObdDto } from './dto/capture-obd.dto';
import { UsersService } from '../users/users.service';
import { ServiceOrdersService } from '../serviceOrder/serviceOrder.service';
import { SectionsService } from '../sections/section.service';
import { TestsService } from '../tests/test.service';
import { SectionType } from '../sections/typeSection.enum';
import { TestTypeCategory } from '../tests/testType.enum';
import { describeDtc } from './dtcCatalog';

// Dispositivo é considerado online se deu sinal de vida nos últimos 90s
// (heartbeat é a cada 30s — 3 batidas perdidas = offline).
const ONLINE_WINDOW_MS = 90 * 1000;

// Captura exige leitura fresca — snapshot mais velho que isso provavelmente
// é de outro carro ou o dongle foi desplugado.
const FRESH_READING_MS = 60 * 1000;

@Injectable()
export class ObdService {
  constructor(
    @InjectRepository(ObdDevices)
    private readonly obdRepository: Repository<ObdDevices>,
    private readonly usersService: UsersService,
    private readonly serviceOrdersService: ServiceOrdersService,
    private readonly sectionsService: SectionsService,
    private readonly testsService: TestsService,
  ) {}

  // ------------------------------------------------------------------
  // Rotas JWT (mecânico/dono)
  // ------------------------------------------------------------------

  async createDevice(createDto: CreateObdDeviceDto, userId: number) {
    const user = await this.usersService.findById(userId);

    if (!user.tenant) {
      throw new UnauthorizedException();
    }

    const token = randomBytes(32).toString('hex');

    const device = this.obdRepository.create({
      name: createDto.name,
      device_token: token,
      tenant: user.tenant,
    });

    const saved = await this.obdRepository.save(device);

    // Único momento em que o token completo sai do backend — igual convite.
    return {
      device_id: saved.device_id,
      name: saved.name,
      device_token: token,
      created_at: saved.created_at,
    };
  }

  async findAllDevices(userId: number) {
    const user = await this.usersService.findById(userId);

    if (!user.tenant) {
      throw new UnauthorizedException();
    }

    const devices = await this.obdRepository.find({
      where: { tenant: { id: user.tenant.id } },
      order: { created_at: 'DESC' },
    });

    return devices.map((device) => this.toDeviceView(device));
  }

  async updateDevice(
    deviceId: number,
    updateDto: UpdateObdDeviceDto,
    userId: number,
  ) {
    const device = await this.findDeviceScoped(deviceId, userId);

    if (updateDto.name !== undefined) {
      device.name = updateDto.name;
    }

    if (updateDto.is_active !== undefined) {
      device.is_active = updateDto.is_active;
    }

    const saved = await this.obdRepository.save(device);
    return this.toDeviceView(saved);
  }

  async removeDevice(deviceId: number, userId: number): Promise<void> {
    const device = await this.findDeviceScoped(deviceId, userId);
    await this.obdRepository.remove(device);
  }

  async getLatest(deviceId: number, userId: number) {
    const device = await this.findDeviceScoped(deviceId, userId);

    return {
      device_id: device.device_id,
      name: device.name,
      online: this.isOnline(device),
      last_seen_at: device.last_seen_at,
      last_reading: device.last_reading,
      last_reading_at: device.last_reading_at,
      pending_command: device.pending_command,
    };
  }

  async setCommand(deviceId: number, dto: ObdCommandDto, userId: number) {
    const device = await this.findDeviceScoped(deviceId, userId);

    if (!this.isOnline(device)) {
      throw new ConflictException(
        'Scanner offline — ligue o dispositivo antes de enviar comandos.',
      );
    }

    device.pending_command = dto.command;
    await this.obdRepository.save(device);

    return { device_id: device.device_id, pending_command: dto.command };
  }

  /**
   * Anexa a última leitura do scanner à OS como um Test (obd_snapshot) na
   * etapa Scanner/OBD — que o cliente só vê quando a etapa for publicada.
   */
  async capture(dto: CaptureObdDto, userId: number) {
    const user = await this.usersService.findById(userId);

    if (!user.tenant) {
      throw new UnauthorizedException();
    }

    const device = await this.findDeviceScoped(dto.device_id, userId);

    const order = await this.serviceOrdersService.findEntityById(
      dto.service_order_id,
    );

    if (order.tenant.id !== user.tenant.id) {
      throw new ForbiddenException(
        'Essa ordem de serviço não pertence ao tenant do usuário.',
      );
    }

    const reading = device.last_reading;
    const readingAt = device.last_reading_at;

    if (
      !reading ||
      !readingAt ||
      Date.now() - new Date(readingAt).getTime() > FRESH_READING_MS
    ) {
      throw new ConflictException(
        'Scanner sem leitura recente — confira se o dongle está plugado no carro.',
      );
    }

    // Find-or-create da etapa Scanner/OBD (mesmo padrão do VideoModule com a final)
    const existingSection = (order.sections ?? []).find(
      (section) => section.type === SectionType.OBD_SCAN,
    );

    const section =
      existingSection ??
      (await this.sectionsService.create(
        {
          service_order_id: order.service_order_id,
          type: SectionType.OBD_SCAN,
        },
        userId,
      ));

    const test = await this.testsService.create(
      {
        section_id: section.section_id,
        title: 'Leitura OBD (scanner)',
        test_type: TestTypeCategory.OBD_SNAPSHOT,
        data: {
          collected_at: new Date(readingAt).toISOString(),
          device_name: device.name,
          voltage: reading.voltage ?? null,
          params: reading.params ?? {},
          // Descrição resolvida aqui (uma vez) — página do cliente, PDF e
          // histórico exibem o mesmo texto sem catálogos duplicados.
          dtcs: ((reading.dtcs ?? []) as { code: string }[]).map((dtc) => ({
            code: dtc.code,
            description: describeDtc(dtc.code),
          })),
        },
      },
      userId,
    );

    return {
      test_id: test.test_id,
      section_id: section.section_id,
      service_order_id: order.service_order_id,
    };
  }

  // ------------------------------------------------------------------
  // Rotas do dispositivo (X-Device-Token)
  // ------------------------------------------------------------------

  async heartbeat(token: string, ip: string | undefined) {
    const device = await this.findByToken(token);

    device.last_seen_at = new Date();
    device.last_ip = ip ?? null;

    return this.deliverCommand(device);
  }

  async ingestReading(
    token: string,
    reading: ObdReadingDto,
    ip: string | undefined,
  ) {
    const device = await this.findByToken(token);

    device.last_seen_at = new Date();
    device.last_ip = ip ?? null;
    device.last_reading = reading as Record<string, any>;
    device.last_reading_at = new Date();

    return this.deliverCommand(device);
  }

  // ------------------------------------------------------------------
  // Internos
  // ------------------------------------------------------------------

  private async findByToken(token: string): Promise<ObdDevices> {
    if (!token) {
      throw new UnauthorizedException('Token do dispositivo ausente.');
    }

    const device = await this.obdRepository.findOne({
      where: { device_token: token },
    });

    if (!device || !device.is_active) {
      throw new UnauthorizedException('Token do dispositivo inválido.');
    }

    return device;
  }

  /** Entrega o comando pendente (se houver) e limpa — entrega única. */
  private async deliverCommand(device: ObdDevices) {
    const command = device.pending_command;
    device.pending_command = null;
    await this.obdRepository.save(device);

    return { ok: true, command: command ?? null };
  }

  private async findDeviceScoped(
    deviceId: number,
    userId: number,
  ): Promise<ObdDevices> {
    const user = await this.usersService.findById(userId);

    const device = await this.obdRepository.findOne({
      where: { device_id: deviceId },
      relations: { tenant: true },
    });

    if (!device) {
      throw new NotFoundException('Dispositivo não encontrado!');
    }

    if (!user.tenant || device.tenant.id !== user.tenant.id) {
      throw new ForbiddenException(
        'Esse dispositivo não pertence ao tenant do usuário.',
      );
    }

    return device;
  }

  private isOnline(device: ObdDevices): boolean {
    return (
      !!device.last_seen_at &&
      Date.now() - new Date(device.last_seen_at).getTime() < ONLINE_WINDOW_MS
    );
  }

  /** Visão pro frontend — nunca inclui o device_token. */
  private toDeviceView(device: ObdDevices) {
    return {
      device_id: device.device_id,
      name: device.name,
      is_active: device.is_active,
      online: this.isOnline(device),
      last_seen_at: device.last_seen_at,
      last_reading_at: device.last_reading_at,
      created_at: device.created_at,
    };
  }
}
