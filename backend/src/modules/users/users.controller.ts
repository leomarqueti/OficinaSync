/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-users.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: any,
  ): Promise<{ message: string }> {
    const userId = req.user.sub;
    const user = await this.usersService.findHashPasswordById(userId);

    const isValid = await this.usersService.verifyHash(
      changePasswordDto.current_password,
      user.password_hash,
    );

    if (!isValid) {
      throw new UnauthorizedException('Senha atual incorreta.');
    }

    await this.usersService.updatePassword(
      userId,
      changePasswordDto.new_password,
    );

    return { message: 'Senha atualizada com sucesso.' };
  }
}
