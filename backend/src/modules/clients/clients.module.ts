import { Module } from '@nestjs/common';
import { Clients } from './clients.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { AuthModule } from '../AuthModule/authModule.module';

@Module({
  imports: [TypeOrmModule.forFeature([Clients]), UsersModule, AuthModule],
  controllers: [ClientsController],
  providers: [ClientsService, UsersService],
  exports: [ClientsService],
})
export class ClientsModule {}
