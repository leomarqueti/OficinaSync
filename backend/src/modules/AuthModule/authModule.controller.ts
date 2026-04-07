/* eslint-disable prettier/prettier */
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './authService.service';
import { CreateUserDto } from '../users/dto/create-users.dto';
import { plainToInstance } from 'class-transformer';
import { ResponseAuthDto } from './dto/response-auth.dto';

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
}
