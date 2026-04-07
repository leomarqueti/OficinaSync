/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenants } from './tenants.entity';
import { EmailService } from '../emailResend/emailResend.service';
import { EmailModule } from '../emailResend/emailResend.module';
import { Email_verificationsModule } from '../email_verifications/email_verifications.module';
import { Email_verificationsService } from '../email_verifications/email_verifications.service';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { AuthModule } from '../AuthModule/authModule.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenants]),
    EmailModule,
    Email_verificationsModule,
    UsersModule,
    AuthModule
  ],
  controllers: [TenantsController],
  providers: [
    TenantsService,
    EmailService,
    Email_verificationsService,
    UsersService,
  ],
})
export class TenantsModule {}
