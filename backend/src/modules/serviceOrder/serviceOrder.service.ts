/* eslint-disable @typescript-eslint/no-unsafe-enum-comparison */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { Cars } from '../cars/cars.entity';
import { Clients } from '../clients/clients.entity';
import { CompleteDataDto } from './dto/complete-data.dto';
import { ServiceOrders } from './serviceOrder.entity';
import { CreateServiceOrderDto } from './dto/create-serviceOrder-dto';
import { FinishServiceOrderDto } from './dto/finish-serviceOrder-dto';
import { PromoVideoStatus } from './promoVideoStatus.enum';
import { UsersService } from '../users/users.service';
import { CarsService } from '../cars/cars.service';
import { MinioService } from '../minio/minio.service';
import { Status } from './status.enum';
import { computeMissingData, isComplete } from './missing-data';
import { SectionType } from '../sections/typeSection.enum';

// Mesmo label usado em OsCreateWizardPage.tsx pra foto fixa de entrada "front".
const FRONT_PHOTO_LABEL = 'Frente do veículo';

@Injectable()
export class ServiceOrdersService {
  constructor(
    @InjectRepository(ServiceOrders)
    private serviceOrdersRepository: Repository<ServiceOrders>,
    private usersService: UsersService,
    private carsService: CarsService,
    private minioService: MinioService,
    @InjectDataSource()
    private dataSource: DataSource,
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

    if (car.tenant.id !== user.tenant.id) {
      throw new ForbiddenException(
        'Esse veículo não pertence ao tenant do usuário.',
      );
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

  async findById(id: number, userId: number) {
    const serviceOrder = await this.findEntityById(id);
    const user = await this.usersService.findById(userId);

    if (!user.tenant || serviceOrder.tenant.id !== user.tenant.id) {
      throw new ForbiddenException(
        'Essa ordem de serviço não pertence ao tenant do usuário.',
      );
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const missing = computeMissingData(
      serviceOrder.car,
      serviceOrder.car.client,
    );

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
      features: {
        promo_video: process.env.PROMO_VIDEO_ENABLED === 'true',
      },
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

      client: serviceOrder.car.client
        ? {
            client_id: serviceOrder.car.client.client_id,
            name: serviceOrder.car.client.name,
            phone: serviceOrder.car.client.phone,
            email: serviceOrder.car.client.email,
            cpf: serviceOrder.car.client.cpf,
            address: serviceOrder.car.client.address,
          }
        : null,
      missing_data: missing,
      is_complete: isComplete(missing),

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
      // página pública (link no WhatsApp): só o nome, pra saudação — telefone/CPF nunca saem aqui
      client: serviceOrder.car.client
        ? { name: serviceOrder.car.client.name }
        : null,
      sections: publishedSections,
    };
  }

  async findAll(userId: number, status?: Status) {
    const user = await this.usersService.findById(userId);

    if (!user.tenant) {
      throw new NotFoundException('Oficina não encontrada!');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const qb = this.serviceOrdersRepository
      .createQueryBuilder('so')
      .leftJoinAndSelect('so.tenant', 'tenant')
      .leftJoinAndSelect('so.car', 'car')
      .leftJoinAndSelect('car.client', 'client')
      .leftJoinAndSelect(
        'so.sections',
        'section',
        'section.type = :checkinType',
        { checkinType: SectionType.CHECKIN },
      )
      .leftJoinAndSelect(
        'section.medias',
        'media',
        'media.label = :frontLabel',
        { frontLabel: FRONT_PHOTO_LABEL },
      )
      .where('tenant.id = :tenantId', { tenantId: user.tenant.id })
      .orderBy('so.created_at', 'DESC');

    if (status) {
      qb.andWhere('so.status = :status', { status });
    }

    const serviceOrders = await qb.getMany();

    const photoUrls = await Promise.all(
      serviceOrders.map((serviceOrder) => {
        const photoMedia = serviceOrder.sections?.[0]?.medias?.[0];
        return photoMedia
          ? this.minioService.getPresignedUrl(photoMedia.object_name)
          : Promise.resolve(null);
      }),
    );

    return serviceOrders.map((serviceOrder, index) => {
      const missing = computeMissingData(
        serviceOrder.car,
        serviceOrder.car.client,
      );

      return {
        service_order_id: serviceOrder.service_order_id,
        status: serviceOrder.status,
        client_complaint: serviceOrder.client_complaint,
        created_at: serviceOrder.created_at,
        public_token: serviceOrder.public_token,
        public_url: `${frontendUrl}/servico/${serviceOrder.public_token}`,
        mileage_in: serviceOrder.mileage_in ?? serviceOrder.car.mileage_in,
        photo_url: photoUrls[index],
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
        client: serviceOrder.car.client
          ? {
              name: serviceOrder.car.client.name,
              phone: serviceOrder.car.client.phone,
            }
          : null,
        missing_data: missing,
        is_complete: isComplete(missing),
      };
    });
  }

  async findByCar(carId: number, userId: number) {
    const user = await this.usersService.findById(userId);
    const car = await this.carsService.findById(carId);

    if (!user.tenant || car.tenant.id !== user.tenant.id) {
      throw new ForbiddenException(
        'Esse veículo não pertence ao tenant do usuário.',
      );
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

  /**
   * Completa, de uma vez e em transação, o que faltou na abertura rápida: usa um cliente
   * já cadastrado (`client_id`), completa o cliente atual ou cria um novo (`client`), e
   * completa o carro (`car`). Mapeia campo a campo — nada de Object.assign com o corpo.
   */
  async completeData(orderId: number, dto: CompleteDataDto, userId: number) {
    const user = await this.usersService.findById(userId);
    const order = await this.findEntityById(orderId);

    if (!user.tenant || order.tenant.id !== user.tenant.id) {
      throw new ForbiddenException(
        'Essa ordem de serviço não pertence ao tenant do usuário.',
      );
    }

    // null chega aqui como "não enviado" (@IsOptional deixa null passar)
    if (dto.client_id != null && dto.client) {
      throw new BadRequestException(
        'Envie client_id (usar cliente já cadastrado) OU client (dados do cliente), não os dois.',
      );
    }

    const tenant = user.tenant;

    await this.dataSource.transaction(async (manager) => {
      const carRepo = manager.getRepository(Cars);
      const clientRepo = manager.getRepository(Clients);

      const car = await carRepo.findOneOrFail({
        where: { car_id: order.car.car_id },
        relations: { client: true },
      });
      let client: Clients | null = car.client ?? null;

      if (dto.client_id != null) {
        const existing = await clientRepo.findOne({
          where: { client_id: dto.client_id },
          relations: { tenant: true },
        });

        if (!existing) {
          throw new NotFoundException('Cliente não encontrado!');
        }
        if (existing.tenant.id !== tenant.id) {
          throw new ForbiddenException(
            'Esse cliente não pertence ao tenant do usuário.',
          );
        }

        client = existing;
      } else if (dto.client) {
        const input = dto.client;

        if (input.cpf) {
          const clash = await clientRepo.findOne({
            where: { cpf: input.cpf, tenant: { id: tenant.id } },
          });

          if (clash && clash.client_id !== client?.client_id) {
            throw new ConflictException({
              message: 'Já existe um cliente com esse CPF.',
              existing_client: { client_id: clash.client_id, name: clash.name },
            });
          }
        }

        if (!client) {
          if (!input.name?.trim()) {
            throw new BadRequestException(
              'Informe pelo menos o nome do cliente.',
            );
          }
          client = clientRepo.create({ name: input.name.trim(), tenant });
        }

        if (input.name != null) client.name = input.name.trim();
        if (input.phone != null) client.phone = input.phone;
        if (input.cpf != null) client.cpf = input.cpf;
        if (input.address != null) client.address = input.address.trim();
        if (input.email != null) client.email = input.email;

        client = await clientRepo.save(client);
      }

      if (dto.car) {
        const input = dto.car;

        if (input.brand != null) car.brand = input.brand.trim();
        if (input.model != null) car.model = input.model.trim();
        if (input.year != null) car.year = input.year;
        if (input.fuel_type != null) car.fuel_type = input.fuel_type;
        if (input.color != null) car.color = input.color.trim();
        if (input.chassis != null) {
          car.chassis = input.chassis.trim().toUpperCase();
        }
        if (input.mileage_in != null) car.mileage_in = input.mileage_in;
      }

      car.client = client;
      await carRepo.save(car);
    });

    const fresh = await this.findEntityById(orderId);
    const missing = computeMissingData(fresh.car, fresh.car.client);

    return {
      client_id: fresh.car.client?.client_id ?? null,
      missing_data: missing,
      is_complete: isComplete(missing),
    };
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

    const missing = computeMissingData(order.car, order.car.client);

    if (!isComplete(missing)) {
      throw new ConflictException({
        message: 'Faltam dados do cliente ou do veículo para finalizar a OS.',
        missing_data: missing,
      });
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
