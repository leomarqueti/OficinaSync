/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { Email_verificationsModule } from '../email_verifications/email_verifications.module';
import { UsersModule } from '../users/users.module';
import { UsersService } from '../users/users.service';
import { Email_verificationsService } from '../email_verifications/email_verifications.service';
import { PasswordResetsModule } from '../password_resets/password_resets.module';
import { PasswordResetsService } from '../password_resets/password_resets.service';
import { EmailModule } from '../emailResend/emailResend.module';
import { EmailService } from '../emailResend/emailResend.service';
import { AuthController } from './authModule.controller';
import { AuthService } from './authService.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
    Email_verificationsModule,
    PasswordResetsModule,
    EmailModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    UsersService,
    Email_verificationsService,
    PasswordResetsService,
    EmailService,
    AuthService,
    JwtAuthGuard,
  ],
  exports: [AuthService, JwtModule, JwtAuthGuard],
})
export class AuthModule {}
