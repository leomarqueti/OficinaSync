import { TypeOrmModule } from '@nestjs/typeorm';
import { Email_verifications } from './email_verifications.entity';
import { Module } from '@nestjs/common';
import { Email_verificationsService } from './email_verifications.service';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([Email_verifications]), UsersModule],
  controllers: [],
  providers: [Email_verificationsService, UsersService],
  exports: [TypeOrmModule, Email_verificationsService],
})
export class Email_verificationsModule {}
