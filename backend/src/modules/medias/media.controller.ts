/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
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
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createMediaDto: CreateMediaDto,
    @Req() req: any,
  ): Promise<ResponseMediaDto> {
    const userId = req.user.sub;

    const media = await this.mediaService.create(createMediaDto, userId);

    return plainToInstance(ResponseMediaDto, media, {
      excludeExtraneousValues: true,
    });
  }
}
