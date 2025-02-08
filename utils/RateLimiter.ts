export class RateLimiter {
  private intervalMs: number;
  private lastTime: number;

  constructor(callsPerSecond: number) {
    this.intervalMs = 1000 / callsPerSecond;
    this.lastTime = 0;
  }

  async waitForNext(): Promise<void> {
    const now = Date.now();
    const waitTime = this.lastTime + this.intervalMs - now;
    if (waitTime > 0) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastTime = Date.now();
  }
}
