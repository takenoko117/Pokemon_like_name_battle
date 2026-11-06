import * as THREE from 'three';
import { PokemonType, Stats } from '../types';
import { TYPE_INFO } from '../core/typeChart';
import { AnimationState } from './monster3dGenerator';

export type AuraTier = 'normal' | 'legendary' | 'godlike';

export interface MonsterAura {
  group: THREE.Group;
  tier: AuraTier;
  materials: THREE.Material[];
  geometries: THREE.BufferGeometry[];
  update: (delta: number, state: AnimationState, totalTime: number) => void;
  dispose: () => void;
}

// ----------------------------------------------------
// プログラマティックなテクスチャ生成 (DataTexture)
// Node環境・ブラウザ環境の両方で動作・アセット遅延なし
// ----------------------------------------------------
let cachedGlowTex: THREE.DataTexture | null = null;
let cachedSparkTex: THREE.DataTexture | null = null;
let cachedRuneTex: THREE.DataTexture | null = null;

function getGlowTexture(): THREE.DataTexture {
  if (cachedGlowTex) return cachedGlowTex;
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - half) / half;
      const dy = (y + 0.5 - half) / half;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const alpha = Math.max(0, Math.min(1, 1 - dist));
      const val = Math.floor(Math.pow(alpha, 1.8) * 255);
      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = val;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cachedGlowTex = tex;
  return tex;
}

function getSparkTexture(): THREE.DataTexture {
  if (cachedSparkTex) return cachedSparkTex;
  const size = 32;
  const data = new Uint8Array(size * size * 4);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5 - half) / half;
      const ny = (y + 0.5 - half) / half;
      const ax = Math.abs(nx);
      const ay = Math.abs(ny);
      // 十字光条 + ダイヤ形
      const cross = Math.max(0, 1 - ax * 4) * Math.max(0, 1 - ay * 0.8) +
                    Math.max(0, 1 - ay * 4) * Math.max(0, 1 - ax * 0.8);
      const dist = Math.sqrt(nx * nx + ny * ny);
      const circle = Math.max(0, 1 - dist * 1.6);
      const intensity = Math.min(1, cross * 0.75 + circle * 0.8);
      const val = Math.floor(intensity * 255);
      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = val;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cachedSparkTex = tex;
  return tex;
}

function getRuneTexture(): THREE.DataTexture {
  if (cachedRuneTex) return cachedRuneTex;
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5 - half) / half;
      const ny = (y + 0.5 - half) / half;
      const r = Math.sqrt(nx * nx + ny * ny);
      const angle = Math.atan2(ny, nx);
      let val = 0;

      // 外周リング
      if (Math.abs(r - 0.92) < 0.05) val = 1.0;
      // 内周リング
      else if (Math.abs(r - 0.72) < 0.04) val = 0.9;
      // センターリング
      else if (Math.abs(r - 0.35) < 0.03) val = 0.8;

      // 放射状ルーンスポーク (12分割)
      const spoke = Math.abs(Math.sin(angle * 6));
      if (r > 0.35 && r < 0.92 && spoke > 0.96) {
        val = Math.max(val, 0.85);
      }
      // 八芒星のような目盛り
      const star = Math.abs(Math.sin(angle * 4 + r * 3));
      if (r > 0.45 && r < 0.72 && star > 0.92) {
        val = Math.max(val, 0.7);
      }

      // エッジのソフト減衰
      if (r > 0.98) val = 0;

      const alpha = Math.floor(val * 255);
      const idx = (y * size + x) * 4;
      data[idx] = 255;
      data[idx + 1] = 255;
      data[idx + 2] = 255;
      data[idx + 3] = alpha;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  cachedRuneTex = tex;
  return tex;
}

interface ParticleData {
  type: 'rise' | 'spiral' | 'spark' | 'orbit' | 'helix';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  baseRadius: number;
  angle: number;
  angularSpeed: number;
  helixPhase?: number;
  color: THREE.Color;
  baseColor: THREE.Color;
}

