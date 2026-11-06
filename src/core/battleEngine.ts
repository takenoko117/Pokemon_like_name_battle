import { BattleActionLog, BattleResult, Monster, Move } from '../types';
import { getTypeEffectiveness } from './typeChart';

/**
 * 技の期待値スコアを計算 (AIの技選択用)
 * 期待値 = 威力 × 相性倍率 × タイプ一致(1.5) × (攻撃側ステータス / 防御側ステータス) × (命中率 / 100)
 */
export function calculateMoveExpectedScore(
  attacker: Monster,
  defender: Monster,
  move: Move
): number {
  const effectiveness = getTypeEffectiveness(move.type, defender.types);
  if (effectiveness === 0) return 0; // 無効技はスコア0

  const isStab = attacker.types.includes(move.type);
  const stabMultiplier = isStab ? 1.5 : 1.0;

  const attackStat = move.category === 'physical' ? attacker.stats.attack : attacker.stats.spAttack;
  const defenseStat = move.category === 'physical' ? defender.stats.defense : defender.stats.spDefense;

  const statRatio = attackStat / Math.max(1, defenseStat);
  const accuracyRate = move.accuracy / 100;

  return move.power * effectiveness * stabMultiplier * statRatio * accuracyRate;
}

/**
 * AIが相手に最も有効な技を選択
 */
export function chooseBestMove(attacker: Monster, defender: Monster): Move {
  const [move1, move2] = attacker.moves;
  const score1 = calculateMoveExpectedScore(attacker, defender, move1);
  const score2 = calculateMoveExpectedScore(attacker, defender, move2);

  if (score1 > score2) return move1;
  if (score2 > score1) return move2;

  // スコア同値の場合:
  // 両方0 (無効) の場合は相性倍率を見るか、技1を撃つ
  const eff1 = getTypeEffectiveness(move1.type, defender.types);
  const eff2 = getTypeEffectiveness(move2.type, defender.types);
  if (eff1 > eff2) return move1;
  if (eff2 > eff1) return move2;

  return Math.random() < 0.5 ? move1 : move2;
}

/**
 * ポケモン第5世代以降準拠のダメージ計算 (全員 Lv50 固定)
 */
export function calculateDamage(
  attacker: Monster,
  defender: Monster,
  move: Move,
  rng: () => number = Math.random
): {
  damage: number;
  typeMultiplier: number;
  isStab: boolean;
  isCritical: boolean;
} {
  const typeMultiplier = getTypeEffectiveness(move.type, defender.types);
  if (typeMultiplier === 0) {
    return { damage: 0, typeMultiplier: 0, isStab: false, isCritical: false };
  }

  const isStab = attacker.types.includes(move.type);
  const stabMultiplier = isStab ? 1.5 : 1.0;

  const attackStat = move.category === 'physical' ? attacker.stats.attack : attacker.stats.spAttack;
  const defenseStat = move.category === 'physical' ? defender.stats.defense : defender.stats.spDefense;

  // Lv50 固定: floor(floor(2 * 50 / 5 + 2) * power * (A / D) / 50) + 2
  // = floor(22 * power * (A / D) / 50) + 2
  const baseDamage = Math.floor((22 * move.power * (attackStat / Math.max(1, defenseStat))) / 50) + 2;

  // 急所判定: 1/24 (約4.17%) で 1.5倍
  const isCritical = rng() < (1 / 24);
  const critMultiplier = isCritical ? 1.5 : 1.0;

  // 乱数: 0.85 〜 1.00
  const randomFactor = 0.85 + rng() * 0.15;

  let finalDamage = Math.floor(
    baseDamage * stabMultiplier * typeMultiplier * critMultiplier * randomFactor
  );

  // 無効以外は最低1ダメージ保証
  if (finalDamage < 1) finalDamage = 1;

  return {
    damage: finalDamage,
    typeMultiplier,
    isStab,
    isCritical,
  };
}

/**
 * 1回のアクションを実行
 */
