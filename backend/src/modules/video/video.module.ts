import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { ServiceOrdersModule } from '../serviceOrder/serviceOrder.module';
import { UsersModule } from '../users/users.module';
import { SectionsModule } from '../sections/section.module';
import { MediaModule } from '../medias/media.module';
import { MinioModule } from '../minio/minio.module';
import { AuthModule } from '../AuthModule/authModule.module';

@Module({
  imports: [
    ServiceOrdersModule,
    UsersModule,
    SectionsModule,
    MediaModule,
    MinioModule,
    AuthModule,
  ],
  controllers: [VideoController],
  providers: [VideoService],
})
export class VideoModule {}
