/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable prettier/prettier */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from './media.entity';
import { CreateMediaDto } from './dto/create-media-dto';
import { UsersService } from '../users/users.service';
import { SectionsService } from '../sections/section.service';
import { MinioService } from '../minio/minio.service';
import { ExceptionsHandler } from '@nestjs/core/exceptions/exceptions-handler';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly usersService: UsersService,
    private readonly sectionsService: SectionsService,
    private readonly minioService: MinioService,
  ) {}

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

    console.log(mediaSaved);
    return {
      ...mediaSaved,
      section_id: mediaSaved.section?.section_id ?? null,
    } as any;
  }
}
