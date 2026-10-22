/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { plainToInstance } from 'class-transformer';
import { ResponseUserDto } from './dto/response-users.dto';
import { JwtAuthGuard } from '../AuthModule/jwt-auth.guard';
import { SetActiveDto } from './dto/set-active.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any): Promise<ResponseUserDto> {
    const user = await this.usersService.findById(req.user.sub);

    return plainToInstance(ResponseUserDto, user);
  }

  /** Equipe da oficina (só o dono), com celular/e-mail e quem está desativado. */
  @Get('members')
  @UseGuards(JwtAuthGuard)
  async members(@Req() req: any) {
    return this.usersService.listMembers(req.user.sub);
  }

  @Patch(':id/active')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async setActive(@Param('id', ParseIntPipe) id: number, @Body() dto: SetActiveDto, @Req() req: any) {
    return this.usersService.setActive(req.user.sub, id, dto.active);
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
      user.password_hash!, // findHashPasswordById já recusa usuário sem senha
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
