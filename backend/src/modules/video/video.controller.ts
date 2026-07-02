/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';
import { VideoService } from './video.service';

@Controller('service_orders')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post(':id/promo-video')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  async triggerPromoVideo(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    const promo_video_status = await this.videoService.triggerPromoVideo(
      id,
      userId,
    );

    return { promo_video_status };
  }
}
