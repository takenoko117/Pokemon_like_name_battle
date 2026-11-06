import { describe, it, expect } from 'vitest';
import { createMonsterAura } from '../src/three/monsterAura';
import { generateMonster3D } from '../src/three/monster3dGenerator';
import { Stats } from '../src/types';

describe('Monster Aura & Particle System (合計種族値に応じた段階的演出)', () => {
  const baseStats: Stats = {
    hp: 80,
    attack: 80,
    defense: 80,
    spAttack: 80,
    spDefense: 80,
    speed: 80,
    total: 480,
  };

  const legendaryStats: Stats = {
    ...baseStats,
    hp: 120,
    attack: 130,
    defense: 100,
    spAttack: 130,
    spDefense: 100,
    speed: 100,
    total: 680,
  };

  const godlikeStats: Stats = {
    ...baseStats,
    hp: 200,
    attack: 210,
    defense: 180,
    spAttack: 210,
    spDefense: 180,
    speed: 150,
    total: 1130,
  };

  it('合計種族値 <= 600 で通常 (normal) ティアのオーラが生成される', () => {
    const aura = createMonsterAura('fire', 'flying', baseStats);
    expect(aura.tier).toBe('normal');
    expect(aura.group.children.length).toBeGreaterThanOrEqual(2); // Points + Ground ring
    expect(aura.materials.length).toBeGreaterThan(0);
    expect(aura.geometries.length).toBeGreaterThan(0);

    expect(() => {
      aura.update(0.016, 'idle', 0);
      aura.update(0.016, 'attack', 0.2);
      aura.update(0.016, 'hit', 0.5);
      aura.update(0.016, 'faint', 1.0);
    }).not.toThrow();

    aura.dispose();
  });

  it('合計種族値 > 600 かつ <= 1000 で豪華 (legendary) ティアのオーラが生成される', () => {
    const aura = createMonsterAura('dragon', 'fire', legendaryStats);
    expect(aura.tier).toBe('legendary');
    // パーティクル + ルーンリング + パルスリング + ピラー + オービタルリング + ライト
    expect(aura.group.children.length).toBeGreaterThan(5);

    expect(() => {
      aura.update(0.016, 'idle', 0);
      aura.update(0.016, 'attack', 0.2);
    }).not.toThrow();

    aura.dispose();
  });

  it('合計種族値 > 1000 で神話級 (godlike) のやばいぐらい豪華なオーラが生成される', () => {
    const aura = createMonsterAura('psychic', 'fairy', godlikeStats);
    expect(aura.tier).toBe('godlike');
    // パーティクル + 二重回転ルーン魔法陣 + パルスリング群 + 多層光柱 + 三重ジャイロ + 後光(Halo) + 2つのライト
    expect(aura.group.children.length).toBeGreaterThan(8);

    expect(() => {
      aura.update(0.016, 'idle', 0);
      aura.update(0.016, 'attack', 0.5);
      aura.update(0.016, 'hit', 1.0);
      aura.update(0.016, 'faint', 1.5);
    }).not.toThrow();

    aura.dispose();
  });

  it('generateMonster3D 経由でも各ティアのオーラが正しく組み込まれる', () => {
    const normalModel = generateMonster3D(1001, 'water', undefined, baseStats);
    expect(normalModel.aura).toBeDefined();
    expect(normalModel.aura?.tier).toBe('normal');
    normalModel.dispose();

    const legModel = generateMonster3D(1002, 'dragon', 'flying', legendaryStats);
    expect(legModel.aura?.tier).toBe('legendary');
    legModel.dispose();

    const godModel = generateMonster3D(1003, 'steel', 'dragon', godlikeStats);
    expect(godModel.aura?.tier).toBe('godlike');
    godModel.dispose();
  });
});
