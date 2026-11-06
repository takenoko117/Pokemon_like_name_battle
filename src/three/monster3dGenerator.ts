import * as THREE from 'three';
import { PokemonType, Stats } from '../types';
import { TYPE_INFO } from '../core/typeChart';
import { createRNG } from '../core/generator';
import { createMonsterAura, MonsterAura } from './monsterAura';

export type AnimationState = 'idle' | 'attack' | 'hit' | 'faint';

export interface Monster3DModel {
  root: THREE.Group;
  materials: THREE.Material[];
  geometries: THREE.BufferGeometry[];
  aura?: MonsterAura;
  update: (delta: number, state: AnimationState, totalTime: number) => void;
  dispose: () => void;
}

// 簡易セルシェーディング用グラデーションテクスチャの生成（キャッシュ）
let sharedToonTexture: THREE.DataTexture | null = null;
function getSharedToonTexture(): THREE.DataTexture {
  if (sharedToonTexture) return sharedToonTexture;
  // 3階調のセル調テクスチャ (暗, 中, 明)
  const colors = new Uint8Array([
    120, 120, 130, 255, // 陰
    200, 200, 210, 255, // 中間
    255, 255, 255, 255, // ハイライト
  ]);
  const tex = new THREE.DataTexture(colors, 3, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  sharedToonTexture = tex;
  return tex;
}

export function generateMonster3D(
  seed: number,
  primaryType: PokemonType,
  secondaryType?: PokemonType,
  stats?: Stats
): Monster3DModel {
  const rng = createRNG(seed ^ 0x3d3d3d3d);

  const materials: THREE.Material[] = [];
  const geometries: THREE.BufferGeometry[] = [];

  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };

  const gradientMap = getSharedToonTexture();

  // カラー設定
  const baseHex = TYPE_INFO[primaryType]?.color || '#3b82f6';
  const secHex = secondaryType ? TYPE_INFO[secondaryType]?.color : '#fbbf24';

  const baseCol = new THREE.Color(baseHex);
  const secCol = new THREE.Color(secHex);
  const darkCol = baseCol.clone().multiplyScalar(0.4);
  const lightCol = baseCol.clone().lerp(new THREE.Color('#ffffff'), 0.5);
  const eyeCol = new THREE.Color(
    ['#facc15', '#ef4444', '#38bdf8', '#ffffff', '#a3e635', '#c084fc'][
      Math.floor(rng() * 6)
    ]
  );

  const isMetal = primaryType === 'steel' || secondaryType === 'steel';

  // マテリアル作成
  const bodyMat = trackMat(
    isMetal
      ? new THREE.MeshStandardMaterial({
          color: baseCol,
          metalness: 0.8,
          roughness: 0.25,
        })
      : new THREE.MeshToonMaterial({
          color: baseCol,
          gradientMap,
        })
  );

  const bellyMat = trackMat(
    new THREE.MeshToonMaterial({
      color: lightCol,
      gradientMap,
    })
  );

  const accentMat = trackMat(
    new THREE.MeshToonMaterial({
      color: secCol,
      gradientMap,
      emissive: secCol.clone().multiplyScalar(0.15),
    })
  );

  const darkMat = trackMat(
    new THREE.MeshToonMaterial({
      color: darkCol,
      gradientMap,
    })
  );

  const eyeWhiteMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );

  const eyeIrisMat = trackMat(
    new THREE.MeshBasicMaterial({ color: eyeCol })
  );

  const pupilMat = trackMat(
    new THREE.MeshBasicMaterial({ color: 0x111118 })
  );

  const emissiveAccentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: secCol,
      emissive: secCol,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    })
  );

  const root = new THREE.Group();
  const mainGroup = new THREE.Group();
  root.add(mainGroup);

  // 体型決定
  // 0: Bipedal(怪獣・二足)
  // 1: Quadruped(四足ビースト)
  // 2: Avian(鳥・有翼)
  // 3: Chibi(丸型マスコット)
  // 4: Golem(角ばったアーマー)
  // 5: Serpentine(龍・蛇)
  // 6: Ghost(浮遊・幻影)
  // 7: Aquatic(水棲・ヒレ)
  let archetype = Math.floor(rng() * 8);
  if (primaryType === 'flying') archetype = 2;
  else if (primaryType === 'ghost') archetype = 6;
  else if (primaryType === 'steel' || primaryType === 'rock') archetype = 4;
  else if (primaryType === 'dragon' && rng() < 0.6) archetype = 2;
  else if (primaryType === 'water' && rng() < 0.5) archetype = 7;

  // ステータスによるスケール調整
  const hpBonus = stats ? (stats.hp - 100) / 400 : 0;
  const atkBonus = stats ? (stats.attack - 100) / 400 : 0;
  const spdBonus = stats ? (stats.speed - 100) / 400 : 0;

  const baseScale = Math.max(0.85, Math.min(1.25, 1.0 + hpBonus * 0.2));
  mainGroup.scale.set(baseScale, baseScale, baseScale);
  const animSpeedMultiplier = Math.max(0.7, Math.min(1.5, 1.0 + spdBonus * 0.3));

  // パーツ格納用
  const bodyGroup = new THREE.Group();
  const headGroup = new THREE.Group();
  const tailParts: THREE.Object3D[] = [];
  const wings: { left: THREE.Object3D; right: THREE.Object3D }[] = [];
  const limbs: { obj: THREE.Object3D; phase: number; isArm: boolean }[] = [];
  const floatOrbs: THREE.Object3D[] = [];

  mainGroup.add(bodyGroup);
  bodyGroup.add(headGroup);

  // 目を作成するヘルパー
  const addEyes = (
    parent: THREE.Object3D,
    eyeY: number,
    eyeZ: number,
    eyeSpread: number,
    eyeScale: number = 0.16
  ) => {
    [-1, 1].forEach((side) => {
      const eyeAnchor = new THREE.Group();
      eyeAnchor.position.set(side * eyeSpread, eyeY, eyeZ);

      // 白目
      const whiteGeo = trackGeo(new THREE.SphereGeometry(eyeScale, 12, 10));
      whiteGeo.scale(1, 1.15, 0.4);
      const whiteMesh = new THREE.Mesh(whiteGeo, eyeWhiteMat);
      eyeAnchor.add(whiteMesh);

      // 虹彩
      const irisGeo = trackGeo(new THREE.SphereGeometry(eyeScale * 0.7, 10, 8));
      irisGeo.scale(0.9, 0.95, 0.2);
      const irisMesh = new THREE.Mesh(irisGeo, eyeIrisMat);
      irisMesh.position.set(side * 0.02, 0, eyeScale * 0.3);
      eyeAnchor.add(irisMesh);

      // 瞳孔
      const pupilGeo = trackGeo(new THREE.SphereGeometry(eyeScale * 0.35, 8, 6));
      pupilGeo.scale(0.8, 0.9, 0.15);
      const pupilMesh = new THREE.Mesh(pupilGeo, pupilMat);
      pupilMesh.position.set(side * 0.02, 0, eyeScale * 0.45);
      eyeAnchor.add(pupilMesh);

      // ハイライト
      const hiGeo = trackGeo(new THREE.SphereGeometry(eyeScale * 0.2, 6, 6));
      const hiMesh = new THREE.Mesh(hiGeo, eyeWhiteMat);
      hiMesh.position.set(side * 0.01 + eyeScale * 0.2, eyeScale * 0.25, eyeScale * 0.48);
      eyeAnchor.add(hiMesh);

      // まぶた / アイライン（上部に少し厚み）
      const lidGeo = trackGeo(new THREE.CylinderGeometry(eyeScale * 1.1, eyeScale * 1.1, 0.04, 8));
      lidGeo.rotateZ(Math.PI / 2);
      const lidMesh = new THREE.Mesh(lidGeo, darkMat);
      lidMesh.position.set(0, eyeScale * 0.8, eyeScale * 0.2);
      lidMesh.rotation.z = side * 0.15;
      eyeAnchor.add(lidMesh);

      parent.add(eyeAnchor);
    });
  };

  // ツノ / 耳を追加するヘルパー
  const addHeadOrnaments = (parent: THREE.Object3D, topY: number) => {
    const hornStyle = Math.floor(rng() * 5); // 0: 耳, 1: 一本角, 2: 二本角, 3: トサカ, 4: なし
    if (hornStyle === 0) {
      // 尖り耳 / ウサ耳
      const earH = 0.4 + rng() * 0.3;
      const earGeo = trackGeo(new THREE.ConeGeometry(0.14, earH, 6));
      [-1, 1].forEach((side) => {
        const ear = new THREE.Mesh(earGeo, accentMat);
        ear.position.set(side * 0.35, topY + earH * 0.4, 0);
        ear.rotation.z = -side * 0.4;
        ear.rotation.x = -0.15;
        parent.add(ear);
      });
    } else if (hornStyle === 1) {
      // 一本角
      const hornH = 0.5 + rng() * 0.4 + atkBonus * 0.2;
      const hornGeo = trackGeo(new THREE.ConeGeometry(0.12, hornH, 8));
      const horn = new THREE.Mesh(hornGeo, accentMat);
      horn.position.set(0, topY + hornH * 0.45, 0.15);
      horn.rotation.x = 0.35;
      parent.add(horn);
    } else if (hornStyle === 2) {
      // 湾曲した二本角
      const hornH = 0.45 + rng() * 0.3 + atkBonus * 0.2;
      [-1, 1].forEach((side) => {
        const horn = new THREE.Group();
        const seg1Geo = trackGeo(new THREE.CylinderGeometry(0.08, 0.12, hornH * 0.5, 6));
        const seg1 = new THREE.Mesh(seg1Geo, accentMat);
        seg1.position.y = hornH * 0.25;
        horn.add(seg1);

        const seg2Geo = trackGeo(new THREE.ConeGeometry(0.08, hornH * 0.6, 6));
        const seg2 = new THREE.Mesh(seg2Geo, accentMat);
        seg2.position.set(side * 0.08, hornH * 0.65, 0.05);
        seg2.rotation.z = side * 0.4;
        seg2.rotation.x = 0.2;
        horn.add(seg2);

        horn.position.set(side * 0.3, topY + 0.05, 0);
        horn.rotation.z = -side * 0.3;
        parent.add(horn);
      });
    } else if (hornStyle === 3) {
      // トサカ / モヒカン状クレスト
      const crestGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.35, 0.6));
      const crest = new THREE.Mesh(crestGeo, accentMat);
      crest.position.set(0, topY + 0.15, -0.05);
      crest.rotation.x = -0.3;
      parent.add(crest);
    }
  };

  // 胸のコアクリスタル（セカンダリタイプ色で発光）
  const addChestCore = (parent: THREE.Object3D, y: number, z: number) => {
    const coreGeo = trackGeo(new THREE.OctahedronGeometry(0.15, 0));
    const core = new THREE.Mesh(coreGeo, emissiveAccentMat);
    core.position.set(0, y, z);
    parent.add(core);
  };

  // 尻尾の構築ヘルパー
  const createTailChain = (
    parent: THREE.Object3D,
    startY: number,
    startZ: number,
    numSegments: number = 4
  ) => {
    let currentParent: THREE.Object3D = parent;
    let segLen = 0.22;
    let radius = 0.14;

    for (let i = 0; i < numSegments; i++) {
      const segGroup = new THREE.Group();
      if (i === 0) {
        segGroup.position.set(0, startY, startZ);
        segGroup.rotation.x = -0.6;
      } else {
        segGroup.position.set(0, 0, -segLen);
        segGroup.rotation.x = 0.2;
      }

      const rTop = Math.max(0.04, radius * (1 - (i + 1) / (numSegments + 1)));
      const rBot = radius * (1 - i / (numSegments + 1));
      const geo = trackGeo(new THREE.CylinderGeometry(rTop, rBot, segLen, 8));
      geo.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geo, i % 2 === 0 ? bodyMat : accentMat);
      mesh.position.set(0, 0, -segLen * 0.5);
      segGroup.add(mesh);

      // 先端の装飾（炎やトゲやイナズマ）
      if (i === numSegments - 1) {
        if (primaryType === 'fire' || secondaryType === 'fire') {
          // 炎の尾
          const flameGeo = trackGeo(new THREE.ConeGeometry(0.2, 0.45, 8));
          flameGeo.rotateX(-Math.PI / 2);
          const flameMesh = new THREE.Mesh(flameGeo, emissiveAccentMat);
          flameMesh.position.set(0, 0, -segLen - 0.2);
          segGroup.add(flameMesh);
        } else if (primaryType === 'electric' || secondaryType === 'electric') {
          // イナズマ尾
          const boltGeo = trackGeo(new THREE.BoxGeometry(0.06, 0.25, 0.35));
          const boltMesh = new THREE.Mesh(boltGeo, emissiveAccentMat);
          boltMesh.position.set(0, 0.1, -segLen - 0.15);
          segGroup.add(boltMesh);
        } else {
          // フサフサ玉
          const ballGeo = trackGeo(new THREE.SphereGeometry(0.16, 8, 8));
          const ballMesh = new THREE.Mesh(ballGeo, accentMat);
          ballMesh.position.set(0, 0, -segLen - 0.1);
          segGroup.add(ballMesh);
        }
      }

      currentParent.add(segGroup);
      tailParts.push(segGroup);
      currentParent = segGroup;
    }
  };

  // 翼の構築ヘルパー
  const addWings = (parent: THREE.Object3D, y: number, z: number, spanScale: number = 1.0) => {
    [-1, 1].forEach((side) => {
      const wingAnchor = new THREE.Group();
      wingAnchor.position.set(side * 0.35, y, z);

      // ドラゴン/コウモリ翼
      const wingFrameGeo = trackGeo(new THREE.CylinderGeometry(0.05, 0.08, 0.8 * spanScale, 6));
      wingFrameGeo.rotateZ(side * 0.8);
      const wingFrame = new THREE.Mesh(wingFrameGeo, darkMat);
      wingFrame.position.set(side * 0.35 * spanScale, 0.25 * spanScale, 0);
      wingAnchor.add(wingFrame);

      // 翼膜
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(side * 0.8 * spanScale, 0.5 * spanScale);
      shape.lineTo(side * 0.7 * spanScale, -0.2 * spanScale);
      shape.lineTo(side * 0.3 * spanScale, -0.3 * spanScale);
      shape.closePath();

      const wingMemGeo = trackGeo(new THREE.ShapeGeometry(shape));
      const wingMem = new THREE.Mesh(wingMemGeo, accentMat);
      wingAnchor.add(wingMem);

      parent.add(wingAnchor);
      if (side === -1) {
        wings.push({ left: wingAnchor, right: wingAnchor });
      } else {
        wings[wings.length - 1].right = wingAnchor;
      }
    });
  };

  // ==========================================
  // アーキタイプごとのモデリング
  // ==========================================

  if (archetype === 0) {
    // ----------------------------------------
    // 0: Bipedal (二足歩行・恐竜・怪獣型)
    // ----------------------------------------
    // 胴体 (楕円体)
    const bodyGeo = trackGeo(new THREE.SphereGeometry(0.7, 16, 14));
    bodyGeo.scale(0.85, 1.15, 0.85);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 1.1;
    bodyGroup.add(bodyMesh);

    // お腹
    const bellyGeo = trackGeo(new THREE.SphereGeometry(0.65, 14, 12));
    bellyGeo.scale(0.75, 1.05, 0.4);
    const bellyMesh = new THREE.Mesh(bellyGeo, bellyMat);
    bellyMesh.position.set(0, 1.1, 0.48);
    bodyGroup.add(bellyMesh);

    // 頭部
    headGroup.position.set(0, 2.05, 0.2);
    const headGeo = trackGeo(new THREE.SphereGeometry(0.5, 16, 14));
    headGeo.scale(1.0, 0.9, 1.05);
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headGroup.add(headMesh);

    // マズル / 鼻面
    const snoutGeo = trackGeo(new THREE.BoxGeometry(0.4, 0.25, 0.35));
    const snout = new THREE.Mesh(snoutGeo, lightCol ? bellyMat : bodyMat);
    snout.position.set(0, -0.1, 0.45);
    headGroup.add(snout);

    addEyes(headGroup, 0.1, 0.42, 0.28, 0.14);
    addHeadOrnaments(headGroup, 0.45);
    addChestCore(bodyGroup, 1.4, 0.7);

    // 二本脚 (太い)
    [-1, 1].forEach((side) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.45, 0.7, 0);

      const thighGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.18, 0.6, 10));
      const thigh = new THREE.Mesh(thighGeo, bodyMat);
      thigh.position.y = -0.15;
      legGroup.add(thigh);

      const footGeo = trackGeo(new THREE.BoxGeometry(0.3, 0.18, 0.45));
      const foot = new THREE.Mesh(footGeo, darkMat);
      foot.position.set(0, -0.5, 0.1);
      legGroup.add(foot);

      bodyGroup.add(legGroup);
      limbs.push({ obj: legGroup, phase: side * Math.PI, isArm: false });
    });

    // 二本腕
    [-1, 1].forEach((side) => {
      const armGroup = new THREE.Group();
      armGroup.position.set(side * 0.62, 1.45, 0.1);

      const armGeo = trackGeo(new THREE.CylinderGeometry(0.12, 0.1, 0.55, 8));
      armGeo.rotateZ(side * 0.5);
      armGeo.rotateX(0.4);
      const arm = new THREE.Mesh(armGeo, bodyMat);
      arm.position.set(side * 0.15, -0.2, 0.1);
      armGroup.add(arm);

      // 手 / 爪
      const clawGeo = trackGeo(new THREE.ConeGeometry(0.06, 0.18, 6));
      clawGeo.rotateX(Math.PI / 2);
      const claw = new THREE.Mesh(clawGeo, accentMat);
      claw.position.set(side * 0.26, -0.42, 0.25);
      armGroup.add(claw);

      bodyGroup.add(armGroup);
      limbs.push({ obj: armGroup, phase: -side * Math.PI * 0.5, isArm: true });
    });

    // 尻尾
    createTailChain(bodyGroup, 0.8, -0.6, 5);

    // 背中のトゲ
    for (let i = 0; i < 4; i++) {
      const spikeGeo = trackGeo(new THREE.ConeGeometry(0.1, 0.25, 6));
      spikeGeo.rotateX(-0.5);
      const spike = new THREE.Mesh(spikeGeo, accentMat);
      spike.position.set(0, 1.6 - i * 0.22, -0.68 + i * 0.05);
      bodyGroup.add(spike);
    }
  } else if (archetype === 1) {
    // ----------------------------------------
    // 1: Quadruped (四足歩行・ビースト型)
    // ----------------------------------------
    const bodyGeo = trackGeo(new THREE.SphereGeometry(0.65, 14, 12));
    bodyGeo.scale(0.85, 0.85, 1.4);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, 0.9, 0);
    bodyGroup.add(bodyMesh);

    // 首と頭
    headGroup.position.set(0, 1.35, 0.8);
    const headGeo = trackGeo(new THREE.SphereGeometry(0.42, 14, 12));
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headGroup.add(headMesh);

    const snoutGeo = trackGeo(new THREE.ConeGeometry(0.2, 0.4, 8));
    snoutGeo.rotateX(Math.PI / 2);
    const snout = new THREE.Mesh(snoutGeo, bellyMat);
    snout.position.set(0, -0.08, 0.35);
    headGroup.add(snout);

    addEyes(headGroup, 0.1, 0.32, 0.24, 0.12);
    addHeadOrnaments(headGroup, 0.38);

    // 四本足
    const legZPositions = [0.55, -0.55];
    legZPositions.forEach((lz, idx) => {
      [-1, 1].forEach((side) => {
        const legGroup = new THREE.Group();
        legGroup.position.set(side * 0.42, 0.7, lz);

        const legGeo = trackGeo(new THREE.CylinderGeometry(0.13, 0.1, 0.65, 8));
        const leg = new THREE.Mesh(legGeo, bodyMat);
        leg.position.y = -0.3;
        legGroup.add(leg);

        const pawGeo = trackGeo(new THREE.SphereGeometry(0.14, 8, 8));
        pawGeo.scale(1, 0.6, 1.3);
        const paw = new THREE.Mesh(pawGeo, darkMat);
        paw.position.set(0, -0.6, 0.05);
        legGroup.add(paw);

        bodyGroup.add(legGroup);
        limbs.push({
          obj: legGroup,
          phase: (side + idx) * Math.PI * 0.5,
          isArm: false,
        });
      });
    });

    createTailChain(bodyGroup, 0.85, -0.85, 4);
  } else if (archetype === 2) {
    // ----------------------------------------
    // 2: Avian (飛行・鳥・有翼ドラゴン型)
    // ----------------------------------------
    const bodyGeo = trackGeo(new THREE.SphereGeometry(0.6, 14, 12));
    bodyGeo.scale(0.8, 1.0, 1.1);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, 1.2, 0);
    bodyGroup.add(bodyMesh);

    // 胸の羽毛
    const chestGeo = trackGeo(new THREE.SphereGeometry(0.55, 12, 10));
    chestGeo.scale(0.7, 0.9, 0.5);
    const chest = new THREE.Mesh(chestGeo, bellyMat);
    chest.position.set(0, 1.25, 0.45);
    bodyGroup.add(chest);

    headGroup.position.set(0, 1.95, 0.35);
    const headGeo = trackGeo(new THREE.SphereGeometry(0.38, 14, 12));
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headGroup.add(headMesh);

    // くちばし
    const beakGeo = trackGeo(new THREE.ConeGeometry(0.14, 0.45, 6));
    beakGeo.rotateX(Math.PI / 2);
    const beak = new THREE.Mesh(beakGeo, accentMat);
    beak.position.set(0, -0.05, 0.45);
    headGroup.add(beak);

    addEyes(headGroup, 0.1, 0.28, 0.22, 0.11);
    addHeadOrnaments(headGroup, 0.35);

    // 翼
    addWings(bodyGroup, 1.35, -0.05, 1.3);

    // 脚
    [-1, 1].forEach((side) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.28, 0.75, 0);

      const legGeo = trackGeo(new THREE.CylinderGeometry(0.06, 0.05, 0.55, 6));
      const leg = new THREE.Mesh(legGeo, accentMat);
      leg.position.y = -0.25;
      legGroup.add(leg);

      const clawGeo = trackGeo(new THREE.BoxGeometry(0.2, 0.05, 0.3));
      const claw = new THREE.Mesh(clawGeo, darkMat);
      claw.position.set(0, -0.52, 0.08);
      legGroup.add(claw);

      bodyGroup.add(legGroup);
      limbs.push({ obj: legGroup, phase: side * Math.PI, isArm: false });
    });

    createTailChain(bodyGroup, 0.95, -0.65, 4);
  } else if (archetype === 3) {
    // ----------------------------------------
    // 3: Chibi (丸型マスコット型 - 愛くるしい！)
    // ----------------------------------------
    const bodyGeo = trackGeo(new THREE.SphereGeometry(0.85, 20, 16));
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, 0.95, 0);
    bodyGroup.add(bodyMesh);

    // ほっぺた（チーク）
    [-1, 1].forEach((side) => {
      const cheekGeo = trackGeo(new THREE.SphereGeometry(0.16, 8, 8));
      cheekGeo.scale(1, 0.6, 0.2);
      const cheek = new THREE.Mesh(cheekGeo, accentMat);
      cheek.position.set(side * 0.58, 0.95, 0.6);
      cheek.rotation.y = side * 0.6;
      bodyGroup.add(cheek);
    });

    headGroup.position.set(0, 1.0, 0);
    addEyes(headGroup, 0.15, 0.76, 0.32, 0.18); // 大きな瞳！
    addHeadOrnaments(headGroup, 0.85);

    // 短い手
    [-1, 1].forEach((side) => {
      const handGeo = trackGeo(new THREE.SphereGeometry(0.18, 10, 8));
      handGeo.scale(0.8, 0.8, 1.5);
      const hand = new THREE.Mesh(handGeo, bodyMat);
      hand.position.set(side * 0.72, 0.8, 0.35);
      hand.rotation.y = side * 0.5;
      bodyGroup.add(hand);
      limbs.push({ obj: hand, phase: side * Math.PI * 0.5, isArm: true });
    });

    // 短い足
    [-1, 1].forEach((side) => {
      const footGeo = trackGeo(new THREE.SphereGeometry(0.25, 10, 8));
      footGeo.scale(0.9, 0.5, 1.5);
      const foot = new THREE.Mesh(footGeo, darkMat);
      foot.position.set(side * 0.42, 0.18, 0.2);
      bodyGroup.add(foot);
    });

    createTailChain(bodyGroup, 0.65, -0.7, 3);
  } else if (archetype === 4) {
    // ----------------------------------------
    // 4: Golem (角ばった重厚アーマー・岩石ロボ型)
    // ----------------------------------------
    const bodyGeo = trackGeo(new THREE.BoxGeometry(1.1, 1.1, 0.9));
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, 1.3, 0);
    bodyGroup.add(bodyMesh);

    // 胸部プレート装甲
    const plateGeo = trackGeo(new THREE.BoxGeometry(0.9, 0.5, 0.15));
    const plate = new THREE.Mesh(plateGeo, accentMat);
    plate.position.set(0, 1.5, 0.5);
    bodyGroup.add(plate);

    addChestCore(bodyGroup, 1.3, 0.52);

    headGroup.position.set(0, 2.1, 0);
    const headGeo = trackGeo(new THREE.BoxGeometry(0.7, 0.55, 0.65));
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headGroup.add(headMesh);

    // 光るバイザー / モノアイ風の目
    const visorGeo = trackGeo(new THREE.BoxGeometry(0.5, 0.14, 0.1));
    const visor = new THREE.Mesh(visorGeo, emissiveAccentMat);
    visor.position.set(0, 0.05, 0.34);
    headGroup.add(visor);

    // 巨大な肩アーマー＆腕
    [-1, 1].forEach((side) => {
      const shoulderGeo = trackGeo(new THREE.BoxGeometry(0.5, 0.5, 0.5));
      const shoulder = new THREE.Mesh(shoulderGeo, accentMat);
      shoulder.position.set(side * 0.85, 1.7, 0);
      bodyGroup.add(shoulder);

      const armGroup = new THREE.Group();
      armGroup.position.set(side * 0.85, 1.5, 0);

      const armGeo = trackGeo(new THREE.BoxGeometry(0.35, 0.7, 0.35));
      const arm = new THREE.Mesh(armGeo, bodyMat);
      arm.position.y = -0.35;
      armGroup.add(arm);

      const fistGeo = trackGeo(new THREE.BoxGeometry(0.42, 0.42, 0.42));
      const fist = new THREE.Mesh(fistGeo, darkMat);
      fist.position.set(0, -0.8, 0.05);
      armGroup.add(fist);

      bodyGroup.add(armGroup);
      limbs.push({ obj: armGroup, phase: side * Math.PI, isArm: true });
    });

    // 太い角柱の脚
    [-1, 1].forEach((side) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.42, 0.7, 0);

      const legGeo = trackGeo(new THREE.BoxGeometry(0.4, 0.7, 0.45));
      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.y = -0.35;
      legGroup.add(leg);

      bodyGroup.add(legGroup);
      limbs.push({ obj: legGroup, phase: -side * Math.PI, isArm: false });
    });
  } else if (archetype === 5) {
    // ----------------------------------------
    // 5: Serpentine (龍・蛇・くねくね型)
    // ----------------------------------------
    const numBodySegs = 7;
    let prevSeg: THREE.Object3D = bodyGroup;
    let segRadius = 0.45;

    for (let i = 0; i < numBodySegs; i++) {
      const segGroup = new THREE.Group();
      if (i === 0) {
        segGroup.position.set(0, 1.2, 0.6);
      } else {
        segGroup.position.set(0, -0.05, -0.4);
      }

      const r = segRadius * Math.pow(0.92, i);
      const geo = trackGeo(new THREE.SphereGeometry(r, 12, 10));
      const m = new THREE.Mesh(geo, i % 2 === 0 ? bodyMat : accentMat);
      segGroup.add(m);

      prevSeg.add(segGroup);
      tailParts.push(segGroup);
      prevSeg = segGroup;
    }

    // ドラゴン風の頭部
    headGroup.position.set(0, 1.5, 1.1);
    const headGeo = trackGeo(new THREE.ConeGeometry(0.38, 0.8, 8));
    headGeo.rotateX(Math.PI / 2);
    const headMesh = new THREE.Mesh(headGeo, bodyMat);
    headGroup.add(headMesh);

    addEyes(headGroup, 0.15, 0.15, 0.28, 0.13);
    addHeadOrnaments(headGroup, 0.35);

    // 小さな前足
    [-1, 1].forEach((side) => {
      const armGeo = trackGeo(new THREE.ConeGeometry(0.1, 0.4, 6));
      armGeo.rotateZ(side * 1.0);
      const arm = new THREE.Mesh(armGeo, accentMat);
      arm.position.set(side * 0.45, 1.1, 0.5);
      bodyGroup.add(arm);
    });
  } else if (archetype === 6) {
    // ----------------------------------------
    // 6: Ghost (浮遊・幻影・ゆらめく型)
    // ----------------------------------------
    const bodyGeo = trackGeo(new THREE.ConeGeometry(0.75, 1.6, 16, 4, true));
    bodyGeo.rotateX(Math.PI);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, 1.2, 0);
    bodyGroup.add(bodyMesh);

    // 上部球体
    const topGeo = trackGeo(new THREE.SphereGeometry(0.72, 16, 14));
    const topMesh = new THREE.Mesh(topGeo, bodyMat);
    topMesh.position.set(0, 1.6, 0);
    bodyGroup.add(topMesh);

    headGroup.position.set(0, 1.6, 0);
    addEyes(headGroup, 0.1, 0.65, 0.3, 0.17); // 怪しい光る目！

    // 浮遊する火の玉・オーブ
    for (let i = 0; i < 3; i++) {
      const orbGeo = trackGeo(new THREE.SphereGeometry(0.18, 10, 8));
      const orb = new THREE.Mesh(orbGeo, emissiveAccentMat);
      const angle = (i * Math.PI * 2) / 3;
      orb.position.set(Math.cos(angle) * 1.1, 1.4, Math.sin(angle) * 1.1);
      bodyGroup.add(orb);
      floatOrbs.push(orb);
    }

    // 浮遊する幽霊の手
    [-1, 1].forEach((side) => {
      const handGroup = new THREE.Group();
      handGroup.position.set(side * 0.95, 1.3, 0.2);

      const hGeo = trackGeo(new THREE.SphereGeometry(0.2, 8, 8));
      hGeo.scale(0.8, 1.2, 0.8);
      const hMesh = new THREE.Mesh(hGeo, accentMat);
      handGroup.add(hMesh);

      bodyGroup.add(handGroup);
      limbs.push({ obj: handGroup, phase: side * Math.PI, isArm: true });
    });
  } else {
    // ----------------------------------------
    // 7: Aquatic (水棲・エイ・イルカ・流線型)
    // ----------------------------------------
    const bodyGeo = trackGeo(new THREE.SphereGeometry(0.7, 16, 14));
    bodyGeo.scale(1.2, 0.6, 1.6);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.set(0, 1.1, 0);
    bodyGroup.add(bodyMesh);

    // 大きな胸ビレ / 水かき
    [-1, 1].forEach((side) => {
      const finGeo = trackGeo(new THREE.BoxGeometry(0.8, 0.06, 0.6));
      finGeo.rotateZ(side * 0.2);
      const fin = new THREE.Mesh(finGeo, accentMat);
      fin.position.set(side * 1.0, 1.05, 0.1);
      bodyGroup.add(fin);
      limbs.push({ obj: fin, phase: side * Math.PI * 0.5, isArm: true });
    });

    // 背ビレ
    const dFinGeo = trackGeo(new THREE.ConeGeometry(0.2, 0.6, 6));
    dFinGeo.rotateX(-0.5);
    const dFin = new THREE.Mesh(dFinGeo, accentMat);
    dFin.position.set(0, 1.55, -0.2);
    bodyGroup.add(dFin);

    headGroup.position.set(0, 1.1, 0.7);
    addEyes(headGroup, 0.12, 0.5, 0.38, 0.14);

    createTailChain(bodyGroup, 1.05, -0.9, 4);
  }

  // ==========================================
  // タイプ別固有の追加エフェクト・パーツ
  // ==========================================
  if (primaryType === 'grass' || secondaryType === 'grass') {
    // 葉っぱの王冠・耳
    const leafGeo = trackGeo(new THREE.SphereGeometry(0.25, 8, 6));
    leafGeo.scale(0.3, 1.2, 0.1);
    [-1, 1].forEach((side) => {
      const leaf = new THREE.Mesh(leafGeo, emissiveAccentMat);
      leaf.position.set(side * 0.25, 0.45, 0);
      leaf.rotation.z = -side * 0.6;
      headGroup.add(leaf);
    });
  } else if (primaryType === 'ice' || secondaryType === 'ice') {
    // 氷晶のトゲ
    for (let i = 0; i < 3; i++) {
      const iceGeo = trackGeo(new THREE.OctahedronGeometry(0.18, 0));
      iceGeo.scale(0.7, 1.8, 0.7);
      const iceMesh = new THREE.Mesh(iceGeo, emissiveAccentMat);
      iceMesh.position.set((i - 1) * 0.3, 0.4, -0.15);
      headGroup.add(iceMesh);
    }
  } else if (primaryType === 'psychic' || secondaryType === 'psychic') {
    // 頭上の浮遊サイコリング
    const ringGeo = trackGeo(new THREE.TorusGeometry(0.45, 0.05, 8, 24));
    ringGeo.rotateX(Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, emissiveAccentMat);
    ring.position.set(0, 0.65, 0);
    headGroup.add(ring);
    floatOrbs.push(ring);
  }

  // ==========================================
  // オーラ & パーティクルシステム
  // (合計種族値に応じた通常 / 600超え豪華 / 1000超え神話級演出)
  // ==========================================
  const aura = createMonsterAura(primaryType, secondaryType, stats);
  root.add(aura.group);

  // ==========================================
  // 更新＆アニメーション関数
  // ==========================================
  let attackProgress = 0;
  let hitProgress = 0;
  let faintProgress = 0;

  const update = (
    delta: number,
    state: AnimationState,
    totalTime: number
  ) => {
    // オーラ・パーティクルシステムの更新
    aura.update(delta, state, totalTime);

    const adjTime = totalTime * animSpeedMultiplier;
    // 1. Idle アニメーション (呼吸・揺らめき)
    const breath = Math.sin(adjTime * 3.0);
    const breathSub = Math.cos(adjTime * 1.5);

    // 胴体の呼吸スケーリング
    bodyGroup.scale.y = 1.0 + breath * 0.04;
    bodyGroup.scale.x = 1.0 - breath * 0.02;
    bodyGroup.scale.z = 1.0 - breath * 0.02;

    // 浮遊系（ゴースト・水棲・飛行）の上下浮遊
    if (archetype === 2 || archetype === 6 || archetype === 7) {
      mainGroup.position.y = Math.sin(adjTime * 2.2) * 0.15;
    } else {
      mainGroup.position.y = Math.abs(breath) * 0.03;
    }

    // 頭部のゆらゆら
    headGroup.rotation.x = breath * 0.05;
    headGroup.rotation.z = breathSub * 0.04;

    // 尻尾の波打ちアニメーション
    tailParts.forEach((seg, idx) => {
      const phase = adjTime * 4.0 - idx * 0.6;
      seg.rotation.y = Math.sin(phase) * 0.2;
      seg.rotation.x = -0.3 + Math.cos(phase * 0.7) * 0.08;
    });

    // 翼の羽ばたき
    wings.forEach((w) => {
      const flap = Math.sin(adjTime * 7.0) * 0.35;
      w.left.rotation.z = flap;
      w.right.rotation.z = -flap;
    });

    // 手足の微動
    limbs.forEach((l) => {
      if (l.isArm) {
        l.obj.rotation.x = Math.sin(adjTime * 2.5 + l.phase) * 0.15;
      } else {
        l.obj.rotation.x = Math.sin(adjTime * 2.0 + l.phase) * 0.08;
      }
    });

    // 浮遊オーブの公転＆自転
    floatOrbs.forEach((orb, idx) => {
      const angle = adjTime * 2.0 + (idx * Math.PI * 2) / floatOrbs.length;
      orb.position.x = Math.cos(angle) * 1.1;
      orb.position.z = Math.sin(angle) * 1.1;
      orb.position.y = 1.4 + Math.sin(adjTime * 4.0 + idx) * 0.15;
      orb.rotation.y += delta * 2;
    });

    // 2. 状態に応じたダイナミックモーション
    if (state === 'attack') {
      attackProgress = Math.min(1.0, attackProgress + delta * 3.5);
      // 前方に飛び出し＆頭突き・突進
      const leap = Math.sin(attackProgress * Math.PI);
      root.position.z = leap * 1.5;
      root.position.y = leap * 0.5;
      root.rotation.x = -leap * 0.35;
    } else {
      if (attackProgress > 0) {
        attackProgress = Math.max(0, attackProgress - delta * 4.0);
        const leap = Math.sin(attackProgress * Math.PI);
        root.position.z = leap * 1.5;
        root.position.y = leap * 0.5;
        root.rotation.x = -leap * 0.35;
      }
    }

    if (state === 'hit') {
      hitProgress = Math.min(1.0, hitProgress + delta * 4.0);
      // 後方にのけぞり＆激しい揺れ
      const shake = Math.sin(hitProgress * Math.PI * 6) * (1.0 - hitProgress);
      root.position.x = shake * 0.25;
      root.position.z = -Math.sin(hitProgress * Math.PI) * 0.6;
      root.rotation.z = shake * 0.2;
      root.rotation.x = Math.sin(hitProgress * Math.PI) * 0.4;
    } else {
      if (hitProgress > 0) {
        hitProgress = Math.max(0, hitProgress - delta * 4.0);
        root.position.x *= 0.5;
        root.position.z *= 0.5;
        root.rotation.z *= 0.5;
        root.rotation.x *= 0.5;
      }
    }

    if (state === 'faint') {
      faintProgress = Math.min(1.0, faintProgress + delta * 2.0);
      // バタリと後ろに倒れ込み、沈み込む
      root.rotation.x = faintProgress * (Math.PI / 2);
      root.position.y = -faintProgress * 0.8;
      mainGroup.scale.setScalar(baseScale * (1.0 - faintProgress * 0.5));
    } else {
      faintProgress = 0;
      if (state !== 'attack' && state !== 'hit') {
        root.rotation.set(0, 0, 0);
        root.position.set(0, 0, 0);
      }
    }
  };

  const dispose = () => {
    aura.dispose();
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  };

  return {
    root,
    materials: [...materials, ...aura.materials],
    geometries: [...geometries, ...aura.geometries],
    aura,
    update,
    dispose,
  };
}
