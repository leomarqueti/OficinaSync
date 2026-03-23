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

  /*
   essa função fica responsavel por criar um tenants, ela recebe um dto 
  usamos o findone , para verificar se tem algum tenant ja cadastrado 
  com esses dados, assim evitamos varios cadastros iguais,
  caso nao tenha esse tenant , nos adicionamos o plano , e o status
  por padrao trial, para evitar que isso venha na requisiao de criação
  , dessa forma evitamos ataques onde o usuario manipule a requisiçao 
  para pro , sem ter pagado antes.
  por final , adicionamos a data de atual mais 7 dias que vai ser 
  o prazo para o trial
  */
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
