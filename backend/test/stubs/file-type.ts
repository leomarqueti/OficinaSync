const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export async function fileTypeFromBuffer(
  buffer: Buffer,
): Promise<{ mime: string; ext: string } | undefined> {
  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { mime: 'image/png', ext: 'png' };
  }
  return undefined;
}
