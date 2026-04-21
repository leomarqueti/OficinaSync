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
}
