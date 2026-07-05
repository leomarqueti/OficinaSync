/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CarsService } from './cars.service';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';
import { CreateCarDto } from './dto/create.cars.dto';
import { UpdateCarDto } from './dto/update.cars.dto';
import { plainToInstance } from 'class-transformer';

import { ResponseCarDto } from './dto/response.cars.dto';

@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createCarDto: CreateCarDto,
    @Req() req: any,
  ): Promise<ResponseCarDto> {
    const userId = req.user.sub;
    const clientId = createCarDto.client_id;

    const car = await this.carsService.create(createCarDto, userId, clientId);

    return plainToInstance(ResponseCarDto, car);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('client_id') clientId: string | undefined,
    @Query('search') search: string | undefined,
    @Req() req: any,
  ): Promise<ResponseCarDto[]> {
    const userId = req.user.sub;

    const cars = clientId
      ? await this.carsService.findByClient(Number(clientId), userId)
      : await this.carsService.findAll(userId, search);

    return plainToInstance(ResponseCarDto, cars);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<ResponseCarDto> {
    const userId = req.user.sub;
    const car = await this.carsService.findOneScoped(id, userId);

    return plainToInstance(ResponseCarDto, car);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCarDto: UpdateCarDto,
    @Req() req: any,
  ): Promise<ResponseCarDto> {
    const userId = req.user.sub;
    const car = await this.carsService.update(id, updateCarDto, userId);

    return plainToInstance(ResponseCarDto, car);
  }
}
