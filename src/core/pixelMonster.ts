import { PokemonType } from '../types';
import { TYPE_INFO } from './typeChart';

interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): ColorRGB {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function rgbToString(c: ColorRGB, alpha: number = 1): string {
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${alpha})`;
}

function shade(c: ColorRGB, factor: number): ColorRGB {
  return {
    r: Math.max(0, Math.min(255, c.r * factor)),
    g: Math.max(0, Math.min(255, c.g * factor)),
    b: Math.max(0, Math.min(255, c.b * factor)),
  };
}

/**
 * 24x24の左右対称ドット絵モンスターを生成してDataURLを返す
 */
export function generateMonsterSprite(
  seed: number,
  primaryType: PokemonType,
  secondaryType?: PokemonType,
  exportSize: number = 192
): string {
  const canvas = document.createElement('canvas');
  const GRID_SIZE = 24;
  canvas.width = exportSize;
  canvas.height = exportSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.imageSmoothingEnabled = false;

  // PRNG
  let s = (seed ^ 0xa5a5a5a5) >>> 0;
  function rnd(): number {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // カラーパレット決定
  const baseHex = TYPE_INFO[primaryType]?.color || '#888888';
  const secHex = secondaryType ? TYPE_INFO[secondaryType]?.color : '#ffffff';

  const baseColor = hexToRgb(baseHex);
  const accentColor = hexToRgb(secHex || '#ffffff');
  const shadowColor = shade(baseColor, 0.6);
  const highlightColor = shade(baseColor, 1.35);
  const outlineColor = { r: 25, g: 25, b: 35 };

  // 目の色パレット
  const eyeColors = [
    { r: 255, g: 240, b: 100 }, // 黄
    { r: 255, g: 60, b: 60 },   // 赤
    { r: 80, g: 230, b: 255 },  // 水色
    { r: 255, g: 255, b: 255 }, // 白
    { r: 180, g: 255, b: 100 }, // ライム
  ];
  const eyeColor = eyeColors[Math.floor(rnd() * eyeColors.length)];

  // ピクセルバッファ (0: 空白, 1: アウトライン, 2: ベース, 3: シャドウ, 4: ハイライト, 5: アクセント, 6: 目)
  const grid: number[][] = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

  const halfWidth = GRID_SIZE / 2; // 12

  // 体型パラメータ
  const bodyShapeType = Math.floor(rnd() * 5); // 0: 丸型, 1: 逆三角形, 2: ドラゴン/人型, 3: 結晶/スライム, 4: 四角/甲羅
  const bodyTop = 5 + Math.floor(rnd() * 3);    // 5〜7
  const bodyBottom = 18 + Math.floor(rnd() * 4); // 18〜21

  // 胴体の厚みカーブを生成
  for (let y = bodyTop; y <= bodyBottom; y++) {
    const progress = (y - bodyTop) / (bodyBottom - bodyTop);
    let span = 0;
    if (bodyShapeType === 0) {
      // 楕円
      span = Math.sin(progress * Math.PI) * (4 + rnd() * 3) + 2;
    } else if (bodyShapeType === 1) {
      // 逆三角
      span = (1 - progress * 0.7) * (5 + rnd() * 2) + 1;
    } else if (bodyShapeType === 2) {
      // 人型/ドラゴン (頭・くびれ・胴体)
      if (progress < 0.35) span = 3.5 + rnd() * 1.5;
      else if (progress < 0.5) span = 2.0;
      else span = 4.5 + rnd() * 2;
    } else {
      // 結晶・四角
      span = 3 + rnd() * 3.5;
    }

    const intSpan = Math.min(halfWidth - 1, Math.max(1, Math.round(span)));
    for (let x = 0; x <= intSpan; x++) {
      grid[y][halfWidth - 1 - x] = 2; // ベース
      grid[y][halfWidth + x] = 2;
    }
  }

  // 突起パーツ (ツノ、耳、翼、トゲ)
  const featureType = Math.floor(rnd() * 6);
  if (featureType === 0 || featureType === 1) {
    // ツノ / 耳
    const hornHeight = 3 + Math.floor(rnd() * 3);
    const hornX = 2 + Math.floor(rnd() * 4);
    for (let h = 0; h < hornHeight; h++) {
      const y = bodyTop - 1 - h;
      if (y >= 1) {
        grid[y][halfWidth - 1 - hornX] = 5; // アクセント
        grid[y][halfWidth + hornX] = 5;
      }
    }
  } else if (featureType === 2) {
    // 翼 / ヒレ
    const wingY = bodyTop + 2 + Math.floor(rnd() * 4);
    for (let w = 0; w < 5; w++) {
      const wx = halfWidth - 5 - w;
      if (wx >= 1) {
        grid[wingY - (w % 2)][wx] = 5;
        grid[wingY][wx] = 5;
        grid[wingY - (w % 2)][GRID_SIZE - 1 - wx] = 5;
        grid[wingY][GRID_SIZE - 1 - wx] = 5;
      }
    }
  }

  // 足 / 底部
  const legX = 2 + Math.floor(rnd() * 3);
  for (let ly = bodyBottom; ly < Math.min(GRID_SIZE - 1, bodyBottom + 3); ly++) {
    grid[ly][halfWidth - 1 - legX] = 3; // シャドウ
    grid[ly][halfWidth + legX] = 3;
  }

  // 目の配置
  const eyeY = bodyTop + 2 + Math.floor(rnd() * 3);
  const eyeX = 1 + Math.floor(rnd() * 3);
  grid[eyeY][halfWidth - 1 - eyeX] = 6;
  grid[eyeY][halfWidth + eyeX] = 6;
  if (rnd() < 0.4) {
    // 2ピクセルの目
    grid[eyeY][halfWidth - eyeX] = 6;
    grid[eyeY][halfWidth - 1 + eyeX] = 6;
  }

  // 胸のコア / 模様 (アクセント)
  const chestY = eyeY + 3 + Math.floor(rnd() * 3);
  if (chestY < bodyBottom) {
    grid[chestY][halfWidth - 1] = 5;
    grid[chestY][halfWidth] = 5;
    if (rnd() < 0.5) {
      grid[chestY + 1][halfWidth - 1] = 5;
      grid[chestY + 1][halfWidth] = 5;
    }
  }

  // シャドウ・ハイライトの自動付与 (右下がシャドウ、左上がハイライト)
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x] === 2) {
        if (y > bodyBottom - 3 || x >= halfWidth + 2) {
          grid[y][x] = 3; // シャドウ
        } else if (y < bodyTop + 3 && x <= halfWidth - 1) {
          grid[y][x] = 4; // ハイライト
        }
      }
    }
  }

  // アウトライン (輪郭線) 自動生成
  // 空白 (0) でかつ上下左右斜めにボディピクセル (2〜6) が隣接しているマスを 1 (アウトライン) にする
  const outlineGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y][x] === 0) {
        let hasNeighbor = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE) {
              if (grid[ny][nx] >= 2) {
                hasNeighbor = true;
                break;
              }
            }
          }
          if (hasNeighbor) break;
        }
        if (hasNeighbor) outlineGrid[y][x] = 1;
      }
    }
  }

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (outlineGrid[y][x] === 1) grid[y][x] = 1;
    }
  }

  // Canvas へ描画
  const pixelSize = exportSize / GRID_SIZE;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const code = grid[y][x];
      if (code === 0) continue;

      let colorStr = '';
      switch (code) {
        case 1:
          colorStr = rgbToString(outlineColor);
          break;
        case 2:
          colorStr = rgbToString(baseColor);
          break;
        case 3:
          colorStr = rgbToString(shadowColor);
          break;
        case 4:
          colorStr = rgbToString(highlightColor);
          break;
        case 5:
          colorStr = rgbToString(accentColor);
          break;
        case 6:
          colorStr = rgbToString(eyeColor);
          break;
      }

      ctx.fillStyle = colorStr;
      ctx.fillRect(Math.floor(x * pixelSize), Math.floor(y * pixelSize), Math.ceil(pixelSize), Math.ceil(pixelSize));
    }
  }

  return canvas.toDataURL('image/png');
}
