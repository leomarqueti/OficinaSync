/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CarsService } from './cars.service';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';
import { CreateCarDto } from './dto/create.cars.dto';
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
}
