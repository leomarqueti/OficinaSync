import {
  HARD_UPLOAD_LIMIT_BYTES,
  checkUploadSize,
  exceedsQuota,
  uploadLimitFor,
} from './upload-limits';

const MB = 1024 * 1024;

describe('uploadLimitFor', () => {
  it('foto 15 MB, áudio 20 MB, vídeo 100 MB', () => {
    expect(uploadLimitFor('image/png')).toEqual({ kind: 'foto', maxBytes: 15 * MB });
    expect(uploadLimitFor('audio/mpeg')).toEqual({ kind: 'áudio', maxBytes: 20 * MB });
    expect(uploadLimitFor('video/mp4')).toEqual({ kind: 'vídeo', maxBytes: 100 * MB });
  });

  it('teto duro do multer é o maior limite (100 MB)', () => {
    expect(HARD_UPLOAD_LIMIT_BYTES).toBe(100 * MB);
  });
});

describe('checkUploadSize (fronteira)', () => {
  it('exatamente 15 MB de foto passa', () => {
    expect(checkUploadSize('image/png', 15 * MB)).toBeNull();
  });

  it('15 MB + 1 byte de foto é recusado com mensagem em português', () => {
    expect(checkUploadSize('image/png', 15 * MB + 1)).toBe(
      'Arquivo de foto muito grande. O limite é 15 MB.',
    );
  });

  it('vídeo de 100 MB passa, 100 MB + 1 não', () => {
    expect(checkUploadSize('video/mp4', 100 * MB)).toBeNull();
    expect(checkUploadSize('video/mp4', 100 * MB + 1)).toBe(
      'Arquivo de vídeo muito grande. O limite é 100 MB.',
    );
  });
});

describe('exceedsQuota (fronteira)', () => {
  it('fechar exatamente a cota é permitido; 1 byte a mais não', () => {
    expect(exceedsQuota(900, 100, 1000)).toBe(false);
    expect(exceedsQuota(900, 101, 1000)).toBe(true);
  });

  it('aguenta valores acima de 2 GB (sem overflow de int32)', () => {
    expect(exceedsQuota(4_000_000_000, 1, 4_000_000_000)).toBe(true);
    expect(exceedsQuota(3_999_999_999, 1, 4_000_000_000)).toBe(false);
  });
});
