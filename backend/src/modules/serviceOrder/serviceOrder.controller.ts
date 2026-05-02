/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
import { ServiceOrdersService } from './serviceOrder.service';
import { CreateServiceOrderDto } from './dto/create-serviceOrder-dto';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';
import { ResponseServiceOrderDto } from './dto/response-serviceOrder-dto';
import { plainToInstance } from 'class-transformer';

@Controller('service_orders')
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createServiceOrderDto: CreateServiceOrderDto,
    @Req() req: any,
  ): Promise<ResponseServiceOrderDto> {
    const userId = req.user.sub;
    const serviceOrder = await this.serviceOrdersService.create(
      createServiceOrderDto,
      userId,
    );
    return plainToInstance(ResponseServiceOrderDto, serviceOrder);
  }

  @Get('public/:token')
  @HttpCode(HttpStatus.OK)
  async findByPublicToken(@Param('token') token: string) {
    return this.serviceOrdersService.findByPublicToken(token);
  }

  @Get('/orders')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findAll(@Req() req: any) {
    const userId = req.user.sub;

    return this.serviceOrdersService.findAll(userId);
  }
}
