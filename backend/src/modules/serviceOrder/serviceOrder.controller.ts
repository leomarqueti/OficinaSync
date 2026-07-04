/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ServiceOrdersService } from './serviceOrder.service';
import { CreateServiceOrderDto } from './dto/create-serviceOrder-dto';
import { FinishServiceOrderDto } from './dto/finish-serviceOrder-dto';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';
import { ResponseServiceOrderDto } from './dto/response-serviceOrder-dto';
import { plainToInstance } from 'class-transformer';
import { Status } from './status.enum';

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
  async findAll(@Req() req: any, @Query('status') status?: string) {
    const userId = req.user.sub;
    const validStatus = Object.values(Status).includes(status as Status)
      ? (status as Status)
      : undefined;

    return this.serviceOrdersService.findAll(userId, validStatus);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.serviceOrdersService.findById(id);
  }

  @Patch('/:id/finish')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async finish(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() finishServiceOrderDto: FinishServiceOrderDto,
  ) {
    const userId = req.user.sub;

    return this.serviceOrdersService.finish(id, finishServiceOrderDto, userId);
  }
}
