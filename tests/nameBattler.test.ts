import { describe, expect, it } from 'vitest';
import { calculateDamage, chooseBestMove, simulateBattle } from '../src/core/battleEngine';
import { generateMonster } from '../src/core/generator';
import { getTypeEffectiveness } from '../src/core/typeChart';
import { Monster } from '../src/types';

describe('名前からのモンスター生成 (generateMonster)', () => {
  it('同一の名前から常に完全に同一のモンスターが決定論的に生成される', () => {
    const m1 = generateMonster('ピカチュウ');
    const m2 = generateMonster('ピカチュウ');

    expect(m1.stats).toEqual(m2.stats);
    expect(m1.types).toEqual(m2.types);
    expect(m1.moves).toEqual(m2.moves);
    expect(m1.spriteSeed).toBe(m2.spriteSeed);
  });

  it('異なる名前からは異なるモンスターが生成される', () => {
    const m1 = generateMonster('ピカチュウ');
    const m2 = generateMonster('リザードン');

    expect(m1.stats.total).not.toBe(m2.stats.total);
  });

  it('合計ステータス値が 60 〜 1200 の範囲に厳格に収まる', () => {
    const names = ['A', 'B', 'C', 'テスト', '最弱', '最強神', '12345', 'あいうえお'];
    for (const name of names) {
      const m = generateMonster(name);
      expect(m.stats.total).toBeGreaterThanOrEqual(60);
      expect(m.stats.total).toBeLessThanOrEqual(1200);

      // 各ステータスの合計が total と一致すること
      const sum =
        m.stats.hp +
        m.stats.attack +
        m.stats.defense +
        m.stats.spAttack +
        m.stats.spDefense +
        m.stats.speed;
      expect(sum).toBe(m.stats.total);

      // 最低保証
      expect(m.stats.hp).toBeGreaterThanOrEqual(10);
      expect(m.stats.attack).toBeGreaterThanOrEqual(1);
      expect(m.stats.defense).toBeGreaterThanOrEqual(1);
      expect(m.stats.spAttack).toBeGreaterThanOrEqual(1);
      expect(m.stats.spDefense).toBeGreaterThanOrEqual(1);
      expect(m.stats.speed).toBeGreaterThanOrEqual(1);
    }
  });

  it('1000体の生成統計で平均値が正規分布の中央 (約600) 付近になる', () => {
    let totalSum = 0;
    const sampleSize = 1000;
    for (let i = 0; i < sampleSize; i++) {
      const m = generateMonster(`sample_test_monster_${i}`);
      totalSum += m.stats.total;
    }
    const mean = totalSum / sampleSize;
    // 平均が 550〜650 の範囲にあること
    expect(mean).toBeGreaterThan(550);
    expect(mean).toBeLessThan(650);
  });

  it('1〜2タイプを持ち、技は2種類重複なく習得している', () => {
    const m = generateMonster('ミュウツー');
    expect(m.types.length).toBeGreaterThanOrEqual(1);
    expect(m.types.length).toBeLessThanOrEqual(2);

    expect(m.moves.length).toBe(2);
    expect(m.moves[0].id).not.toBe(m.moves[1].id);
  });
});

describe('タイプ相性システム (typeChart)', () => {
  it('単タイプの弱点・耐性・無効を正しく計算できる', () => {
    expect(getTypeEffectiveness('fire', ['grass'])).toBe(2.0); // ほのお -> くさ (ばつぐん)
    expect(getTypeEffectiveness('fire', ['water'])).toBe(0.5); // ほのお -> みず (いまひとつ)
    expect(getTypeEffectiveness('electric', ['ground'])).toBe(0.0); // でんき -> じめん (無効)
    expect(getTypeEffectiveness('normal', ['ghost'])).toBe(0.0); // ノーマル -> ゴースト (無効)
  });

  it('複合タイプの2倍・4倍・0.25倍・無効を正しく計算できる', () => {
    expect(getTypeEffectiveness('fire', ['grass', 'steel'])).toBe(4.0); // ほのお -> くさ/はがね (4倍)
    expect(getTypeEffectiveness('water', ['fire', 'ground'])).toBe(4.0); // みず -> ほのお/じめん (4倍)
    expect(getTypeEffectiveness('electric', ['ground', 'water'])).toBe(0.0); // でんき -> じめん/みず (無効が優先)
    expect(getTypeEffectiveness('grass', ['fire', 'flying'])).toBe(0.25); // くさ -> ほのお/ひこう (0.25倍)
  });
});

