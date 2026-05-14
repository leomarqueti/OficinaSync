/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { ServiceOrders } from './serviceOrder.entity';
import { CreateServiceOrderDto } from './dto/create-serviceOrder-dto';
import { UsersService } from '../users/users.service';
import { CarsService } from '../cars/cars.service';
import { MinioService } from '../minio/minio.service';
import { Status } from './status.enum';

@Injectable()
export class ServiceOrdersService {
  constructor(
    @InjectRepository(ServiceOrders)
    private serviceOrdersRepository: Repository<ServiceOrders>,
    private usersService: UsersService,
    private carsService: CarsService,
    private minioService: MinioService,
  ) {}

  async create(
    createServiceOrdesDto: CreateServiceOrderDto,
    userId: number,
  ): Promise<ServiceOrders> {
    const token = randomBytes(32).toString('hex');
    const user = await this.usersService.findById(userId);
    const car = await this.carsService.findById(createServiceOrdesDto.car_id);
    const serviceOrder = this.serviceOrdersRepository.create();

    if (!user.tenant) {
      throw new UnauthorizedException();
    }

    serviceOrder.tenant = user.tenant;
    serviceOrder.user = user;
    serviceOrder.public_token = token;
    serviceOrder.car = car;
    serviceOrder.client_complaint = createServiceOrdesDto.client_complaint;

    return this.serviceOrdersRepository.save(serviceOrder);
  }

  async findById(id: number) {
    const client = await this.serviceOrdersRepository.findOne({
      where: {
        service_order_id: id,
      },
      relations: {
        tenant: true,
        user: true,
      },
    });

    if (!client) {
      throw new Error('Carro nao encontrado!');
    }

    return client;
  }

  async findByPublicToken(token: string) {
    const serviceOrder = await this.serviceOrdersRepository.findOne({
      where: {
        public_token: token,
      },
      relations: {
        tenant: true,
        car: {
          client: true,
        },
        sections: {
          medias: true,
        },
      },
    });

    if (!serviceOrder) {
      throw new NotFoundException('Ordem de serviço não encontrada!');
    }

    const publishedSections = await Promise.all(
      (serviceOrder.sections ?? [])
        .filter((section) => section.status === 'published')
        .map(async (section) => ({
          type: section.type,
          notes: section.notes,
          published_at: section.published_at,
          medias: await Promise.all(
            (section.medias ?? []).map(async (media) => ({
              type: media.type,
              object_name: media.object_name,
              label: media.label,
              mime_type: media.mime_type,
              url: await this.minioService.getPresignedUrl(media.object_name),
            })),
          ),
        })),
    );

    return {
      status: serviceOrder.status,
      client_complaint: serviceOrder.client_complaint,
      created_at: serviceOrder.created_at,
      tenant: {
        name: serviceOrder.tenant.name,
      },
      car: {
        brand: serviceOrder.car.brand,
        model: serviceOrder.car.model,
        year: serviceOrder.car.year,
        plate: serviceOrder.car.plate,
        mileage_in: serviceOrder.car.mileage_in,
        color: serviceOrder.car.color,
        fuel_type: serviceOrder.car.fuel_type,
      },
      client: {
        name: serviceOrder.car.client.name,
        phone: serviceOrder.car.client.phone,
      },
      sections: publishedSections,
    };
  }

  async findAll(userId: number) {
    const user = await this.usersService.findById(userId);

    if (!user.tenant) {
      throw new NotFoundException('Oficina não encontrada!');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const serviceOrders = await this.serviceOrdersRepository.find({
      where: {
        tenant: {
          id: user.tenant.id,
        },
        status: Status.OPEN,
      },
      relations: {
        tenant: true,
        car: {
          client: true,
        },
      },
      order: {
        created_at: 'DESC',
      },
    });

    return serviceOrders.map((serviceOrder) => ({
      service_order_id: serviceOrder.service_order_id,
      status: serviceOrder.status,
      client_complaint: serviceOrder.client_complaint,
      created_at: serviceOrder.created_at,
      public_token: serviceOrder.public_token,
      public_url: `${frontendUrl}/servico/${serviceOrder.public_token}`,
      tenant: {
        name: serviceOrder.tenant.name,
      },
      car: {
        brand: serviceOrder.car.brand,
        model: serviceOrder.car.model,
        year: serviceOrder.car.year,
        plate: serviceOrder.car.plate,
        mileage_in: serviceOrder.car.mileage_in,
        color: serviceOrder.car.color,
        fuel_type: serviceOrder.car.fuel_type,
      },
      client: {
        name: serviceOrder.car.client.name,
        phone: serviceOrder.car.client.phone,
      },
    }));
  }

  async finish(orderId: number, userId: number) {
    const order = await this.findById(orderId);
    const user = await this.usersService.findById(userId);

    if (order.tenant.id !== user.tenant?.id) {
      throw new ForbiddenException(
        'Essa ordem de serviço não pertence ao tenant do usuário.',
      );
    }

    order.status = Status.DONE;
    order.finished_at = new Date();

    const saved = await this.serviceOrdersRepository.save(order);

    return saved;
  }
}
