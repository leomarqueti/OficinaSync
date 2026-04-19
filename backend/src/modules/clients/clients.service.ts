import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Clients } from './clients.entity';
import { CreateClientDto } from './dto/create-clients-dto';
import { Repository } from 'typeorm';

import { UsersService } from '../users/users.service';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Clients)
    private clientsRepository: Repository<Clients>,
    private usersService: UsersService,
  ) {}

  async create(
    createClientDto: CreateClientDto,
    userId: number,
  ): Promise<Clients> {
    const newClient = this.clientsRepository.create(createClientDto);
    const user = await this.usersService.findById(userId);

    if (!user.tenant) {
      throw new UnauthorizedException();
    }

    const tenant = user.tenant;

    const checkClientExistence = await this.clientsRepository.findOne({
      where: {
        cpf: createClientDto.cpf,
        tenant: {
          id: tenant.id,
        },
      },
      relations: ['tenant'],
    });

    if (checkClientExistence) {
      throw new ConflictException('Usuario ja cadastrado!');
    }

    if (user.tenant == null) {
      throw new UnauthorizedException();
    }

    newClient.tenant = user.tenant;
    return this.clientsRepository.save(newClient);
  }

  async findAll(): Promise<Clients[]> {
    return this.clientsRepository.find();
  }

  async findById(id: number) {
    const client = await this.clientsRepository.findOne({
      where: {
        client_id: id,
      },
      relations: {
        tenant: true,
      },
    });

    if (!client) {
      throw new Error('Usuario nao encontrado!');
    }

    return client;
  }
}
