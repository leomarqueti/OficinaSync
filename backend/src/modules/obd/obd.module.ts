import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ObdDevices } from './obdDevice.entity';
import { ObdController } from './obd.controller';
import { ObdService } from './obd.service';
import { UsersModule } from '../users/users.module';
import { ServiceOrdersModule } from '../serviceOrder/serviceOrder.module';
import { SectionsModule } from '../sections/section.module';
import { TestsModule } from '../tests/test.module';
import { AuthModule } from '../AuthModule/authModule.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ObdDevices]),
    UsersModule,
    ServiceOrdersModule,
    SectionsModule,
    TestsModule,
    AuthModule,
  ],
  controllers: [ObdController],
  providers: [ObdService],
  exports: [ObdService],
})
export class ObdModule {}
