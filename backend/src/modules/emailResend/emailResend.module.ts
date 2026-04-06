/* eslint-disable prettier/prettier */

import { Module } from '@nestjs/common';
import { EmailService } from './emailResend.service';

@Module({
  imports: [],
  controllers: [],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
