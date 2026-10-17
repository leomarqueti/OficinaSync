/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable prettier/prettier */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from './media.entity';
import { CreateMediaDto } from './dto/create-media-dto';
import { UsersService } from '../users/users.service';
import { SectionsService } from '../sections/section.service';
import { MinioService } from '../minio/minio.service';
import { exceedsQuota } from '../minio/upload-limits';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly usersService: UsersService,
    private readonly sectionsService: SectionsService,
    private readonly minioService: MinioService,
    private readonly configService: ConfigService,
  ) {}

  /** Bytes de mídia da oficina. CAST pra BIGINT: SUM(int) estoura em 2 GB no SQL Server. */
  async getTenantUsageBytes(tenantId: number): Promise<number> {
    const row = await this.mediaRepository
      .createQueryBuilder('m')
      .innerJoin('m.section', 's')
      .innerJoin('s.serviceOrder', 'so')
      .innerJoin('so.tenant', 't')
      .where('t.id = :tenantId', { tenantId })
      .select('COALESCE(SUM(CAST(m.size AS BIGINT)), 0)', 'total')
      .getRawOne<{ total: string | number }>();

    // fotos de caixa de peças (área interna) também gastam o espaço da oficina
    const partRows: Array<{ total: string | number }> =
      await this.mediaRepository.manager.query(
        `SELECT COALESCE(SUM(CAST(photo_size AS BIGINT)), 0) AS total
           FROM service_order_parts WHERE tenant_id = @0`,
        [tenantId],
      );

    return Number(row?.total ?? 0) + Number(partRows[0]?.total ?? 0);
  }

  async create(
    file: Express.Multer.File,
    createMediaDto: CreateMediaDto,
    userId: number,
  ): Promise<Media> {
    const user = await this.usersService.findById(userId);

    if (!user.tenant) {
      throw new UnauthorizedException();
    }

    const section = await this.sectionsService.findById(
      createMediaDto.section_id,
    );

    if (section.serviceOrder.tenant.id !== user.tenant.id) {
      throw new ForbiddenException(
        'Essa section não pertence ao tenant do usuário.',
      );
    }

    const quotaBytes =
      Number(this.configService.get('TENANT_STORAGE_QUOTA_MB') ?? 2048) *
      1024 *
      1024;
    const usedBytes = await this.getTenantUsageBytes(user.tenant.id);

    if (exceedsQuota(usedBytes, file?.size ?? 0, quotaBytes)) {
      throw new PayloadTooLargeException(
        'Limite de armazenamento da oficina atingido. Fale com o suporte para ampliar.',
      );
    }

    const uploadedFile = await this.minioService.upload(file);

    const media = this.mediaRepository.create({
      type: createMediaDto.type,
      bucket: uploadedFile.bucket,
      object_name: uploadedFile.object_name,
      mime_type: uploadedFile.mime_type,
      size: uploadedFile.size,
      label: createMediaDto.label ?? null,
      section,
    });

    const saved = await this.mediaRepository.save(media);

    const mediaSaved = await this.mediaRepository.findOne({
      where: { media_id: saved.media_id },
      relations: { section: true },
    });

    if (!mediaSaved) {
      throw new NotFoundException();
    }

    return {
      ...mediaSaved,
      section_id: mediaSaved.section?.section_id ?? null,
    } as any;
  }

  async createFromUploadedObject(
    sectionId: number,
    type: string,
    label: string | null,
    uploaded: {
      bucket: string;
      object_name: string;
      mime_type: string;
      size: number;
    },
    userId: number,
  ): Promise<Media> {
    const user = await this.usersService.findById(userId);

    if (!user.tenant) {
      throw new UnauthorizedException();
    }

    const section = await this.sectionsService.findById(sectionId);

    if (section.serviceOrder.tenant.id !== user.tenant.id) {
      throw new ForbiddenException(
        'Essa section não pertence ao tenant do usuário.',
      );
    }

    const media = this.mediaRepository.create({
      type,
      bucket: uploaded.bucket,
      object_name: uploaded.object_name,
      mime_type: uploaded.mime_type,
      size: uploaded.size,
      label,
      section,
    });

    return this.mediaRepository.save(media);
  }
}
