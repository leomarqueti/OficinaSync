import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as QRCode from 'qrcode';
import { Invites } from './invites.entity';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UsersService } from '../users/users.service';
import { EmailService } from '../emailResend/emailResend.service';
import { Role } from '../users/role.enum';
import { Users } from '../users/users.entity';
import { isWeakPin, normalizePhone } from '../users/pin-policy';

const EMAIL_INVITE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias (convite por e-mail, como antes)
const PHONE_INVITE_MS = 24 * 60 * 60 * 1000; // 24 h (link mandado no WhatsApp / QR)

export type InviteLink = {
  message: string;
  link: string;
  qr_data_url: string;
  expires_at: Date;
  /** só no convite por e-mail: false = o e-mail não saiu (o link continua valendo pelo WhatsApp/QR) */
  email_sent?: boolean;
};

@Injectable()
export class InvitesService {
  constructor(
    @InjectRepository(Invites)
    private invitesRepository: Repository<Invites>,
    private usersService: UsersService,
    private emailService: EmailService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  /** Só o dono convida / gera acesso; devolve o dono com a oficina. */
  private async requireOwner(userId: number): Promise<Users & { tenant: NonNullable<Users['tenant']> }> {
    const owner = await this.usersService.findById(userId);
    if (owner.role !== Role.OWNER) {
      throw new ForbiddenException('Só o dono da oficina pode convidar novos membros.');
    }
    if (!owner.tenant) {
      throw new ForbiddenException('Usuário sem oficina vinculada.');
    }
    return owner as Users & { tenant: NonNullable<Users['tenant']> };
  }

  private async linkFor(token: string, expires_at: Date, message: string): Promise<InviteLink> {
    const base = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    const link = `${base}/convite?token=${token}`;
    const qr_data_url = await QRCode.toDataURL(link, { margin: 1, width: 320 });
    return { message, link, qr_data_url, expires_at };
  }

  async create(userId: number, dto: CreateInviteDto): Promise<InviteLink> {
    const owner = await this.requireOwner(userId);

    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Informe o celular (ou o e-mail) do funcionário.');
    }
    if (dto.phone && !dto.name?.trim()) {
      throw new BadRequestException('Informe o nome do funcionário.');
    }
    if (dto.phone && (await this.usersService.findByPhone(dto.phone))) {
      throw new ConflictException('Esse celular já está cadastrado.');
    }

    const byPhone = Boolean(dto.phone);
    const token = randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + (byPhone ? PHONE_INVITE_MS : EMAIL_INVITE_MS));

    await this.invitesRepository.save(
      this.invitesRepository.create({
        token,
        email: dto.email ?? null,
        phone: dto.phone ? normalizePhone(dto.phone) : null,
        name: dto.name?.trim() || null,
        role: dto.role,
        expires_at,
        tenant: owner.tenant,
        invitedBy: { user_id: userId },
      }),
    );

    if (dto.email) {
      // e-mail falhando (provedor fora, domínio sem verificação) não pode derrubar o convite:
      // o dono ainda tem o link pra mandar pelo WhatsApp/QR
      const email_sent = await this.emailService
        .sendInviteEmail(dto.email, token, owner.tenant.name)
        .then(() => true)
        .catch(() => false);
      const result = await this.linkFor(
        token,
        expires_at,
        email_sent ? 'Convite enviado por e-mail.' : 'Convite criado, mas o e-mail não saiu. Mande o link pelo WhatsApp.',
      );
      return { ...result, email_sent };
    }

    return this.linkFor(token, expires_at, 'Convite criado.');
  }

  /** "Novo acesso" (esqueceu o PIN): link de uso único que troca o PIN; invalida os anteriores. */
  async createAccessLink(userId: number, targetUserId: number): Promise<InviteLink> {
    const owner = await this.requireOwner(userId);
    const target = await this.usersService.findById(targetUserId).catch(() => null);

    if (!target || target.tenant?.id !== owner.tenant.id) {
      throw new ForbiddenException('Esse funcionário não é da sua oficina.');
    }
    if (!target.is_active) {
      throw new BadRequestException('Funcionário desativado. Reative antes de mandar um novo acesso.');
    }
    if (!target.phone) {
      throw new BadRequestException('Esse funcionário entra com e-mail e senha, não com PIN.');
    }

    await this.invitesRepository.update(
      { targetUser: { user_id: target.user_id }, used_at: IsNull() },
      { used_at: new Date() },
    );

    const token = randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + PHONE_INVITE_MS);
    await this.invitesRepository.save(
      this.invitesRepository.create({
        token,
        email: null,
        phone: target.phone,
        name: target.name,
        role: target.role,
        expires_at,
        tenant: owner.tenant,
        invitedBy: { user_id: userId },
        targetUser: { user_id: target.user_id },
      }),
    );

    return this.linkFor(token, expires_at, 'Novo acesso criado.');
  }

  async findPendingByTenant(userId: number) {
    const user = await this.usersService.findById(userId);

    if (!user.tenant) {
      throw new ForbiddenException('Usuário sem oficina vinculada.');
    }

    // links de "novo acesso" não são convites: não aparecem na lista
    return this.invitesRepository.find({
      where: { tenant: { id: user.tenant.id }, targetUser: IsNull() },
      order: { created_at: 'DESC' },
    });
  }

  private async findValidInvite(token: string): Promise<Invites> {
    const invite = await this.invitesRepository.findOne({
      where: { token },
      relations: { tenant: true, targetUser: true },
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

  private kindOf(invite: Invites): 'email' | 'phone' | 'access' {
    if (invite.targetUser) return 'access';
    return invite.phone ? 'phone' : 'email';
  }

  async preview(token: string) {
    const invite = await this.findValidInvite(token);

    return {
      email: invite.email,
      phone: invite.phone,
      name: invite.name,
      role: invite.role,
      tenant_name: invite.tenant.name,
      kind: this.kindOf(invite),
    };
  }

  async accept(dto: AcceptInviteDto) {
    const invite = await this.findValidInvite(dto.token);
    const kind = this.kindOf(invite);
    let user: Users;

    if (kind === 'email') {
      if (!dto.password || !dto.name) {
        throw new BadRequestException('Informe seu nome e uma senha.');
      }
      if (await this.usersService.findByEmail(invite.email as string)) {
        throw new ConflictException('Já existe uma conta com esse email.');
      }
      user = await this.usersService.createFromInvite(
        dto.name,
        invite.email as string,
        dto.password,
        invite.tenant,
        invite.role,
      );
    } else {
      if (!dto.pin || isWeakPin(dto.pin)) {
        throw new BadRequestException('PIN fácil demais. Evite números repetidos ou em sequência (ex.: 123456).');
      }
      if (kind === 'access') {
        const target = invite.targetUser as Users;
        if (!target.is_active) throw new UnauthorizedException('Acesso desativado.');
        await this.usersService.setPin(target.user_id, dto.pin);
        user = target;
      } else {
        user = await this.usersService.createFromPhoneInvite(
          dto.name?.trim() || (invite.name as string),
          invite.phone as string,
          dto.pin,
          invite.tenant,
          invite.role,
        );
      }
    }

    invite.used_at = new Date();
    await this.invitesRepository.save(invite);

    return {
      access_token: await this.jwtService.signAsync({ sub: user.user_id, email: user.email ?? null, scope: 'access' }),
    };
  }
}
