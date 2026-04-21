import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sections } from './section.entity';
import { SectionsController } from './section.controller';
import { SectionsService } from './section.service';
import { UsersModule } from '../users/users.module';
import { ServiceOrdersModule } from '../serviceOrder/serviceOrder.module';
import { AuthModule } from '../AuthModule/authModule.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sections]),
    UsersModule,
    ServiceOrdersModule,
    AuthModule,
  ],
  controllers: [SectionsController],
  providers: [SectionsService],
  exports: [SectionsService],
})
export class SectionsModule {}
