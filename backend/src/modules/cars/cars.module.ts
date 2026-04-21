/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';

import { TypeOrmModule } from '@nestjs/typeorm';
import { Cars } from './cars.entity';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { UsersModule } from '../users/users.module';
import { ClientsModule } from '../clients/clients.module';
import { AuthModule } from '../AuthModule/authModule.module';
import { AuthService } from '../AuthModule/authService.service';
import { ClientsService } from '../clients/clients.service';
import { UsersService } from '../users/users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cars]),
    UsersModule,
    ClientsModule,
    AuthModule,
  ],
  controllers: [CarsController],
  providers: [CarsService, UsersService],
  exports: [CarsService],
})
export class CarsModule {}
