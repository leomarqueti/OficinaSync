import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cars } from './cars.entity';
import { CreateCarDto } from './dto/create.cars.dto';
import { UpdateCarDto } from './dto/update.cars.dto';
import { ILike, Repository } from 'typeorm';
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

  async findByClient(clientId: number, userId: number): Promise<Cars[]> {
    const user = await this.usersService.findById(userId);
    const client = await this.clientsService.findById(clientId);

    if (!user.tenant) {
      throw new UnauthorizedException();
    }

    if (user.tenant.id !== client.tenant.id) {
      throw new UnauthorizedException();
    }

    return this.carsRepository.find({
      where: { client: { client_id: clientId } },
      order: { created_at: 'DESC' },
    });
  }

  async findAll(userId: number, search?: string): Promise<Cars[]> {
    const user = await this.usersService.findById(userId);

    if (!user.tenant) {
      throw new UnauthorizedException();
    }

    const tenantId = user.tenant.id;
    const term = search?.trim();

    if (!term) {
      return this.carsRepository.find({
        where: { tenant: { id: tenantId } },
        relations: { client: true },
        order: { created_at: 'DESC' },
        take: 50,
      });
    }

    return this.carsRepository.find({
      where: [
        { tenant: { id: tenantId }, plate: ILike(`%${term}%`) },
        { tenant: { id: tenantId }, model: ILike(`%${term}%`) },
        { tenant: { id: tenantId }, brand: ILike(`%${term}%`) },
      ],
      relations: { client: true },
      order: { created_at: 'DESC' },
      take: 20,
    });
  }

  async update(
    carId: number,
    updateCarDto: UpdateCarDto,
    userId: number,
  ): Promise<Cars> {
    const user = await this.usersService.findById(userId);
    const car = await this.findById(carId);

    if (!user.tenant || car.tenant.id !== user.tenant.id) {
      throw new ForbiddenException('Esse veículo não pertence ao tenant do usuário.');
    }

    Object.assign(car, updateCarDto);

    return this.carsRepository.save(car);
  }

  async findOneScoped(carId: number, userId: number): Promise<Cars> {
    const user = await this.usersService.findById(userId);
    const car = await this.findById(carId);

    if (!user.tenant || car.tenant.id !== user.tenant.id) {
      throw new ForbiddenException('Esse veículo não pertence ao tenant do usuário.');
    }

    return car;
  }
}
