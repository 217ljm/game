export class ReactionTestGame {
  public targetX: number = 0;
  public targetY: number = 0;
  public score: number = 0;
  public roundCount: number = 0;
  public maxRounds: number = 5;
  public isGameOver: boolean = false;
  public lastReactionMs: number = 0;

  constructor() {
    this.spawnNewTarget();
  }

  spawnNewTarget(): void {
    this.targetX = Math.floor(60 + Math.random() * 240);
    this.targetY = Math.floor(180 + Math.random() * 260);
  }

  clickTarget(reactionMs: number = 260): { hit: boolean; isComplete: boolean } {
    this.score += 1;
    this.roundCount += 1;
    this.lastReactionMs = reactionMs;
    if (this.roundCount >= this.maxRounds) {
      this.isGameOver = true;
      return { hit: true, isComplete: true };
    }
    this.spawnNewTarget();
    return { hit: true, isComplete: false };
  }
}
