/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenants.dto';
import { TenantsService } from './tenants.service';
import { ResponseTenantDto } from './dto/response-tenants.dto';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  //Metodo post para criar a oficina, usando dto e httpcode com status created
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createTenantDto: CreateTenantDto,
    @Req() req: any,
  ): Promise<ResponseTenantDto> {
    const userId = req.user.sub;
    const email = req.user.email;
    const name = req.user.name;

    const tenant = await this.tenantsService.create(
      createTenantDto,
      userId,
      email,
      name,
    );

    return plainToInstance(ResponseTenantDto, tenant);
  }
}
