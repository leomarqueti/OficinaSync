/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';
import { SectionsService } from './section.service';
import { CreateSectionDto } from './dto/create-section-dto';
import { ResponseSectionDto } from './dto/response-section-dto';

@Controller('sections')
export class SectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createSectionDto: CreateSectionDto,
    @Req() req: any,
  ): Promise<ResponseSectionDto> {
    const userId = req.user.sub;

    const section = await this.sectionsService.create(createSectionDto, userId);

    return plainToInstance(ResponseSectionDto, section, {
      excludeExtraneousValues: true,
    });
  }

  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard)
  async publish(
    @Param('id', ParseIntPipe) sectionId: number,
    @Req() req: any,
  ): Promise<ResponseSectionDto> {
    const userId = req.user.sub;

    const sectionUpdate = await this.sectionsService.publish(sectionId, userId);

    return plainToInstance(ResponseSectionDto, sectionUpdate);
  }
}
