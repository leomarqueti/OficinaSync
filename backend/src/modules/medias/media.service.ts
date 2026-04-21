/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from './media.entity';
import { CreateMediaDto } from './dto/create-media-dto';
import { UsersService } from '../users/users.service';
import { SectionsService } from '../sections/section.service';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly usersService: UsersService,
    private readonly sectionsService: SectionsService,
  ) {}

  async create(createMediaDto: CreateMediaDto, userId: number): Promise<Media> {
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

    const media = this.mediaRepository.create({
      type: createMediaDto.type,
      url: createMediaDto.url,
      label: createMediaDto.label ?? null,
      section,
    });

    return this.mediaRepository.save(media);
  }
}
