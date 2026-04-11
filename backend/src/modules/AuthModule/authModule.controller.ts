/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { AuthService } from './authService.service';
import { CreateUserDto } from '../users/dto/create-users.dto';
import { plainToInstance } from 'class-transformer';
import { ResponseAuthDto } from './dto/response-auth.dto';
import { LoginDto } from './dto/login.dto';
import { TokenExpiredError } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() createUserDto: CreateUserDto,
  ): Promise<ResponseAuthDto> {
    const userRegister = await this.authService.register(createUserDto);

    return plainToInstance(ResponseAuthDto, userRegister);

    /* criamos o response-auth.dto, nele temos o onboarding e ele acessa
    o response userAuth (mudei o nome para ficar melhor) e retorna
      tudo filtrado , dessa forma nao retorna mais o json vazio e retorna
      junto o jwt para usar na validaçao dentro do /tenants
    */
  }

  @Post('/login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Get('/verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    return await this.authService.verifyEmail(token);
  }
}
