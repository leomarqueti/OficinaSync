import { Module } from '@nestjs/common';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { ServiceOrdersModule } from '../serviceOrder/serviceOrder.module';
import { UsersModule } from '../users/users.module';
import { MinioModule } from '../minio/minio.module';
import { AuthModule } from '../AuthModule/authModule.module';

@Module({
  imports: [ServiceOrdersModule, UsersModule, MinioModule, AuthModule],
  controllers: [ReportController],
  providers: [ReportService],
})
export class ReportModule {}
