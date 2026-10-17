import {
  BadRequestException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MediaService } from '../medias/media.service';
import { MinioService } from '../minio/minio.service';
import { exceedsQuota } from '../minio/upload-limits';
import { CreatePartDto, UpdatePartDto } from './dto/part.dto';
import { CreateServiceItemDto, UpdateServiceItemDto } from './dto/service-item.dto';
import { InternalContextService, OrderContext } from './internal-context.service';
import { ServiceOrderParts } from './service-order-part.entity';
import { ServiceOrderServices } from './service-order-service.entity';

export type PartView = {
  part_id: number;
  description: string;
  code: string | null;
  taken_quantity: number;
  used_quantity: number | null;
  unit_price: number | null;
  photo_url: string | null;
  created_by_name: string | null;
};

export type ServiceView = { service_id: number; description: string; price: number | null };

const EDIT_MSG = 'Depois que a OS é finalizada, só o escritório altera peças e serviços.';

@Injectable()
export class PartsService {
  constructor(
    @InjectRepository(ServiceOrderParts)
    private readonly parts: Repository<ServiceOrderParts>,
    @InjectRepository(ServiceOrderServices)
    private readonly services: Repository<ServiceOrderServices>,
    private readonly minio: MinioService,
    private readonly mediaService: MediaService,
    private readonly config: ConfigService,
    private readonly context: InternalContextService,
  ) {}

  async toPartView(part: ServiceOrderParts): Promise<PartView> {
    return {
      part_id: part.part_id,
      description: part.description,
      code: part.code,
      taken_quantity: part.taken_quantity,
      used_quantity: part.used_quantity,
      unit_price: part.unit_price,
      photo_url: part.photo_object_name
        ? await this.minio.getPresignedUrl(part.photo_object_name)
        : null,
      created_by_name: part.createdBy?.name ?? null,
    };
  }

  async listParts(ctx: OrderContext): Promise<PartView[]> {
    const rows = await this.parts.find({
      where: { serviceOrder: { service_order_id: ctx.order.service_order_id }, tenant: { id: ctx.tenant.id } },
      relations: { createdBy: true },
      order: { part_id: 'ASC' },
    });
    return Promise.all(rows.map((p) => this.toPartView(p)));
  }

  async findPart(ctx: OrderContext, partId: number): Promise<ServiceOrderParts> {
    const part = await this.parts.findOne({
      where: {
        part_id: partId,
        serviceOrder: { service_order_id: ctx.order.service_order_id },
        tenant: { id: ctx.tenant.id },
      },
      relations: { createdBy: true },
    });
    if (!part) throw new NotFoundException('Peça não encontrada nesta OS.');
    return part;
  }

  private assertUsedWithinTaken(taken: number, used: number | null) {
    if (used !== null && used > taken) {
      throw new BadRequestException('A quantidade usada não pode ser maior que a retirada.');
    }
  }

  async createPart(ctx: OrderContext, dto: CreatePartDto): Promise<PartView> {
    this.context.require(ctx, 'edit_items', EDIT_MSG);
    this.assertUsedWithinTaken(dto.taken_quantity, dto.used_quantity ?? null);

    const saved = await this.parts.save(
      this.parts.create({
        description: dto.description.trim(),
        code: dto.code?.trim() || null,
        taken_quantity: dto.taken_quantity,
        used_quantity: dto.used_quantity ?? null,
        unit_price: dto.unit_price ?? null,
        photo_object_name: null,
        photo_mime: null,
        photo_size: null,
        serviceOrder: ctx.order,
        tenant: ctx.tenant,
        createdBy: ctx.user,
      }),
    );
    return this.toPartView(saved);
  }

