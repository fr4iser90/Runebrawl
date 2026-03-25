import type { CombatOwnerId, GameEvent } from "./events.js";

export type EffectId =
  | "GAIN_GOLD"
  | "RESOLVE_ATTACK_HIT"
  | "BLOODLUST_ON_KILL"
  | "DEATH_BURST_ON_DEATH"
  | "LIFESTEAL_ON_HIT"
  | "BERSERKER_ON_HIT_BUFF";

type EffectParams = Record<string, number | string | boolean | undefined>;

export interface EffectContext {
  player?: { gold: number };
  maxGold?: number;
  attacker?: { attack: number; hp: number; maxHp: number; name: string };
  sourceUnit?: { ownerId: CombatOwnerId; slotIndex: number; name: string; attack: number; hp: number; maxHp?: number };
  targetUnit?: { ownerId: CombatOwnerId; slotIndex: number; name: string; hp: number };
  log?: string[];
}

type EffectHandler = (event: GameEvent, ctx: EffectContext, params: EffectParams) => void;

const effectRegistry: Record<EffectId, EffectHandler> = {
  GAIN_GOLD: (_event, ctx, params) => {
    if (!ctx.player) return;
    const amountRaw = params.amount;
    const amount = typeof amountRaw === "number" ? amountRaw : 0;
    const cap = typeof ctx.maxGold === "number" ? ctx.maxGold : Number.MAX_SAFE_INTEGER;
    ctx.player.gold = Math.min(cap, ctx.player.gold + amount);
  },
  RESOLVE_ATTACK_HIT: (event, ctx) => {
    if (event.type !== "ATTACK_HIT") return;
    if (!ctx.sourceUnit || !ctx.targetUnit) return;
    ctx.targetUnit.hp -= event.damageToTarget;
    ctx.sourceUnit.hp -= event.damageToSource;
  },
  BLOODLUST_ON_KILL: (event, ctx) => {
    if (event.type !== "UNIT_DIED") return;
    if (!ctx.attacker) return;
    ctx.attacker.attack += 1;
    ctx.attacker.hp += 1;
    ctx.attacker.maxHp += 1;
    ctx.log?.push(`${ctx.attacker.name} gains Bloodlust (+1/+1).`);
  },
  DEATH_BURST_ON_DEATH: (event, ctx, params) => {
    if (event.type !== "UNIT_DIED") return;
    if (!ctx.sourceUnit || !ctx.targetUnit) return;
    const damageRaw = params.damage;
    const damage = typeof damageRaw === "number" ? damageRaw : 2;
    ctx.targetUnit.hp -= damage;
    ctx.log?.push(`${ctx.sourceUnit.name} death burst hits ${ctx.targetUnit.name} for ${damage}.`);
  },
  LIFESTEAL_ON_HIT: (event, ctx, params) => {
    if (event.type !== "ATTACK_HIT") return;
    if (!ctx.sourceUnit) return;
    const ratioRaw = params.ratio;
    const ratio = typeof ratioRaw === "number" ? ratioRaw : 0.5;
    const heal = Math.max(1, Math.floor(event.damageToTarget * ratio));
    const hpBefore = ctx.sourceUnit.hp;
    const maxHp = typeof ctx.sourceUnit.maxHp === "number" ? ctx.sourceUnit.maxHp : Number.MAX_SAFE_INTEGER;
    ctx.sourceUnit.hp = Math.min(maxHp, ctx.sourceUnit.hp + heal);
    const healed = ctx.sourceUnit.hp - hpBefore;
    if (healed > 0) {
      ctx.log?.push(`${ctx.sourceUnit.name} drains ${healed} health.`);
    }
  },
  BERSERKER_ON_HIT_BUFF: (event, ctx, params) => {
    if (event.type !== "ATTACK_HIT") return;
    if (!ctx.sourceUnit) return;
    const amountRaw = params.amount;
    const amount = typeof amountRaw === "number" ? amountRaw : 2;
    ctx.sourceUnit.attack += amount;
    ctx.log?.push(`${ctx.sourceUnit.name} is empowered by Berserker (+${amount} attack).`);
  }
};

export function applyEffect(effectId: EffectId, event: GameEvent, ctx: EffectContext, params: EffectParams = {}): void {
  effectRegistry[effectId](event, ctx, params);
}
