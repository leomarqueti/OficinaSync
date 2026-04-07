/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tenants } from './tenants.entity';
import { Repository } from 'typeorm';
import { CreateTenantDto } from './dto/create-tenants.dto';
import { Status } from './status.enum';
import { Plan } from './plan.enum';
import { EmailService } from '../emailResend/emailResend.service';
import { randomBytes } from 'crypto';
import { Email_verificationsService } from '../email_verifications/email_verifications.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class TenantsService {
  // aqui usamos injeção de dependecia para injetar o tenants dentro do service
  constructor(
    @InjectRepository(Tenants)
    private tenantsRepository: Repository<Tenants>,
    private emailService: EmailService,
    private email_verificationService: Email_verificationsService,
    private usersService: UsersService,
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

  ----- 07/04/2026

  Agora essa função recebe o id do usuario para a conseguirmos vincular
  o user e o tenant, recebe o email e o nome para charmamos a funçao
  que envia um token de verificação para o email do usuario 
  */
  async create(
    createTenantDto: CreateTenantDto,
    userId: number,
    email,
    name,
  ): Promise<Tenants> {
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

    const saveTenant = await this.tenantsRepository.save(newTenant);

    // usamos a biblioteca cryptp para criar um token de 32 bits e hexadecimal
    const token = randomBytes(32).toString('hex');

    //Agora vamos chamar a funçao de criar a verificacao de email
    await this.email_verificationService.saveToken(userId, token);
    console.log(token);
    this.emailService.sendVerificationEmail(email, token, name);

    // vamos vincular o user com o tenant
    await this.usersService.updateTenantId(userId, saveTenant);

    return saveTenant;
  }
}
