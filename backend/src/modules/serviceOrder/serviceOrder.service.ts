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
import { FinishServiceOrderDto } from './dto/finish-serviceOrder-dto';
import { PromoVideoStatus } from './promoVideoStatus.enum';
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
    serviceOrder.mileage_in = createServiceOrdesDto.mileage_in ?? null;

    return this.serviceOrdersRepository.save(serviceOrder);
  }

  async findEntityById(id: number): Promise<ServiceOrders> {
    const serviceOrder = await this.serviceOrdersRepository.findOne({
      where: {
        service_order_id: id,
      },
      relations: {
        tenant: true,
        user: true,
        car: {
          client: true,
        },
        sections: {
          medias: true,
          tests: true,
        },
      },
    });

    if (!serviceOrder) {
      throw new NotFoundException('Ordem de serviço não encontrada!');
    }

    return serviceOrder;
  }

  async findById(id: number) {
    const serviceOrder = await this.findEntityById(id);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    return {
      service_order_id: serviceOrder.service_order_id,
      status: serviceOrder.status,
      client_complaint: serviceOrder.client_complaint,
      created_at: serviceOrder.created_at,
      finished_at: serviceOrder.finished_at,
      root_cause: serviceOrder.root_cause,
      conclusion: serviceOrder.conclusion,
      final_verdict: serviceOrder.final_verdict,
      promo_video_status: serviceOrder.promo_video_status,
      public_token: serviceOrder.public_token,
      public_url: `${frontendUrl}/servico/${serviceOrder.public_token}`,
      // KM da OS (visita atual) — cai pro mileage_in do carro em OS antigas, que não tinham esse campo.
      mileage_in: serviceOrder.mileage_in ?? serviceOrder.car.mileage_in,

      tenant: {
        name: serviceOrder.tenant.name,
      },

      user: {
        user_id: serviceOrder.user.user_id,
        name: serviceOrder.user.name,
        email: serviceOrder.user.email,
      },

      car: {
        car_id: serviceOrder.car.car_id,
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
        email: serviceOrder.car.client.email,
        cpf: serviceOrder.car.client.cpf,
      },

      sections: await Promise.all(
        (serviceOrder.sections ?? []).map(async (section) => ({
          section_id: section.section_id,
          type: section.type,
          status: section.status,
          notes: section.notes,
          published_at: section.published_at,
          created_at: section.created_at,
          medias: await Promise.all(
            (section.medias ?? []).map(async (media) => ({
              media_id: media.media_id,
              type: media.type,
              bucket: media.bucket,
              object_name: media.object_name,
              mime_type: media.mime_type,
              size: media.size,
              label: media.label,
              created_at: media.created_at,
              url: await this.minioService.getPresignedUrl(media.object_name),
            })),
          ),
          tests: (section.tests ?? []).map((test) => ({
            test_id: test.test_id,
            title: test.title,
            measurements: test.measurements,
            test_type: test.test_type,
            data: test.data,
            verdict: test.verdict,
            notes: test.notes,
            created_at: test.created_at,
          })),
        })),
      ),
    };
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
          tests: true,
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
              media_id: media.media_id,
              type: media.type,
              object_name: media.object_name,
              label: media.label,
              mime_type: media.mime_type,
              url: await this.minioService.getPresignedUrl(media.object_name),
            })),
          ),
          tests: (section.tests ?? []).map((test) => ({
            title: test.title,
            measurements: test.measurements,
            test_type: test.test_type,
            data: test.data,
            verdict: test.verdict,
            notes: test.notes,
          })),
        })),
    );

    return {
      status: serviceOrder.status,
      client_complaint: serviceOrder.client_complaint,
      created_at: serviceOrder.created_at,
      finished_at: serviceOrder.finished_at,
      root_cause: serviceOrder.root_cause,
      conclusion: serviceOrder.conclusion,
      final_verdict: serviceOrder.final_verdict,
      mileage_in: serviceOrder.mileage_in ?? serviceOrder.car.mileage_in,
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

  async findAll(userId: number, status?: Status) {
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
        ...(status ? { status } : {}),
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
      mileage_in: serviceOrder.mileage_in ?? serviceOrder.car.mileage_in,
      tenant: {
        name: serviceOrder.tenant.name,
      },
      car: {
        car_id: serviceOrder.car.car_id,
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

  async findByCar(carId: number, userId: number) {
    const user = await this.usersService.findById(userId);
    const car = await this.carsService.findById(carId);

    if (!user.tenant || car.tenant.id !== user.tenant.id) {
      throw new ForbiddenException('Esse veículo não pertence ao tenant do usuário.');
    }

    const serviceOrders = await this.serviceOrdersRepository.find({
      where: { car: { car_id: carId } },
      order: { created_at: 'DESC' },
    });

    return serviceOrders.map((serviceOrder) => ({
      service_order_id: serviceOrder.service_order_id,
      status: serviceOrder.status,
      client_complaint: serviceOrder.client_complaint,
      created_at: serviceOrder.created_at,
      finished_at: serviceOrder.finished_at,
      mileage_in: serviceOrder.mileage_in ?? car.mileage_in,
    }));
  }

  async finish(
    orderId: number,
    finishServiceOrderDto: FinishServiceOrderDto,
    userId: number,
  ) {
    const order = await this.findEntityById(orderId);
    const user = await this.usersService.findById(userId);

    if (order.tenant.id !== user.tenant?.id) {
      throw new ForbiddenException(
        'Essa ordem de serviço não pertence ao tenant do usuário.',
      );
    }

    order.status = Status.DONE;
    order.finished_at = new Date();

    if (finishServiceOrderDto.root_cause !== undefined) {
      order.root_cause = finishServiceOrderDto.root_cause;
    }

    if (finishServiceOrderDto.conclusion !== undefined) {
      order.conclusion = finishServiceOrderDto.conclusion;
    }

    if (finishServiceOrderDto.final_verdict !== undefined) {
      order.final_verdict = finishServiceOrderDto.final_verdict;
    }

    const saved = await this.serviceOrdersRepository.save(order);

    return saved;
  }

  async setPromoVideoStatus(
    orderId: number,
    status: PromoVideoStatus,
  ): Promise<void> {
    await this.serviceOrdersRepository.update(orderId, {
      promo_video_status: status,
    });
  }
}
