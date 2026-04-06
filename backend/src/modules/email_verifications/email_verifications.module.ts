import { TypeOrmModule } from '@nestjs/typeorm';
import { Email_verifications } from './email_verifications.entity';
import { Module } from '@nestjs/common';
import { Email_verificationsService } from './email_verifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([Email_verifications])],
  controllers: [],
  providers: [Email_verificationsService],
  exports: [TypeOrmModule, Email_verificationsService],
})
export class Email_verificationsModule {}
