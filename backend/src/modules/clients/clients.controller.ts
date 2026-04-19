/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-clients-dto';
import { ResponseClientDto } from './dto/response-clients-dto';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createClientDto: CreateClientDto,
    @Req() req: any,
  ): Promise<ResponseClientDto> {
    const userId = req.user.sub;
    const client = await this.clientsService.create(createClientDto, userId);

    return plainToInstance(ResponseClientDto, client);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll() {
    return this.clientsService.findAll();
  }
}
