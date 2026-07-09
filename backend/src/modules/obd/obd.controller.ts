/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Ip,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';
import { ObdService } from './obd.service';
import { CreateObdDeviceDto } from './dto/create-obd-device.dto';
import { UpdateObdDeviceDto } from './dto/update-obd-device.dto';
import { ObdReadingDto } from './dto/obd-reading.dto';
import { ObdCommandDto } from './dto/obd-command.dto';
import { CaptureObdDto } from './dto/capture-obd.dto';

@Controller('obd')
export class ObdController {
  constructor(private readonly obdService: ObdService) {}

  // ------------------------------------------------------------------
  // Rotas do dispositivo (ESP32) — autenticadas por X-Device-Token.
  // ESP push: heartbeat 30s + reading 5s = bem abaixo do limite.
  // ------------------------------------------------------------------

  @Post('heartbeat')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async heartbeat(
    @Headers('x-device-token') token: string,
    @Ip() ip: string,
  ) {
    return this.obdService.heartbeat(token, ip);
  }

  @Post('reading')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async reading(
    @Headers('x-device-token') token: string,
    @Body() readingDto: ObdReadingDto,
    @Ip() ip: string,
  ) {
    return this.obdService.ingestReading(token, readingDto, ip);
  }

  // ------------------------------------------------------------------
  // Rotas do painel (JWT)
  // ------------------------------------------------------------------

  @Post('devices')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createDevice(
    @Body() createDto: CreateObdDeviceDto,
    @Req() req: any,
  ) {
    return this.obdService.createDevice(createDto, req.user.sub);
  }

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findAllDevices(@Req() req: any) {
    return this.obdService.findAllDevices(req.user.sub);
  }

  @Get('devices/:id/latest')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getLatest(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    return this.obdService.getLatest(id, req.user.sub);
  }

  @Post('devices/:id/command')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async setCommand(
    @Param('id', ParseIntPipe) id: number,
    @Body() commandDto: ObdCommandDto,
    @Req() req: any,
  ) {
    return this.obdService.setCommand(id, commandDto, req.user.sub);
  }

  @Patch('devices/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateDevice(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateObdDeviceDto,
    @Req() req: any,
  ) {
    return this.obdService.updateDevice(id, updateDto, req.user.sub);
  }

  @Delete('devices/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDevice(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<void> {
    await this.obdService.removeDevice(id, req.user.sub);
  }

  @Post('capture')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async capture(@Body() captureDto: CaptureObdDto, @Req() req: any) {
    return this.obdService.capture(captureDto, req.user.sub);
  }
}