describe('バトルAI & ダメージ計算', () => {
  const dummyDefender: Monster = {
    name: '草タイプ敵',
    types: ['grass'],
    stats: { hp: 100, attack: 50, defense: 50, spAttack: 50, spDefense: 50, speed: 50, total: 350 },
    moves: [
      { id: 'tackle', name: 'たいあたり', type: 'normal', category: 'physical', power: 50, accuracy: 100 },
      { id: 'tackle2', name: 'たいあたり2', type: 'normal', category: 'physical', power: 50, accuracy: 100 },
    ],
    maxHp: 100,
    currentHp: 100,
    spriteSeed: 1234,
  };

  it('AIは相手に最も有効な技（弱点属性）を自動選択する', () => {
    const attacker: Monster = {
      name: 'アタッカー',
      types: ['normal'],
      stats: { hp: 100, attack: 100, defense: 50, spAttack: 100, spDefense: 50, speed: 50, total: 450 },
      moves: [
        { id: 'surf', name: 'なみのり', type: 'water', category: 'special', power: 90, accuracy: 100 },
        { id: 'flamethrower', name: 'かえんほうしゃ', type: 'fire', category: 'special', power: 90, accuracy: 100 },
      ],
      maxHp: 100,
      currentHp: 100,
      spriteSeed: 5678,
    };

    // 草に対しては「かえんほうしゃ(2倍)」が「なみのり(0.5倍)」より圧倒的に有効
    const bestMove = chooseBestMove(attacker, dummyDefender);
    expect(bestMove.id).toBe('flamethrower');
  });

  it('無効技（0倍）を避け、通る技を必ず選択する', () => {
    const ghostDefender: Monster = {
      ...dummyDefender,
      types: ['ghost'],
    };

    const attacker: Monster = {
      name: 'アタッカー',
      types: ['normal'],
      stats: { hp: 100, attack: 100, defense: 50, spAttack: 100, spDefense: 50, speed: 50, total: 450 },
      moves: [
        { id: 'tackle', name: 'たいあたり', type: 'normal', category: 'physical', power: 100, accuracy: 100 }, // 無効 (0倍)
        { id: 'bite', name: 'かみくだく', type: 'dark', category: 'physical', power: 60, accuracy: 100 }, // 抜群 (2倍)
      ],
      maxHp: 100,
      currentHp: 100,
      spriteSeed: 9999,
    };

    const bestMove = chooseBestMove(attacker, ghostDefender);
    expect(bestMove.id).toBe('bite');
  });

  it('ダメージ計算がタイプ相性・STABを正しく反映する', () => {
    const attacker: Monster = {
      name: '炎使い',
      types: ['fire'],
      stats: { hp: 100, attack: 100, defense: 50, spAttack: 100, spDefense: 50, speed: 50, total: 450 },
      moves: [
        { id: 'flamethrower', name: 'かえんほうしゃ', type: 'fire', category: 'special', power: 90, accuracy: 100 },
      ],
      maxHp: 100,
      currentHp: 100,
      spriteSeed: 1,
    } as unknown as Monster;

    const dummyRng = () => 0.5; // 固定乱数
    const { damage, typeMultiplier, isStab } = calculateDamage(
      attacker,
      dummyDefender,
      attacker.moves[0],
      dummyRng
    );

    expect(typeMultiplier).toBe(2.0); // 抜群
    expect(isStab).toBe(true); // タイプ一致
    expect(damage).toBeGreaterThan(50);
  });
});

describe('バトルシミュレーター (simulateBattle)', () => {
  it('1vs1のバトルが正常に完了し、勝者とログが出力される', () => {
    const m1 = generateMonster('サトシのピカチュウ');
    const m2 = generateMonster('シゲルのカメックス');

    const result = simulateBattle(m1, m2);

    expect(result.turns).toBeGreaterThanOrEqual(1);
    expect(result.turns).toBeLessThanOrEqual(30);
    expect(result.logs.length).toBeGreaterThan(0);

    if (!result.isDraw) {
      expect(result.winner).toBeDefined();
      expect(result.loser).toBeDefined();
    }
  });

  it('耐久型同士でも30ターンで判定決着がつく（千日手防止）', () => {
    // 攻撃1、防御900の超要塞同士
    const wall1: Monster = {
      name: '要塞1',
      types: ['steel'],
      stats: { hp: 500, attack: 1, defense: 900, spAttack: 1, spDefense: 900, speed: 50, total: 2352 },
      moves: [
        { id: 'tackle', name: 'たいあたり', type: 'normal', category: 'physical', power: 10, accuracy: 100 },
        { id: 'tackle', name: 'たいあたり', type: 'normal', category: 'physical', power: 10, accuracy: 100 },
      ],
      maxHp: 500,
      currentHp: 500,
      spriteSeed: 1,
    };
    const wall2: Monster = {
      ...wall1,
      name: '要塞2',
    };

    const result = simulateBattle(wall1, wall2);
    expect(result.turns).toBe(30);
    expect(['turn_limit', 'draw']).toContain(result.winReason);
  });
});