  async updatePart(ctx: OrderContext, partId: number, dto: UpdatePartDto): Promise<PartView> {
    this.context.require(ctx, 'edit_items', EDIT_MSG);
    const part = await this.findPart(ctx, partId);

    if (dto.description != null) part.description = dto.description.trim();
    if (dto.taken_quantity != null) part.taken_quantity = dto.taken_quantity;
    // estes três aceitam null = limpar
    if (dto.code !== undefined) part.code = dto.code?.trim() || null;
    if (dto.used_quantity !== undefined) part.used_quantity = dto.used_quantity;
    if (dto.unit_price !== undefined) part.unit_price = dto.unit_price;

    this.assertUsedWithinTaken(part.taken_quantity, part.used_quantity);
    return this.toPartView(await this.parts.save(part));
  }

  async deletePart(ctx: OrderContext, partId: number): Promise<{ deleted: true }> {
    this.context.require(ctx, 'edit_items', EDIT_MSG);
    const part = await this.findPart(ctx, partId);
    const photo = part.photo_object_name;
    await this.parts.remove(part);
    if (photo) await this.minio.removeObject(photo).catch(() => undefined);
    return { deleted: true };
  }

  async uploadPhoto(ctx: OrderContext, partId: number, file: Express.Multer.File): Promise<PartView> {
    this.context.require(ctx, 'edit_items', EDIT_MSG);
    if (!file) throw new BadRequestException('Foto não enviada.');
    const part = await this.findPart(ctx, partId);

    const quotaBytes = Number(this.config.get('TENANT_STORAGE_QUOTA_MB') ?? 2048) * 1024 * 1024;
    const used = await this.mediaService.getTenantUsageBytes(ctx.tenant.id);
    if (exceedsQuota(used, file.size, quotaBytes)) {
      throw new PayloadTooLargeException(
        'Limite de armazenamento da oficina atingido. Fale com o suporte para ampliar.',
      );
    }

    const uploaded = await this.minio.upload(file, { onlyImages: true });
    const previous = part.photo_object_name;

    part.photo_object_name = uploaded.object_name;
    part.photo_mime = uploaded.mime_type;
    part.photo_size = uploaded.size;
    const saved = await this.parts.save(part);

    if (previous) await this.minio.removeObject(previous).catch(() => undefined);
    return this.toPartView(saved);
  }

  // ---- serviços / mão de obra
  toServiceView(s: ServiceOrderServices): ServiceView {
    return { service_id: s.service_id, description: s.description, price: s.price };
  }

  async listServices(ctx: OrderContext): Promise<ServiceView[]> {
    const rows = await this.services.find({
      where: { serviceOrder: { service_order_id: ctx.order.service_order_id }, tenant: { id: ctx.tenant.id } },
      order: { service_id: 'ASC' },
    });
    return rows.map((s) => this.toServiceView(s));
  }

  private async findService(ctx: OrderContext, serviceId: number) {
    const row = await this.services.findOne({
      where: {
        service_id: serviceId,
        serviceOrder: { service_order_id: ctx.order.service_order_id },
        tenant: { id: ctx.tenant.id },
      },
    });
    if (!row) throw new NotFoundException('Serviço não encontrado nesta OS.');
    return row;
  }

  async createService(ctx: OrderContext, dto: CreateServiceItemDto): Promise<ServiceView> {
    this.context.require(ctx, 'edit_items', EDIT_MSG);
    const saved = await this.services.save(
      this.services.create({
        description: dto.description.trim(),
        price: dto.price ?? null,
        serviceOrder: ctx.order,
        tenant: ctx.tenant,
        createdBy: ctx.user,
      }),
    );
    return this.toServiceView(saved);
  }

  async updateService(ctx: OrderContext, serviceId: number, dto: UpdateServiceItemDto): Promise<ServiceView> {
    this.context.require(ctx, 'edit_items', EDIT_MSG);
    const row = await this.findService(ctx, serviceId);
    if (dto.description != null) row.description = dto.description.trim();
    if (dto.price !== undefined) row.price = dto.price;
    return this.toServiceView(await this.services.save(row));
  }

  async deleteService(ctx: OrderContext, serviceId: number): Promise<{ deleted: true }> {
    this.context.require(ctx, 'edit_items', EDIT_MSG);
    await this.services.remove(await this.findService(ctx, serviceId));
    return { deleted: true };
  }
}
