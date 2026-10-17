import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { Invites } from './invites.entity';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../emailResend/emailResend.module';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invites]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        // o login NUNCA pode emitir token eterno: sem JWT_EXPIRES_IN no .env vale 1 dia
        signOptions: { expiresIn: (config.get<string>('JWT_EXPIRES_IN') || '1d') as never },
      }),
    }),
    UsersModule,
    EmailModule,
  ],
  controllers: [InvitesController],
  providers: [InvitesService, JwtAuthGuard],
  exports: [TypeOrmModule, InvitesService],
})
export class InvitesModule {}