export function createMonsterAura(
  primaryType: PokemonType,
  secondaryType: PokemonType | undefined,
  stats: Stats | undefined
): MonsterAura {
  const group = new THREE.Group();
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

  const total = stats?.total ?? 500;
  let tier: AuraTier = 'normal';
  if (total > 1000) {
    tier = 'godlike';
  } else if (total > 600) {
    tier = 'legendary';
  }

  // カラー設定
  const primaryHex = TYPE_INFO[primaryType]?.color || '#3b82f6';
  const secHex = secondaryType ? TYPE_INFO[secondaryType]?.color : '#fbbf24';
  const primCol = new THREE.Color(primaryHex);
  const secCol = new THREE.Color(secHex);
  const goldCol = new THREE.Color('#ffd700');
  const cyanCol = new THREE.Color('#00f0ff');
  const whiteCol = new THREE.Color('#ffffff');

  // ====================================================
  // 1. パーティクルシステム
  // ====================================================
  let particleCount = 45;
  if (tier === 'legendary') particleCount = 130;
  if (tier === 'godlike') particleCount = 340;

  const particleData: ParticleData[] = [];
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const initParticle = (p: ParticleData, index: number, isInitial = false) => {
    p.life = isInitial ? Math.random() : 0;
    p.maxLife = 1.2 + Math.random() * 1.6;

    if (tier === 'normal') {
      p.type = 'rise';
      p.baseRadius = 0.3 + Math.random() * 0.7;
      p.angle = Math.random() * Math.PI * 2;
      p.angularSpeed = (Math.random() - 0.5) * 1.5;
      p.y = isInitial ? Math.random() * 2.0 : 0.05 + Math.random() * 0.2;
      p.vy = 0.6 + Math.random() * 0.6;
      p.vx = (Math.random() - 0.5) * 0.15;
      p.vz = (Math.random() - 0.5) * 0.15;
      p.baseColor = Math.random() < 0.75 ? primCol.clone() : secCol.clone();
    } else if (tier === 'legendary') {
      const mode = Math.random();
      if (mode < 0.55) {
        p.type = 'spiral';
        p.baseRadius = 0.5 + Math.random() * 0.6;
        p.angle = Math.random() * Math.PI * 2;
        p.angularSpeed = 2.5 + Math.random() * 2.0;
        p.y = isInitial ? Math.random() * 2.4 : 0.1;
        p.vy = 1.0 + Math.random() * 0.9;
        p.vx = 0;
        p.vz = 0;
        p.baseColor = Math.random() < 0.6 ? primCol.clone() : goldCol.clone();
      } else if (mode < 0.8) {
        p.type = 'spark';
        p.baseRadius = 0.2 + Math.random() * 0.9;
        p.angle = Math.random() * Math.PI * 2;
        p.angularSpeed = (Math.random() - 0.5) * 3.0;
        p.y = 0.3 + Math.random() * 1.8;
        p.vy = (Math.random() - 0.2) * 1.2;
        p.vx = (Math.random() - 0.5) * 1.2;
        p.vz = (Math.random() - 0.5) * 1.2;
        p.maxLife = 0.6 + Math.random() * 0.8;
        p.baseColor = Math.random() < 0.5 ? goldCol.clone() : whiteCol.clone();
      } else {
        p.type = 'rise';
        p.baseRadius = 0.4 + Math.random() * 0.8;
        p.angle = Math.random() * Math.PI * 2;
        p.angularSpeed = 1.0;
        p.y = isInitial ? Math.random() * 2.2 : 0.1;
        p.vy = 0.8 + Math.random() * 0.7;
        p.vx = 0;
        p.vz = 0;
        p.baseColor = secCol.clone();
      }
    } else {
      // godlike
      const mode = Math.random();
      if (mode < 0.45) {
        // ダブルヘリックス (二重螺旋)
        p.type = 'helix';
        p.helixPhase = Math.random() < 0.5 ? 0 : Math.PI;
        p.baseRadius = 0.75 + Math.random() * 0.35;
        p.angle = (p.helixPhase || 0) + Math.random() * 0.5;
        p.angularSpeed = 4.0 + Math.random() * 2.0;
        p.y = isInitial ? Math.random() * 3.2 : 0.05;
        p.vy = 1.6 + Math.random() * 1.2;
        p.vx = 0;
        p.vz = 0;
        p.baseColor = (p.helixPhase === 0) ? cyanCol.clone() : goldCol.clone();
      } else if (mode < 0.75) {
        // コズミックオービット (立体公転)
        p.type = 'orbit';
        p.baseRadius = 1.1 + Math.random() * 0.8;
        p.angle = Math.random() * Math.PI * 2;
        p.angularSpeed = 2.0 + Math.random() * 3.0;
        p.y = 1.2 + (Math.random() - 0.5) * 1.4;
        p.vy = (Math.random() - 0.5) * 0.4;
        p.vx = 0;
        p.vz = 0;
        p.baseColor = Math.random() < 0.4 ? whiteCol.clone() : (Math.random() < 0.5 ? primCol.clone() : goldCol.clone());
      } else {
        // 神光スパーク・ライトニング
        p.type = 'spark';
        p.baseRadius = 0.2 + Math.random() * 1.2;
        p.angle = Math.random() * Math.PI * 2;
        p.angularSpeed = 0;
        p.y = 0.5 + Math.random() * 2.0;
        p.vx = (Math.random() - 0.5) * 2.4;
        p.vy = (Math.random() - 0.3) * 2.2;
        p.vz = (Math.random() - 0.5) * 2.4;
        p.maxLife = 0.4 + Math.random() * 0.6;
        p.baseColor = Math.random() < 0.5 ? whiteCol.clone() : cyanCol.clone();
      }
    }

    p.color = p.baseColor.clone();
    p.x = Math.cos(p.angle) * p.baseRadius;
    p.z = Math.sin(p.angle) * p.baseRadius;

    positions[index * 3] = p.x;
    positions[index * 3 + 1] = p.y;
    positions[index * 3 + 2] = p.z;
    colors[index * 3] = p.color.r;
    colors[index * 3 + 1] = p.color.g;
    colors[index * 3 + 2] = p.color.b;
  };

  for (let i = 0; i < particleCount; i++) {
    const p: ParticleData = {
      type: 'rise',
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 1,
      vz: 0,
      life: 0,
      maxLife: 2,
      baseRadius: 0.6,
      angle: 0,
      angularSpeed: 1,
      color: new THREE.Color(),
      baseColor: new THREE.Color(),
    };
    initParticle(p, i, true);
    particleData.push(p);
  }

  const particleGeo = trackGeo(new THREE.BufferGeometry());
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMat = trackMat(
    new THREE.PointsMaterial({
      size: tier === 'godlike' ? 0.22 : (tier === 'legendary' ? 0.18 : 0.14),
      map: tier === 'normal' ? getGlowTexture() : getSparkTexture(),
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.85,
    })
  );

  const particleSystem = new THREE.Points(particleGeo, particleMat);
  group.add(particleSystem);

  // ====================================================
  // 2. 足元のグランドエフェクト (Ground Rings / Runic Circle)
  // ====================================================
  let groundDisc: THREE.Mesh | null = null;
  let outerRuneDisc: THREE.Mesh | null = null;
  let innerRuneDisc: THREE.Mesh | null = null;
  const pulseRings: { mesh: THREE.Mesh; progress: number; speed: number; maxRadius: number }[] = [];

  if (tier === 'normal') {
    // 淡い回転リング
    const gGeo = trackGeo(new THREE.RingGeometry(0.5, 0.9, 32));
    gGeo.rotateX(-Math.PI / 2);
    const gMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: primCol,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    groundDisc = new THREE.Mesh(gGeo, gMat);
    groundDisc.position.y = 0.02;
    group.add(groundDisc);
  } else if (tier === 'legendary') {
    // 豪華な二重グラウンドリング ＋ 脈動パルス
    const gGeo = trackGeo(new THREE.RingGeometry(0.4, 1.25, 48));
    gGeo.rotateX(-Math.PI / 2);
    const gMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: primCol,
        map: getRuneTexture(),
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    groundDisc = new THREE.Mesh(gGeo, gMat);
    groundDisc.position.y = 0.02;
    group.add(groundDisc);

    // 拡散するパルスリング (2本)
    for (let i = 0; i < 2; i++) {
      const pGeo = trackGeo(new THREE.RingGeometry(0.05, 0.12, 32));
      pGeo.rotateX(-Math.PI / 2);
      const pMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: goldCol,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.y = 0.025;
      group.add(pMesh);
      pulseRings.push({
        mesh: pMesh,
        progress: i * 0.5,
        speed: 0.65,
        maxRadius: 1.6,
      });
    }
  } else {
    // godlike: 神聖二重回転ルーン魔法陣 ＋ 3重パルスウェーブ
    // 外周ルーンリング (時計回り)
    const outGeo = trackGeo(new THREE.RingGeometry(0.7, 1.8, 64));
    outGeo.rotateX(-Math.PI / 2);
    const outMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: goldCol,
        map: getRuneTexture(),
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    outerRuneDisc = new THREE.Mesh(outGeo, outMat);
    outerRuneDisc.position.y = 0.02;
    group.add(outerRuneDisc);

    // 内周幾何学リング (反時計回り・シアン)
    const inGeo = trackGeo(new THREE.RingGeometry(0.2, 0.8, 48));
    inGeo.rotateX(-Math.PI / 2);
    const inMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: cyanCol,
        map: getRuneTexture(),
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    innerRuneDisc = new THREE.Mesh(inGeo, inMat);
    innerRuneDisc.position.y = 0.025;
    group.add(innerRuneDisc);

    // 拡散する超衝撃波リング (3本)
    for (let i = 0; i < 3; i++) {
      const pGeo = trackGeo(new THREE.RingGeometry(0.06, 0.16, 40));
      pGeo.rotateX(-Math.PI / 2);
      const pMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? whiteCol : cyanCol,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.y = 0.03;
      group.add(pMesh);
      pulseRings.push({
        mesh: pMesh,
        progress: i * 0.33,
        speed: 0.85,
        maxRadius: 2.2,
      });
    }
  }

  // ====================================================
  // 3. オーラピラー (天を衝くエネルギーシリンダー)
  // ====================================================
  let auraPillarInner: THREE.Mesh | null = null;
  let auraPillarOuter: THREE.Mesh | null = null;

  if (tier === 'legendary') {
    // 伝説のオーラピラー (単層)
    const pilGeo = trackGeo(new THREE.CylinderGeometry(0.7, 0.9, 2.6, 24, 1, true));
    const pilMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: primCol,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    auraPillarInner = new THREE.Mesh(pilGeo, pilMat);
    auraPillarInner.position.y = 1.3;
    group.add(auraPillarInner);
  } else if (tier === 'godlike') {
    // 神話級: 天を突く二重多層オーラピラー (Inner: 高速逆回転, Outer: 脈動プラズマ)
    const inPilGeo = trackGeo(new THREE.CylinderGeometry(0.65, 0.85, 3.8, 32, 1, true));
    const inPilMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: cyanCol,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    auraPillarInner = new THREE.Mesh(inPilGeo, inPilMat);
    auraPillarInner.position.y = 1.9;
    group.add(auraPillarInner);

    const outPilGeo = trackGeo(new THREE.CylinderGeometry(1.0, 1.3, 4.2, 32, 1, true));
    const outPilMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: goldCol,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    auraPillarOuter = new THREE.Mesh(outPilGeo, outPilMat);
    auraPillarOuter.position.y = 2.1;
    group.add(auraPillarOuter);
  }

  // ====================================================
  // 4. オービタルリング / ジャイロスコープ / セレスティアルクレスト
  // ====================================================
  let orbitalRing: THREE.Mesh | null = null;
  const gyroRings: THREE.Mesh[] = [];
  let haloMesh: THREE.Group | null = null;

  if (tier === 'legendary') {
    // 腰回りの傾斜光輪
    const oGeo = trackGeo(new THREE.TorusGeometry(1.0, 0.025, 8, 48));
    const oMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: goldCol,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
      })
    );
    orbitalRing = new THREE.Mesh(oGeo, oMat);
    orbitalRing.position.y = 1.1;
    orbitalRing.rotation.x = Math.PI / 4;
    group.add(orbitalRing);
  } else if (tier === 'godlike') {
    // 神聖ジャイロスコープ 3重リング (天球儀)
    const gyroColors = [goldCol, cyanCol, whiteCol];
    const gyroRotations = [
      new THREE.Euler(Math.PI / 3, 0, 0),
      new THREE.Euler(0, Math.PI / 4, Math.PI / 6),
      new THREE.Euler(-Math.PI / 4, -Math.PI / 3, 0),
    ];

    for (let i = 0; i < 3; i++) {
      const gGeo = trackGeo(new THREE.TorusGeometry(1.2 + i * 0.15, 0.03, 10, 64));
      const gMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: gyroColors[i],
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
        })
      );
      const mesh = new THREE.Mesh(gGeo, gMat);
      mesh.position.y = 1.35;
      mesh.rotation.copy(gyroRotations[i]);
      group.add(mesh);
      gyroRings.push(mesh);
    }

    // 背後・頭上の神の後光 (Divine Halo)
    haloMesh = new THREE.Group();
    haloMesh.position.set(0, 1.8, -0.45);

    // 光輪トーラス
    const hTorusGeo = trackGeo(new THREE.TorusGeometry(0.7, 0.04, 12, 48));
    const hTorusMat = trackMat(
      new THREE.MeshBasicMaterial({
        color: goldCol,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      })
    );
    haloMesh.add(new THREE.Mesh(hTorusGeo, hTorusMat));

    // 放射状の神光線 (8本)
    for (let i = 0; i < 8; i++) {
      const rayGeo = trackGeo(new THREE.BoxGeometry(0.04, 0.35, 0.02));
      const rayMat = trackMat(
        new THREE.MeshBasicMaterial({
          color: i % 2 === 0 ? whiteCol : goldCol,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
        })
      );
      const ray = new THREE.Mesh(rayGeo, rayMat);
      const angle = (i * Math.PI * 2) / 8;
      ray.position.set(Math.cos(angle) * 0.75, Math.sin(angle) * 0.75, 0);
      ray.rotation.z = angle + Math.PI / 2;
      haloMesh.add(ray);
    }
    group.add(haloMesh);
  }

  // ====================================================
  // 5. ダイナミックライティング (PointLight)
  // ====================================================
  let auraLight: THREE.PointLight | null = null;
  let secondLight: THREE.PointLight | null = null;

  if (tier === 'legendary') {
    auraLight = new THREE.PointLight(primCol, 1.8, 5.0);
    auraLight.position.set(0, 1.2, 0.5);
    group.add(auraLight);
  } else if (tier === 'godlike') {
    auraLight = new THREE.PointLight(cyanCol, 3.5, 7.0);
    auraLight.position.set(0, 1.5, 0.6);
    group.add(auraLight);

    secondLight = new THREE.PointLight(goldCol, 2.5, 5.5);
    secondLight.position.set(0, 0.6, -0.6);
    group.add(secondLight);
  }

  // ====================================================
  // 6. 更新ループ & アニメーション
  // ====================================================
  const update = (delta: number, state: AnimationState, totalTime: number) => {
    // 状態によるエフェクト増幅
    let boost = 1.0;
    let forwardOffset = 0;
    if (state === 'attack') {
      boost = 2.4;
      forwardOffset = 0.6;
    } else if (state === 'hit') {
      boost = 0.5;
    } else if (state === 'faint') {
      boost = 0.2;
    }

    // ----------------------------------------------------
    // A. パーティクル更新
    // ----------------------------------------------------
    const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
    const colAttr = particleGeo.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i < particleCount; i++) {
      const p = particleData[i];
      p.life += delta * boost;
      if (p.life > p.maxLife) {
        initParticle(p, i, false);
      }

      const progress = p.life / p.maxLife;

      if (p.type === 'rise') {
        p.angle += p.angularSpeed * delta;
        p.y += p.vy * delta * boost;
        p.x = Math.cos(p.angle) * p.baseRadius + p.vx * p.life;
        p.z = Math.sin(p.angle) * p.baseRadius + p.vz * p.life;
      } else if (p.type === 'spiral') {
        p.angle += p.angularSpeed * delta * boost;
        p.y += p.vy * delta * boost;
        // 砂時計・ラッパ状に螺旋半径が変化
        const r = p.baseRadius * (0.8 + Math.sin(progress * Math.PI) * 0.4);
        p.x = Math.cos(p.angle) * r;
        p.z = Math.sin(p.angle) * r;
      } else if (p.type === 'helix') {
        p.angle += p.angularSpeed * delta * boost;
        p.y += p.vy * delta * boost;
        const r = p.baseRadius * (1.0 + Math.sin(p.y * 3.0) * 0.25);
        p.x = Math.cos(p.angle) * r;
        p.z = Math.sin(p.angle) * r;
      } else if (p.type === 'orbit') {
        p.angle += p.angularSpeed * delta * boost;
        p.x = Math.cos(p.angle) * p.baseRadius;
        p.z = Math.sin(p.angle) * p.baseRadius;
        p.y += p.vy * delta;
        if (p.y > 2.5) p.vy = -Math.abs(p.vy);
        if (p.y < 0.4) p.vy = Math.abs(p.vy);
      } else if (p.type === 'spark') {
        p.x += p.vx * delta * boost;
        p.y += p.vy * delta * boost;
        p.z += p.vz * delta * boost;
      }

      // 攻撃時の前方バイアス
      let curZ = p.z;
      if (state === 'attack') {
        curZ += forwardOffset * Math.sin(progress * Math.PI);
      }

      // 被弾時の激しいブレ
      let curX = p.x;
      if (state === 'hit') {
        curX += (Math.random() - 0.5) * 0.2;
      }

      // フェードアウト / アルファ減衰をカラー輝度で表現
      const alpha = Math.sin(progress * Math.PI);
      let r = p.baseColor.r * alpha;
      let g = p.baseColor.g * alpha;
      let b = p.baseColor.b * alpha;

      // Godlike時のプリズムカラーシフト
      if (tier === 'godlike') {
        const hueShift = (totalTime * 0.4 + i * 0.02) % 1;
        const shifted = new THREE.Color().setHSL(hueShift, 0.95, 0.65);
        r = THREE.MathUtils.lerp(r, shifted.r * alpha, 0.45);
        g = THREE.MathUtils.lerp(g, shifted.g * alpha, 0.45);
        b = THREE.MathUtils.lerp(b, shifted.b * alpha, 0.45);
      }

      posAttr.setXYZ(i, curX, p.y, curZ);
      colAttr.setXYZ(i, r, g, b);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    // ----------------------------------------------------
    // B. 足元のグランドエフェクト更新
    // ----------------------------------------------------
    if (groundDisc) {
      groundDisc.rotation.z += delta * 0.5 * boost;
      // 呼吸のような明滅
      const breath = 0.5 + Math.sin(totalTime * 3.0) * 0.2;
      (groundDisc.material as THREE.MeshBasicMaterial).opacity =
        (tier === 'legendary' ? 0.45 : 0.25) * breath * (state === 'faint' ? 0.2 : 1.0);
    }

    if (outerRuneDisc) {
      // 外周ルーン: 時計回り
      outerRuneDisc.rotation.z += delta * 0.7 * boost;
      const breath = 0.7 + Math.sin(totalTime * 4.0) * 0.25;
      (outerRuneDisc.material as THREE.MeshBasicMaterial).opacity =
        0.8 * breath * (state === 'faint' ? 0.2 : 1.0);
    }

    if (innerRuneDisc) {
      // 内周ルーン: 反時計回り高速回転
      innerRuneDisc.rotation.z -= delta * 1.3 * boost;
      const pulse = 0.65 + Math.cos(totalTime * 5.0) * 0.25;
      (innerRuneDisc.material as THREE.MeshBasicMaterial).opacity =
        0.75 * pulse * (state === 'faint' ? 0.2 : 1.0);
    }

    // 拡散するパルスリング
    pulseRings.forEach((pr) => {
      pr.progress += delta * pr.speed * boost;
      if (pr.progress > 1.0) pr.progress -= 1.0;

      const scale = 1.0 + pr.progress * (pr.maxRadius * 8.0);
      pr.mesh.scale.set(scale, scale, 1);
      const alpha = (1.0 - pr.progress) * 0.75;
      (pr.mesh.material as THREE.MeshBasicMaterial).opacity =
        state === 'faint' ? 0 : alpha;
    });

    // ----------------------------------------------------
    // C. オーラピラー更新
    // ----------------------------------------------------
    if (auraPillarInner) {
      auraPillarInner.rotation.y -= delta * (tier === 'godlike' ? 2.5 : 1.2) * boost;
      const scaleBreath = 1.0 + Math.sin(totalTime * 4.0) * 0.08;
      auraPillarInner.scale.set(scaleBreath, 1.0, scaleBreath);
      if (state === 'attack') {
        auraPillarInner.rotation.x = -0.3;
        auraPillarInner.scale.set(scaleBreath * 1.4, 1.2, scaleBreath * 1.4);
      } else {
        auraPillarInner.rotation.x = 0;
      }
    }

    if (auraPillarOuter) {
      auraPillarOuter.rotation.y += delta * 1.4 * boost;
      const scaleBreath = 1.0 + Math.cos(totalTime * 3.2) * 0.12;
      auraPillarOuter.scale.set(scaleBreath, 1.0, scaleBreath);
      if (state === 'attack') {
        auraPillarOuter.rotation.x = -0.3;
        auraPillarOuter.scale.set(scaleBreath * 1.5, 1.3, scaleBreath * 1.5);
      } else {
        auraPillarOuter.rotation.x = 0;
      }
    }

    // ----------------------------------------------------
    // D. オービタルリング / ジャイロ / ハロー更新
    // ----------------------------------------------------
    if (orbitalRing) {
      orbitalRing.rotation.z += delta * 1.2 * boost;
      orbitalRing.rotation.y += delta * 0.8 * boost;
    }

    gyroRings.forEach((gr, idx) => {
      const dir = idx % 2 === 0 ? 1 : -1;
      gr.rotation.x += delta * (1.2 + idx * 0.4) * dir * boost;
      gr.rotation.y += delta * (1.5 - idx * 0.3) * boost;
      gr.rotation.z += delta * 0.7 * dir * boost;
    });

    if (haloMesh) {
      haloMesh.rotation.z += delta * 0.8 * boost;
      const haloBreath = 1.0 + Math.sin(totalTime * 3.5) * 0.08;
      haloMesh.scale.setScalar(haloBreath);
    }

    // ----------------------------------------------------
    // E. ポイントライト更新
    // ----------------------------------------------------
    if (auraLight) {
      const baseIntensity = tier === 'godlike' ? 3.5 : 1.8;
      const lightPulse = Math.sin(totalTime * 5.0) * 0.4;
      auraLight.intensity = Math.max(0, (baseIntensity + lightPulse) * (state === 'attack' ? 2.0 : 1.0) * (state === 'faint' ? 0.2 : 1.0));
    }
    if (secondLight) {
      const lightPulse = Math.cos(totalTime * 4.0) * 0.4;
      secondLight.intensity = Math.max(0, (2.5 + lightPulse) * (state === 'attack' ? 1.8 : 1.0) * (state === 'faint' ? 0.2 : 1.0));
    }
  };

  const dispose = () => {
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    if (auraLight) {
      group.remove(auraLight);
      auraLight.dispose?.();
    }
    if (secondLight) {
      group.remove(secondLight);
      secondLight.dispose?.();
    }
  };

  return {
    group,
    tier,
    materials,
    geometries,
    update,
    dispose,
  };
}
