import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cars } from './cars.entity';
import { CreateCarDto } from './dto/create.cars.dto';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { ClientsService } from '../clients/clients.service';

@Injectable()
export class CarsService {
  constructor(
    @InjectRepository(Cars)
    private carsRepository: Repository<Cars>,
    private usersService: UsersService,
    private clientsService: ClientsService,
  ) {}

  async create(
    createCarsDto: CreateCarDto,
    userId: number,
    clientId: number,
  ): Promise<Cars> {
    const newCar = this.carsRepository.create(createCarsDto);

    const user = await this.usersService.findById(userId);

    const client = await this.clientsService.findById(clientId);

    if (!user.tenant) {
      throw new UnauthorizedException();
    }

    const idTenat = user.tenant?.id;

    const idClientTenant = client.tenant.id;

    if (idTenat != idClientTenant) {
      throw new UnauthorizedException();
    }

    newCar.tenant = user.tenant;
    newCar.client = client;

    return this.carsRepository.save(newCar);
  }

  async findById(id: number) {
    const client = await this.carsRepository.findOne({
      where: {
        car_id: id,
      },
      relations: {
        tenant: true,
        client: true,
      },
    });

    if (!client) {
      throw new Error('Carro nao encontrado!');
    }

    return client;
  }
}
