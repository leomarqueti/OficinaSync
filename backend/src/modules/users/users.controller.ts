/* eslint-disable prettier/prettier */
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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-users.dto';
import { plainToInstance } from 'class-transformer';
import { ResponseUserDto } from './dto/response-users.dto';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<ResponseUserDto> {
    const user = await this.usersService.create(createUserDto);

    return plainToInstance(ResponseUserDto, user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any): Promise<ResponseUserDto> {
    const user = await this.usersService.findById(req.user.sub);

    return plainToInstance(ResponseUserDto, user);
  }
}
