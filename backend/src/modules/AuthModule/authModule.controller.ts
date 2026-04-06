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
  }
}
