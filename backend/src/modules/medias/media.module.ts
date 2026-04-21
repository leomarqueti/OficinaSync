import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Media } from './media.entity';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { UsersModule } from '../users/users.module';
import { SectionsModule } from '../sections/section.module';
import { AuthModule } from '../AuthModule/authModule.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Media]),
    UsersModule,
    SectionsModule,
    AuthModule,
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
