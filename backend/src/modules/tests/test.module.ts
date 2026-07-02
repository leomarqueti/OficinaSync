import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tests } from './test.entity';
import { TestsController } from './test.controller';
import { TestsService } from './test.service';
import { UsersModule } from '../users/users.module';
import { SectionsModule } from '../sections/section.module';
import { AuthModule } from '../AuthModule/authModule.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tests]),
    UsersModule,
    SectionsModule,
    AuthModule,
  ],
  controllers: [TestsController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}
