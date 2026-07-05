import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { Invites } from './invites.entity';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UsersService } from '../users/users.service';
import { EmailService } from '../emailResend/emailResend.service';
import { Role } from '../users/role.enum';

const INVITE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(Invites)
    private invitesRepository: Repository<Invites>,
    private usersService: UsersService,
    private emailService: EmailService,
    private jwtService: JwtService,
  ) {}

  async create(userId: number, dto: CreateInviteDto): Promise<void> {
    const inviter = await this.usersService.findById(userId);

    if (inviter.role !== Role.OWNER) {
      throw new ForbiddenException(
        'Só o dono da oficina pode convidar novos membros.',
      );
    }

    if (!inviter.tenant) {
      throw new ForbiddenException('Usuário sem oficina vinculada.');
    }

    const token = randomBytes(32).toString('hex');

    const invite = this.invitesRepository.create({
      token,
      email: dto.email,
      role: dto.role,
      expires_at: new Date(Date.now() + INVITE_EXPIRATION_MS),
      tenant: inviter.tenant,
      invitedBy: { user_id: userId },
    });

    await this.invitesRepository.save(invite);

    await this.emailService.sendInviteEmail(
      dto.email,
      token,
      inviter.tenant.name,
    );
  }

  async findPendingByTenant(userId: number) {
    const user = await this.usersService.findById(userId);

    if (!user.tenant) {
      throw new ForbiddenException('Usuário sem oficina vinculada.');
    }

    return this.invitesRepository.find({
      where: { tenant: { id: user.tenant.id } },
      order: { created_at: 'DESC' },
    });
  }

  private async findValidInvite(token: string): Promise<Invites> {
    const invite = await this.invitesRepository.findOne({
      where: { token },
      relations: { tenant: true },
    });

    if (!invite) {
      throw new UnauthorizedException('Convite inválido ou expirado.');
    }

    if (invite.used_at != null) {
      throw new UnauthorizedException('Convite já foi utilizado.');
    }

    if (new Date() > invite.expires_at) {
      throw new UnauthorizedException('Convite inválido ou expirado.');
    }

    return invite;
  }

  async preview(token: string) {
    const invite = await this.findValidInvite(token);

    return {
      email: invite.email,
      role: invite.role,
      tenant_name: invite.tenant.name,
    };
  }

  async accept(dto: AcceptInviteDto) {
    const invite = await this.findValidInvite(dto.token);

    const existing = await this.usersService.findByEmail(invite.email);

    if (existing) {
      throw new ConflictException('Já existe uma conta com esse email.');
    }

    const user = await this.usersService.createFromInvite(
      dto.name,
      invite.email,
      dto.password,
      invite.tenant,
      invite.role,
    );

    invite.used_at = new Date();
    await this.invitesRepository.save(invite);

    const payload = {
      sub: user.user_id,
      email: user.email,
      scope: 'access',
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
