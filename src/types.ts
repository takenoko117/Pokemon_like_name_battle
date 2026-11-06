// ==========================================
// ネームバトラー (Name Battler) 型定義
// ==========================================

export type PokemonType =
  | 'normal'
  | 'fire'
  | 'water'
  | 'electric'
  | 'grass'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon'
  | 'dark'
  | 'steel'
  | 'fairy';

export type MoveCategory = 'physical' | 'special';

export interface Move {
  id: string;
  name: string;
  type: PokemonType;
  category: MoveCategory;
  power: number;
  accuracy: number;
  description?: string;
}

export interface Stats {
  hp: number;
  attack: number;
  defense: number;
  spAttack: number;
  spDefense: number;
  speed: number;
  total: number;
}

export interface Monster {
  name: string;
  types: [PokemonType] | [PokemonType, PokemonType];
  stats: Stats;
  moves: [Move, Move];
  maxHp: number;
  currentHp: number;
  spriteSeed: number;
}

export interface BattleActionLog {
  turn: number;
  attackerName: string;
  defenderName: string;
  move: Move;
  isHit: boolean;
  typeMultiplier: number; // 0, 0.25, 0.5, 1, 2, 4
  isCritical: boolean;
  isStab: boolean;
  damage: number;
  defenderRemainingHp: number;
  defenderMaxHp: number;
  isFainted: boolean;
  messageLines: string[];
}

export type WinReason = 'knockout' | 'turn_limit' | 'draw';

export interface BattleResult {
  winner: Monster | null;
  loser: Monster | null;
  isDraw: boolean;
  turns: number;
  logs: BattleActionLog[];
  winReason: WinReason;
  p1FinalHp: number;
  p2FinalHp: number;
}
