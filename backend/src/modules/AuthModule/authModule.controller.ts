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
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './authService.service';
import { CreateUserDto } from '../users/dto/create-users.dto';
import { plainToInstance } from 'class-transformer';
import { ResponseAuthDto } from './dto/response-auth.dto';
import { LoginDto } from './dto/login.dto';
import { TokenExpiredError } from '@nestjs/jwt';
import { ForgotPasswordDto } from '../password_resets/dto/forgot-password.dto';
import { ResetPasswordDto } from '../password_resets/dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
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
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Get('/verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string) {
    return await this.authService.verifyEmail(token);
  }

  @Post('/forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() body: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.forgotPassword(body.email);

    return {
      message:
        'Se esse email estiver cadastrado, você receberá um link pra redefinir a senha.',
    };
  }

  @Post('/reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: ResetPasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.resetPassword(body.token, body.new_password);

    return { message: 'Senha redefinida com sucesso.' };
  }
}
