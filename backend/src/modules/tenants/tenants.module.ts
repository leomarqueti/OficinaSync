import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenants } from './tenants.entity';
import { EmailService } from '../emailResend/emailResend.service';
import { EmailModule } from '../emailResend/emailResend.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tenants]), EmailModule],
  controllers: [TenantsController],
  providers: [TenantsService, EmailService],
})
export class TenantsModule {}
