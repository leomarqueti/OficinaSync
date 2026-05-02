/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';
import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media-dto';
import { ResponseMediaDto } from './dto/response-media-dto';

@Controller('medias')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() createMediaDto: CreateMediaDto,
    @Req() req: any,
  ): Promise<ResponseMediaDto> {
    const userId = req.user.sub;

    const media = await this.mediaService.create(file, createMediaDto, userId);

    return plainToInstance(ResponseMediaDto, media, {
      excludeExtraneousValues: true,
    });
  }
}
