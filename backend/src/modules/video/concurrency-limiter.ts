/** Limita quantas tarefas pesadas (ffmpeg) rodam ao mesmo tempo no processo. */
export class ConcurrencyLimiter {
  private running = 0;

  constructor(private readonly max: number) {}

  tryAcquire(): boolean {
    if (this.running >= this.max) return false;
    this.running += 1;
    return true;
  }

  release(): void {
    this.running = Math.max(0, this.running - 1);
  }
}
