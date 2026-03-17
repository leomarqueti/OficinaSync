/* eslint-disable prettier/prettier */
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tenants } from './tenants.entity';
import { Repository } from 'typeorm';
import { CreateTenantDto } from './dto/create-tenants.dto';
import { Status } from './status.enum';
import { Plan } from './plan.enum';

@Injectable()
export class TenantsService {
  // aqui usamos injeção de dependecia para injetar o tenants dentro do service
  constructor(
    @InjectRepository(Tenants)
    private tenantsRepository: Repository<Tenants>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenants> {
    const newTenant = this.tenantsRepository.create(createTenantDto);

    const checkTenantExistence = await this.tenantsRepository.findOne({
      where: { cnpj: createTenantDto.cnpj },
    });

    if (checkTenantExistence) {
      throw new ConflictException('Oficina ja cadastrada!');
    }

    newTenant.plan = Plan.TRIAL;
    newTenant.status = Status.TRIAL;
    newTenant.trial_ends_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    return this.tenantsRepository.save(newTenant);
  }
}
