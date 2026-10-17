import { EmailService } from './emailResend.service';

const send = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({ emails: { send } })),
}));

const config = {
  get: (key: string) =>
    ({ RESEND_KEY: 're_test', FRONTEND_URL: 'https://app.local', BACKEND_URL: 'https://api.local' })[key],
};

describe('EmailService — HTML dos e-mails', () => {
  let service: EmailService;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ data: { id: '1' }, error: null });
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    service = new EmailService(config as never);
  });

  afterEach(() => logSpy.mockRestore());

  it('convite: nome da oficina com HTML vira texto (não dá pra montar phishing pelo domínio)', async () => {
    await service.sendInviteEmail('a@b.com', 'tok123', '<a href="https://golpe.com">Clique</a>');
    const html = send.mock.calls[0][0].html as string;
    expect(html).not.toContain('<a href="https://golpe.com">');
    expect(html).toContain('&lt;a href=&quot;https://golpe.com&quot;&gt;');
    expect(html).toContain('https://app.local/convite?token=tok123');
  });

  it('redefinir senha e verificação: nome escapado', async () => {
    await service.sendPasswordResetEmail('a@b.com', 'tok', '<img src=x onerror=1>');
    expect(send.mock.calls[0][0].html).not.toContain('<img src=x');

    await service.sendVerificationEmail('a@b.com', 'tok', 'Fulano');
    expect(send.mock.calls[1][0].html).toContain('https://api.local/auth/verify-email?token=tok');
  });

  it('assunto sem quebra de linha', async () => {
    await service.sendVerificationEmail('a@b.com', 'tok', 'Oi\r\nBcc: x@y.com');
    expect(send.mock.calls[0][0].subject).not.toMatch(/[\r\n]/);
  });

  it('não escreve o resultado do envio nem o token no console', async () => {
    await service.sendInviteEmail('a@b.com', 'tok-secreto', 'Oficina');
    expect(logSpy).not.toHaveBeenCalled();
  });
});
