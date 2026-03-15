/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tenants } from './tenants.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TenantsService {
    constructor(
      @InjectRepository(Tenants)
      private tenantsRepository: Repository<Tenants>,  
    ){}


   
}
