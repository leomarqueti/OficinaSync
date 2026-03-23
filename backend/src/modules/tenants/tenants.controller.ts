import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenants.dto';
import { TenantsService } from './tenants.service';
import { ResponseTenantDto } from './dto/response-tenants.dto';
import { plainToInstance } from 'class-transformer';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  //Metodo post para criar a oficina, usando dto e httpcode com status created
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createTenantDto: CreateTenantDto,
  ): Promise<ResponseTenantDto> {
    const tenant = await this.tenantsService.create(createTenantDto);

    return plainToInstance(ResponseTenantDto, tenant);
  }
}
