export class SeededRng {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed || 1;
  }

  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 0xffffffff;
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
}
