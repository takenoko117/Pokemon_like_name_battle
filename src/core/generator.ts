import { ALL_MOVES } from './moves';
import { ALL_TYPES } from './typeChart';
import { Monster, Move, PokemonType, Stats } from '../types';

/**
 * 文字列から32bit符号なし整数ハッシュ値を生成 (MurmurHash3 32-bit アルゴリズム)
 */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
    h = (h >>> 0);
  }
  return h;
}

/**
 * シード付き決定論的乱数生成器 (Mulberry32)
 * 0以上1未満の浮動小数点数を返す
 */
export function createRNG(seed: number) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller変換による正規分布乱数 (平均 mu, 標準偏差 sigma)
 */
function randomNormal(rng: () => number, mu: number, sigma: number): number {
  let u1 = rng();
  let u2 = rng();
  while (u1 === 0) u1 = rng();
  while (u2 === 0) u2 = rng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mu + z0 * sigma;
}

/**
 * 名前からモンスターを生成
 */
export function generateMonster(name: string): Monster {
  const trimmedName = name.trim();
  const seed = hashString(trimmedName);
  const rng = createRNG(seed);

  // 1. 合計ステータス値の決定 (正規分布: 平均600, 標準偏差140, 範囲60〜1200にクランプ)
  let rawTotal = Math.round(randomNormal(rng, 600, 140));
  if (rawTotal < 60) rawTotal = 60;
  if (rawTotal > 1200) rawTotal = 1200;
  const total = rawTotal;

  // 2. 6つのステータス重みを生成 (個性を出すため重みの二乗などで分散を強調)
  // HP, Attack, Defense, SpAttack, SpDefense, Speed
  const rawWeights: number[] = [];
  for (let i = 0; i < 6; i++) {
    const r = rng();
    // 0.2 ~ 1.0 の乱数を生成し、二乗してメリハリをつける
    const w = Math.pow(0.2 + r * 0.8, 1.6);
    rawWeights.push(w);
  }
  const weightSum = rawWeights.reduce((a, b) => a + b, 0);

  // 最低保証値
  const minHp = 10;
  const minOther = 1;
  const guaranteedTotal = minHp + minOther * 5; // 15

  const availableForDistribution = Math.max(0, total - guaranteedTotal);

  const distributed = rawWeights.map(w => Math.floor(availableForDistribution * (w / weightSum)));
  const allocatedSum = distributed.reduce((a, b) => a + b, 0);
  let remainder = availableForDistribution - allocatedSum;

  // 端数は最大重みのステータスに順次割り振り
  const indexedWeights = rawWeights.map((w, idx) => ({ w, idx })).sort((a, b) => b.w - a.w);
  let rIdx = 0;
  while (remainder > 0) {
    distributed[indexedWeights[rIdx % 6].idx]++;
    remainder--;
    rIdx++;
  }

  const stats: Stats = {
    hp: minHp + distributed[0],
    attack: minOther + distributed[1],
    defense: minOther + distributed[2],
    spAttack: minOther + distributed[3],
    spDefense: minOther + distributed[4],
    speed: minOther + distributed[5],
    total,
  };

  // 3. タイプ決定 (単タイプ 50%, 複合 50%)
  const type1Idx = Math.floor(rng() * ALL_TYPES.length);
  const type1 = ALL_TYPES[type1Idx];

  let types: [PokemonType] | [PokemonType, PokemonType] = [type1];
  const isDualType = rng() < 0.5;

  if (isDualType) {
    let type2Idx = Math.floor(rng() * (ALL_TYPES.length - 1));
    if (type2Idx >= type1Idx) type2Idx++;
    const type2 = ALL_TYPES[type2Idx];
    types = [type1, type2];
  }

  // 4. 技の決定 (全技プールから重複なしで2つ選定)
  const move1Idx = Math.floor(rng() * ALL_MOVES.length);
  let move2Idx = Math.floor(rng() * (ALL_MOVES.length - 1));
  if (move2Idx >= move1Idx) move2Idx++;

  const moves: [Move, Move] = [ALL_MOVES[move1Idx], ALL_MOVES[move2Idx]];

  // 5. スプライト生成用シード (整数の追加乱数)
  const spriteSeed = (rng() * 0xffffffff) >>> 0;

  return {
    name: trimmedName || 'ななし',
    types,
    stats,
    moves,
    maxHp: stats.hp,
    currentHp: stats.hp,
    spriteSeed,
  };
}
