/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sections } from './section.entity';
import { CreateSectionDto } from './dto/create-section-dto';
import { UsersService } from '../users/users.service';
import { ServiceOrdersService } from '../serviceOrder/serviceOrder.service';
import { SectionStatus } from './statusSection.enum';

@Injectable()
export class SectionsService {
  constructor(
    @InjectRepository(Sections)
    private readonly sectionRepository: Repository<Sections>,
    private readonly usersService: UsersService,
    private readonly serviceOrderService: ServiceOrdersService,
  ) {}

  async create(
    createSectionDto: CreateSectionDto,
    userId: number,
  ): Promise<Sections> {
    const user = await this.usersService.findById(userId);

    if (!user.tenant) {
      throw new UnauthorizedException();
    }

    const serviceOrder = await this.serviceOrderService.findById(
      createSectionDto.service_order_id,
    );

    if (serviceOrder.tenant.id !== user.tenant.id) {
      throw new ForbiddenException(
        'Essa ordem de serviço não pertence ao tenant do usuário.',
      );
    }

    const section = this.sectionRepository.create({
      type: createSectionDto.type,
      notes: createSectionDto.notes ?? null,
      serviceOrder,
      publishedBy: null,
      published_at: null,
    });

    return this.sectionRepository.save(section);
  }

  async findById(id: number) {
    const section = await this.sectionRepository.findOne({
      where: {
        section_id: id,
      },
      relations: {
        serviceOrder: {
          tenant: true,
        },
      },
    });

    if (!section) {
      throw new NotFoundException('Section não encontrada!');
    }

    return section;
  }

  async publish(sectionId: number, userId: number) {
    const sectionUpdate = await this.findById(sectionId);
    const user = await this.usersService.findById(userId);

    if (sectionUpdate.serviceOrder.tenant.id !== user.tenant?.id) {
      throw new ForbiddenException(
        'Essa ordem de serviço não pertence ao tenant do usuário.',
      );
    }

    sectionUpdate.status = SectionStatus.PUBLISHED;
    sectionUpdate.published_at = new Date();
    sectionUpdate.publishedBy = user;

    const saved = await this.sectionRepository.save(sectionUpdate);

    return saved;
  }
}
