import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { plainToInstance } from 'class-transformer';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { ResponseInviteDto } from './dto/response-invite.dto';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';

@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateInviteDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    await this.invitesService.create(req.user.sub, dto);

    return { message: 'Convite enviado com sucesso.' };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Req() req: any): Promise<ResponseInviteDto[]> {
    const invites = await this.invitesService.findPendingByTenant(
      req.user.sub,
    );

    return plainToInstance(ResponseInviteDto, invites);
  }

  @Get(':token')
  @HttpCode(HttpStatus.OK)
  async preview(@Param('token') token: string) {
    return this.invitesService.preview(token);
  }

  @Post('/accept')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async accept(@Body() dto: AcceptInviteDto) {
    return this.invitesService.accept(dto);
  }
}
