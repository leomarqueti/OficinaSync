import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PasswordResets } from './password_resets.entity';
import { PasswordResetsService } from './password_resets.service';

@Module({
  imports: [TypeOrmModule.forFeature([PasswordResets])],
  controllers: [],
  providers: [PasswordResetsService],
  exports: [TypeOrmModule, PasswordResetsService],
})
export class PasswordResetsModule {}
