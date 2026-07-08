export class ExpManager {
  level = 1;
  exp = 0;
  get requiredExp() { return Math.floor(100 * Math.pow(1.15, this.level)); }
  add(amount: number): boolean {
    this.exp += amount;
    let leveled = false;
    while (this.exp >= this.requiredExp) {
      this.exp -= this.requiredExp;
      this.level += 1;
      leveled = true;
    }
    return leveled;
  }
}