function executeAction(
  turnNumber: number,
  attacker: Monster,
  defender: Monster,
  rng: () => number
): BattleActionLog {
  const move = chooseBestMove(attacker, defender);
  const hitRoll = rng() * 100;
  const isHit = hitRoll < move.accuracy;

  const messageLines: string[] = [];
  messageLines.push(`${attacker.name}の ${move.name}！`);

  if (!isHit) {
    messageLines.push('しかし こうげきは はずれた！');
    return {
      turn: turnNumber,
      attackerName: attacker.name,
      defenderName: defender.name,
      move,
      isHit: false,
      typeMultiplier: 1.0,
      isCritical: false,
      isStab: false,
      damage: 0,
      defenderRemainingHp: defender.currentHp,
      defenderMaxHp: defender.maxHp,
      isFainted: false,
      messageLines,
    };
  }

  const { damage, typeMultiplier, isStab, isCritical } = calculateDamage(attacker, defender, move, rng);

  if (typeMultiplier === 0) {
    messageLines.push('あいてには まったく こうかがないようだ…');
  } else {
    if (isCritical) {
      messageLines.push('きゅうしょに あたった！');
    }
    if (typeMultiplier >= 2.0) {
      messageLines.push('こうかは ばつぐんだ！');
    } else if (typeMultiplier > 0 && typeMultiplier <= 0.5) {
      messageLines.push('こうかは いまひとつのようだ…');
    }
  }

  defender.currentHp = Math.max(0, defender.currentHp - damage);
  const isFainted = defender.currentHp <= 0;

  if (isFainted) {
    messageLines.push(`${defender.name}は たおれた！`);
  }

  return {
    turn: turnNumber,
    attackerName: attacker.name,
    defenderName: defender.name,
    move,
    isHit: true,
    typeMultiplier,
    isCritical,
    isStab,
    damage,
    defenderRemainingHp: defender.currentHp,
    defenderMaxHp: defender.maxHp,
    isFainted,
    messageLines,
  };
}

/**
 * 1vs1 オートバトルを最後まで実行し、全ログと結果を返す
 */
export function simulateBattle(
  monster1: Monster,
  monster2: Monster,
  rng: () => number = Math.random
): BattleResult {
  // バトル用のクローンインスタンスを作成
  const p1: Monster = {
    ...monster1,
    currentHp: monster1.stats.hp,
    maxHp: monster1.stats.hp,
  };
  const p2: Monster = {
    ...monster2,
    currentHp: monster2.stats.hp,
    maxHp: monster2.stats.hp,
  };

  const logs: BattleActionLog[] = [];
  const maxTurns = 30;
  let currentTurn = 1;

  while (currentTurn <= maxTurns) {
    // 行動順判定 (すばやさ比較、同速は50%ランダム)
    let first: Monster;
    let second: Monster;

    if (p1.stats.speed > p2.stats.speed) {
      first = p1;
      second = p2;
    } else if (p2.stats.speed > p1.stats.speed) {
      first = p2;
      second = p1;
    } else {
      first = rng() < 0.5 ? p1 : p2;
      second = first === p1 ? p2 : p1;
    }

    // 先攻行動
    const log1 = executeAction(currentTurn, first, second, rng);
    logs.push(log1);

    if (second.currentHp <= 0) {
      return {
        winner: first === p1 ? monster1 : monster2,
        loser: second === p1 ? monster1 : monster2,
        isDraw: false,
        turns: currentTurn,
        logs,
        winReason: 'knockout',
        p1FinalHp: p1.currentHp,
        p2FinalHp: p2.currentHp,
      };
    }

    // 後攻行動
    const log2 = executeAction(currentTurn, second, first, rng);
    logs.push(log2);

    if (first.currentHp <= 0) {
      return {
        winner: second === p1 ? monster1 : monster2,
        loser: first === p1 ? monster1 : monster2,
        isDraw: false,
        turns: currentTurn,
        logs,
        winReason: 'knockout',
        p1FinalHp: p1.currentHp,
        p2FinalHp: p2.currentHp,
      };
    }

    currentTurn++;
  }

  // 30ターン経過による判定決着
  const p1Ratio = p1.currentHp / p1.maxHp;
  const p2Ratio = p2.currentHp / p2.maxHp;

  if (p1Ratio > p2Ratio) {
    return {
      winner: monster1,
      loser: monster2,
      isDraw: false,
      turns: maxTurns,
      logs,
      winReason: 'turn_limit',
      p1FinalHp: p1.currentHp,
      p2FinalHp: p2.currentHp,
    };
  } else if (p2Ratio > p1Ratio) {
    return {
      winner: monster2,
      loser: monster1,
      isDraw: false,
      turns: maxTurns,
      logs,
      winReason: 'turn_limit',
      p1FinalHp: p1.currentHp,
      p2FinalHp: p2.currentHp,
    };
  } else {
    return {
      winner: null,
      loser: null,
      isDraw: true,
      turns: maxTurns,
      logs,
      winReason: 'draw',
      p1FinalHp: p1.currentHp,
      p2FinalHp: p2.currentHp,
    };
  }
}
