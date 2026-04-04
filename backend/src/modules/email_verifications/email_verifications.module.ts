import { TypeOrmModule } from '@nestjs/typeorm';
import { Email_verificarions } from './email_verifications.entity';
import { Module } from '@nestjs/common';

@Module({
  imports: [TypeOrmModule.forFeature([Email_verificarions])],
  controllers: [],
  providers: [],
  exports: [TypeOrmModule],
})
export class Email_verificationsModule {}
