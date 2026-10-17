import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../AuthModule/authModule.module';
import { ServiceOrders } from '../serviceOrder/serviceOrder.entity';
import { ServiceOrdersModule } from '../serviceOrder/serviceOrder.module';
import { Users } from '../users/users.entity';
import { UsersModule } from '../users/users.module';
import { CommissionsController } from './commissions.controller';
import { InternalContextService } from './internal-context.service';
import { InternalController } from './internal.controller';
import { ServiceOrderParticipants } from './service-order-participant.entity';
import { ServiceOrderParts } from './service-order-part.entity';
import { ServiceOrderServices } from './service-order-service.entity';
import { MediaModule } from '../medias/media.module';
import { MinioModule } from '../minio/minio.module';
import { OfficeSheetService } from './office-sheet.service';
import { PartsService } from './parts.service';
import { TeamService } from './team.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ServiceOrders,
      ServiceOrderParts,
      ServiceOrderServices,
      ServiceOrderParticipants,
      Users,
    ]),
    UsersModule,
    AuthModule,
    ServiceOrdersModule,
    MinioModule,
    MediaModule,
  ],
  controllers: [InternalController, CommissionsController],
  providers: [InternalContextService, TeamService, PartsService, OfficeSheetService],
  exports: [InternalContextService],
})
export class InternalModule {}
