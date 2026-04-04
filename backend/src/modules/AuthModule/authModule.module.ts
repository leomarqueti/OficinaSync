import { Module } from '@nestjs/common';
import { Email_verificationsModule } from '../email_verifications/email_verifications.module';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';

@Module({
  imports: [Email_verificationsModule, UsersModule],
  controllers: [],
  providers: [UsersService],
})
export class AuthModule {}
