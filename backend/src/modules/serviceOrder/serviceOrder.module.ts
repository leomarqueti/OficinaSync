import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

import { ServiceOrders } from './serviceOrder.entity';
import { ServiceOrdersController } from './serviceOrder.controller';
import { ServiceOrdersService } from './serviceOrder.service';
import { CarsModule } from '../cars/cars.module';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../AuthModule/authModule.module';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServiceOrders]),
    CarsModule,
    UsersModule,
    AuthModule,
    MinioModule,
  ],
  controllers: [ServiceOrdersController],
  providers: [ServiceOrdersService],
  exports: [TypeOrmModule, ServiceOrdersService],
})
export class ServiceOrdersModule {}
