import { PokemonType } from '../types';

export interface TypeInfo {
  id: PokemonType;
  name: string;
  color: string;
  badgeBg: string;
}

export const TYPE_INFO: Record<PokemonType, TypeInfo> = {
  normal: { id: 'normal', name: 'ノーマル', color: '#9fa19f', badgeBg: '#6d6d4e' },
  fire: { id: 'fire', name: 'ほのお', color: '#e62829', badgeBg: '#b31e1f' },
  water: { id: 'water', name: 'みず', color: '#2980ef', badgeBg: '#1e5eb0' },
  electric: { id: 'electric', name: 'でんき', color: '#fac000', badgeBg: '#b88d00' },
  grass: { id: 'grass', name: 'くさ', color: '#3fa129', badgeBg: '#2d731d' },
  ice: { id: 'ice', name: 'こおり', color: '#3dcef3', badgeBg: '#2794af' },
  fighting: { id: 'fighting', name: 'かくとう', color: '#ff8000', badgeBg: '#b35900' },
  poison: { id: 'poison', name: 'どく', color: '#9141cb', badgeBg: '#652d8e' },
  ground: { id: 'ground', name: 'じめん', color: '#915121', badgeBg: '#663917' },
  flying: { id: 'flying', name: 'ひこう', color: '#81b9ef', badgeBg: '#547ba0' },
  psychic: { id: 'psychic', name: 'エスパー', color: '#ef4179', badgeBg: '#b02a54' },
  bug: { id: 'bug', name: 'むし', color: '#91a119', badgeBg: '#657011' },
  rock: { id: 'rock', name: 'いわ', color: '#afa981', badgeBg: '#777358' },
  ghost: { id: 'ghost', name: 'ゴースト', color: '#704170', badgeBg: '#4a2b4a' },
  dragon: { id: 'dragon', name: 'ドラゴン', color: '#5060e1', badgeBg: '#344099' },
  dark: { id: 'dark', name: 'あく', color: '#50413f', badgeBg: '#332928' },
  steel: { id: 'steel', name: 'はがね', color: '#60a1b8', badgeBg: '#427080' },
  fairy: { id: 'fairy', name: 'フェアリー', color: '#ef70ef', badgeBg: '#b04eb0' },
};

export const ALL_TYPES: PokemonType[] = Object.keys(TYPE_INFO) as PokemonType[];

// 攻撃側 -> 防御側の相性倍率 (未記載は 1.0)
// 2.0 = 抜群, 0.5 = いまひとつ, 0.0 = 効果なし
const TYPE_CHART: Record<PokemonType, Partial<Record<PokemonType, number>>> = {
  normal: {
    rock: 0.5,
    ghost: 0.0,
    steel: 0.5,
  },
  fire: {
    fire: 0.5,
    water: 0.5,
    grass: 2.0,
    ice: 2.0,
    bug: 2.0,
    rock: 0.5,
    dragon: 0.5,
    steel: 2.0,
  },
  water: {
    fire: 2.0,
    water: 0.5,
    grass: 0.5,
    ground: 2.0,
    rock: 2.0,
    dragon: 0.5,
  },
  electric: {
    water: 2.0,
    electric: 0.5,
    grass: 0.5,
    ground: 0.0,
    flying: 2.0,
    dragon: 0.5,
  },
  grass: {
    fire: 0.5,
    water: 2.0,
    grass: 0.5,
    poison: 0.5,
    ground: 2.0,
    flying: 0.5,
    bug: 0.5,
    rock: 2.0,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: {
    fire: 0.5,
    water: 0.5,
    grass: 2.0,
    ice: 0.5,
    ground: 2.0,
    flying: 2.0,
    dragon: 2.0,
    steel: 0.5,
  },
  fighting: {
    normal: 2.0,
    ice: 2.0,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2.0,
    ghost: 0.0,
    dark: 2.0,
    steel: 2.0,
    fairy: 0.5,
  },
  poison: {
    grass: 2.0,
    poison: 0.5,
    ground: 0.5,
    rock: 0.5,
    ghost: 0.5,
    steel: 0.0,
    fairy: 2.0,
  },
  ground: {
    fire: 2.0,
    electric: 2.0,
    grass: 0.5,
    poison: 2.0,
    flying: 0.0,
    bug: 0.5,
    rock: 2.0,
    steel: 2.0,
  },
  flying: {
    electric: 0.5,
    grass: 2.0,
    fighting: 2.0,
    bug: 2.0,
    rock: 0.5,
    steel: 0.5,
  },
  psychic: {
    fighting: 2.0,
    poison: 2.0,
    psychic: 0.5,
    dark: 0.0,
    steel: 0.5,
  },
  bug: {
    fire: 0.5,
    grass: 2.0,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2.0,
    ghost: 0.5,
    dark: 2.0,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: {
    fire: 2.0,
    ice: 2.0,
    fighting: 0.5,
    ground: 0.5,
    flying: 2.0,
    bug: 2.0,
    steel: 0.5,
  },
  ghost: {
    normal: 0.0,
    psychic: 2.0,
    ghost: 2.0,
    dark: 0.5,
  },
  dragon: {
    dragon: 2.0,
    steel: 0.5,
    fairy: 0.0,
  },
  dark: {
    fighting: 0.5,
    psychic: 2.0,
    ghost: 2.0,
    dark: 0.5,
    fairy: 0.5,
  },
  steel: {
    fire: 0.5,
    water: 0.5,
    electric: 0.5,
    ice: 2.0,
    rock: 2.0,
    steel: 0.5,
    fairy: 2.0,
  },
  fairy: {
    fire: 0.5,
    fighting: 2.0,
    poison: 0.5,
    dragon: 2.0,
    dark: 2.0,
    steel: 0.5,
  },
};

/**
 * 攻撃タイプと防御側のタイプ群（1〜2タイプ）から相性倍率を計算
 */
export function getTypeEffectiveness(
  attackType: PokemonType,
  defenderTypes: PokemonType[]
): number {
  let multiplier = 1.0;
  const attackMap = TYPE_CHART[attackType] || {};

  for (const defType of defenderTypes) {
    if (attackMap[defType] !== undefined) {
      multiplier *= attackMap[defType]!;
    }
  }

  return multiplier;
}
