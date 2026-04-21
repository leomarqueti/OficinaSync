import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { ServiceOrders } from './serviceOrder.entity';
import { CreateServiceOrderDto } from './dto/create-serviceOrder-dto';
import { UsersService } from '../users/users.service';
import { CarsService } from '../cars/cars.service';

@Injectable()
export class ServiceOrdersService {
  constructor(
    @InjectRepository(ServiceOrders)
    private serviceOrdersRepository: Repository<ServiceOrders>,
    private usersService: UsersService,
    private carsService: CarsService,
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
}
