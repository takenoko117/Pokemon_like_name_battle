import { simulateBattle } from '../core/battleEngine';
import { generateMonster } from '../core/generator';
import { generateMonsterSprite } from '../core/pixelMonster';
import { TYPE_INFO } from '../core/typeChart';
import { BattleResult, Monster } from '../types';
import { retroAudio } from './retroAudio';
import { Monster3DViewer } from '../three/monster3dViewer';

export type DisplayMode = '3d' | '2d' | 'compare';

export class UIManager {
  private container: HTMLElement;
  private p1Monster: Monster | null = null;
  private p2Monster: Monster | null = null;
  private p1SpriteUrl: string = '';
  private p2SpriteUrl: string = '';

  private currentSpeed: number = 1; // 1, 2, 4
  private isSkipping: boolean = false;

  private displayMode: DisplayMode = '3d';
  private viewers: Monster3DViewer[] = [];
  private p1ArenaViewer: Monster3DViewer | null = null;
  private p2ArenaViewer: Monster3DViewer | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  public init() {
    this.renderInputView();
  }

  private clearViewers() {
    this.viewers.forEach((v) => v.dispose());
    this.viewers = [];
    this.p1ArenaViewer = null;
    this.p2ArenaViewer = null;
  }

  /**
   * 画面1: 名前入力画面
   */
  private renderInputView() {
    this.clearViewers();

    this.container.innerHTML = `
      <header class="game-header">
        <h1 class="game-title">NAME BATTLER</h1>
        <p class="game-subtitle">名前から生まれるモンスターのポケモン準拠オートバトル</p>
      </header>

      ${this.renderModeToggleBar(false)}

      <div class="retro-box input-view">
        <div class="names-grid">
          <div class="player-card p1">
            <div class="player-header p1">
              <span>PLAYER 1 (あなた)</span>
              <button class="random-btn" id="rand-p1-btn">ランダム</button>
            </div>
            <input type="text" id="p1-name-input" class="name-input" placeholder="名前を入力 (例: サトシ)" value="サトシ" maxlength="15" />
          </div>

          <div class="player-card p2">
            <div class="player-header p2">
              <span>PLAYER 2 (あいて)</span>
              <button class="random-btn" id="rand-p2-btn">ランダム</button>
            </div>
            <input type="text" id="p2-name-input" class="name-input" placeholder="名前を入力 (例: シゲル)" value="シゲル" maxlength="15" />
          </div>
        </div>

        <div class="preset-section">
          <span style="font-size: 13px; color: var(--text-dim);">おすすめ対決:</span>
          <button class="preset-btn" data-p1="ピカチュウ" data-p2="リザードン">⚡ ピカチュウ vs 🔥 リザードン</button>
          <button class="preset-btn" data-p1="ゆうしゃ" data-p2="まおう">⚔️ ゆうしゃ vs 👿 まおう</button>
          <button class="preset-btn" data-p1="りんご" data-p2="みかん">🍎 りんご vs 🍊 みかん</button>
          <button class="preset-btn" data-p1="ChatGPT" data-p2="Gemini">🤖 ChatGPT vs 🔮 Gemini</button>
        </div>

        <button class="start-btn" id="start-summon-btn">モンスター召喚 ＆ 能力開示！</button>
      </div>
    `;

    const p1Input = document.getElementById('p1-name-input') as HTMLInputElement;
    const p2Input = document.getElementById('p2-name-input') as HTMLInputElement;

    const sampleNames = [
      'ピカチュウ', 'リザードン', 'ミュウツー', 'カイリュー', 'ゲンガー',
      'カビゴン', 'ルギア', 'ホウオウ', 'レックウザ', 'ガブリアス',
      'アルセウス', 'ゲッコウガ', 'ミミッキュ', 'ザシアン', 'コライドン',
      '田中', '佐藤', 'スティーブ', 'アリス', 'ボブ',
      'カレーライス', 'ラーメン', 'すし', 'やきにく', 'ピザ',
      'ドラゴン', 'フェニックス', 'ゴーレム', 'オーガ', 'スライム'
    ];

    document.getElementById('rand-p1-btn')?.addEventListener('click', () => {
      retroAudio.playSelect();
      p1Input.value = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    });

    document.getElementById('rand-p2-btn')?.addEventListener('click', () => {
      retroAudio.playSelect();
      p2Input.value = sampleNames[Math.floor(Math.random() * sampleNames.length)];
    });

    this.container.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        retroAudio.playSelect();
        const target = e.currentTarget as HTMLElement;
        if (target.dataset.p1) p1Input.value = target.dataset.p1;
        if (target.dataset.p2) p2Input.value = target.dataset.p2;
      });
    });

    // トグルボタンイベント
    this.container.querySelectorAll('.mode-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        retroAudio.playSelect();
        const target = e.currentTarget as HTMLElement;
        const newMode = target.dataset.mode as DisplayMode;
        if (newMode && newMode !== this.displayMode) {
          this.displayMode = newMode;
          this.container.querySelectorAll('.mode-toggle-btn').forEach(b => {
            const m = (b as HTMLElement).dataset.mode;
            b.classList.toggle('active', m === this.displayMode);
            b.classList.toggle('active-2d', m === '2d' && this.displayMode === '2d');
          });
        }
      });
    });

    document.getElementById('start-summon-btn')?.addEventListener('click', () => {
      retroAudio.playSelect();
      const n1 = p1Input.value.trim() || 'プレイヤー1';
      const n2 = p2Input.value.trim() || 'プレイヤー2';

      this.p1Monster = generateMonster(n1);
      this.p2Monster = generateMonster(n2);

      this.p1SpriteUrl = generateMonsterSprite(
        this.p1Monster.spriteSeed,
        this.p1Monster.types[0],
        this.p1Monster.types[1]
      );

      this.p2SpriteUrl = generateMonsterSprite(
        this.p2Monster.spriteSeed,
        this.p2Monster.types[0],
        this.p2Monster.types[1]
      );

      this.renderRevealView();
    });
  }

  /**
   * モード切り替えバーのHTML生成
   */
  private renderModeToggleBar(allowCompare: boolean = false): string {
    return `
      <div class="mode-toggle-bar">
        <span class="mode-toggle-label">RENDER:</span>
        <div class="mode-toggle-buttons">
          <button class="mode-toggle-btn ${this.displayMode === '3d' ? 'active' : ''}" data-mode="3d">
            ✨ 3Dモデル
          </button>
          <button class="mode-toggle-btn ${this.displayMode === '2d' ? 'active active-2d' : ''}" data-mode="2d">
            👾 2Dドット
          </button>
          ${
            allowCompare
              ? `<button class="mode-toggle-btn ${this.displayMode === 'compare' ? 'active active-compare' : ''}" data-mode="compare">
                  ⚖️ 2D/3D比較
                </button>`
              : ''
          }
        </div>
      </div>
    `;
  }

  /**
   * 画面2: モンスター能力・技の開示画面
   */
  private renderRevealView() {
    if (!this.p1Monster || !this.p2Monster) return;
    this.clearViewers();

    const renderCard = (
      m: Monster,
      sprite: string,
      pLabel: string,
      pClass: string,
      pId: string
    ) => {
      const typeBadges = m.types
        .map(t => {
          const info = TYPE_INFO[t];
          return `<span class="type-badge" style="background-color: ${info.badgeBg}">${info.name}</span>`;
        })
        .join(' ');

      const maxStat = 250;
      const statRows = [
        { label: 'HP', val: m.stats.hp, col: '#10b981' },
        { label: 'こうげき', val: m.stats.attack, col: '#ef4444' },
        { label: 'ぼうぎょ', val: m.stats.defense, col: '#f59e0b' },
        { label: 'とくこう', val: m.stats.spAttack, col: '#8b5cf6' },
        { label: 'とくぼう', val: m.stats.spDefense, col: '#06b6d4' },
        { label: 'すばやさ', val: m.stats.speed, col: '#ec4899' },
      ].map(s => `
        <div class="stat-row">
          <span class="stat-label">${s.label}</span>
          <span class="stat-val">${s.val}</span>
          <div class="stat-bar-outer">
            <div class="stat-bar-inner" style="width: ${Math.min(100, (s.val / maxStat) * 100)}%; background: ${s.col};"></div>
          </div>
        </div>
      `).join('');

      const movesHtml = m.moves.map(mv => {
        const tInfo = TYPE_INFO[mv.type];
        const catStr = mv.category === 'physical' ? '物理' : '特殊';
        return `
          <div class="move-pill">
            <div style="display:flex; align-items:center; gap:6px;">
              <span class="type-badge" style="background: ${tInfo.badgeBg}; font-size: 11px;">${tInfo.name}</span>
              <strong>${mv.name}</strong>
            </div>
            <span style="font-size: 12px; color: var(--text-dim);">威力 ${mv.power} / 命中 ${mv.accuracy}% (${catStr})</span>
          </div>
        `;
      }).join('');

      let previewHtml = '';
      if (this.displayMode === '3d') {
        previewHtml = `
          <div class="monster-sprite-box">
            <div class="monster-3d-canvas-wrap" id="${pId}-3d-wrap"></div>
            <span class="drag-hint">🔄 ドラッグで回転</span>
          </div>
        `;
      } else if (this.displayMode === '2d') {
        previewHtml = `
          <div class="monster-sprite-box">
            <img src="${sprite}" alt="${m.name}" />
          </div>
        `;
      } else {
        // compare
        previewHtml = `
          <div class="monster-compare-box">
            <div class="compare-col">
              <span class="compare-badge">👾 2Dドット</span>
              <div class="compare-preview-2d">
                <img src="${sprite}" alt="${m.name}" />
              </div>
            </div>
            <div class="compare-col">
              <span class="compare-badge">✨ 3Dモデル</span>
              <div class="compare-preview-3d" id="${pId}-compare-3d-wrap"></div>
              <span class="drag-hint">🔄 回転</span>
            </div>
          </div>
        `;
      }

      return `
        <div class="monster-summary-card">
          <div class="player-header ${pClass}" style="width:100%; margin-bottom:8px;">${pLabel}</div>
          ${previewHtml}
          <div class="monster-name-title">${m.name}</div>
          <div class="type-badges">${typeBadges}</div>
          <div class="bst-banner">合計ステータス: ${m.stats.total}</div>
          <div class="stats-bars">${statRows}</div>
          <div class="moves-list">${movesHtml}</div>
        </div>
      `;
    };

    this.container.innerHTML = `
      <header class="game-header">
        <h1 class="game-title">STATUS REVEAL</h1>
        <p class="game-subtitle">モンスターの能力値・造形が開示されました！</p>
      </header>

      ${this.renderModeToggleBar(true)}

      <div class="retro-box reveal-view">
        <div class="monsters-reveal-grid">
          ${renderCard(this.p1Monster, this.p1SpriteUrl, 'PLAYER 1', 'p1', 'reveal-p1')}
          ${renderCard(this.p2Monster, this.p2SpriteUrl, 'PLAYER 2', 'p2', 'reveal-p2')}
        </div>

        <div style="display:flex; gap:12px; margin-top:8px;">
          <button class="random-btn" id="back-input-btn" style="padding:10px 16px; font-size:14px;">名前を変える</button>
          <button class="start-btn" id="start-battle-btn" style="flex:1;">バトル開始！（BATTLE START）</button>
        </div>
      </div>
    `;

    // 3Dモデルビューアのバインド
    if (this.displayMode === '3d') {
      const p1Wrap = document.getElementById('reveal-p1-3d-wrap');
      const p2Wrap = document.getElementById('reveal-p2-3d-wrap');
      if (p1Wrap) {
        this.viewers.push(
          new Monster3DViewer(
            p1Wrap,
            this.p1Monster.spriteSeed,
            this.p1Monster.types[0],
            this.p1Monster.types[1],
            this.p1Monster.stats,
            { autoRotate: true, viewAngle: 'front' }
          )
        );
      }
      if (p2Wrap) {
        this.viewers.push(
          new Monster3DViewer(
            p2Wrap,
            this.p2Monster.spriteSeed,
            this.p2Monster.types[0],
            this.p2Monster.types[1],
            this.p2Monster.stats,
            { autoRotate: true, viewAngle: 'front' }
          )
        );
      }
    } else if (this.displayMode === 'compare') {
      const p1CompareWrap = document.getElementById('reveal-p1-compare-3d-wrap');
      const p2CompareWrap = document.getElementById('reveal-p2-compare-3d-wrap');
      if (p1CompareWrap) {
        this.viewers.push(
          new Monster3DViewer(
            p1CompareWrap,
            this.p1Monster.spriteSeed,
            this.p1Monster.types[0],
            this.p1Monster.types[1],
            this.p1Monster.stats,
            { autoRotate: true, viewAngle: 'front' }
          )
        );
      }
      if (p2CompareWrap) {
        this.viewers.push(
          new Monster3DViewer(
            p2CompareWrap,
            this.p2Monster.spriteSeed,
            this.p2Monster.types[0],
            this.p2Monster.types[1],
            this.p2Monster.stats,
            { autoRotate: true, viewAngle: 'front' }
          )
        );
      }
    }

    // トグルボタンイベント
    this.container.querySelectorAll('.mode-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        retroAudio.playSelect();
        const target = e.currentTarget as HTMLElement;
        const newMode = target.dataset.mode as DisplayMode;
        if (newMode && newMode !== this.displayMode) {
          this.displayMode = newMode;
          this.renderRevealView();
        }
      });
    });

    document.getElementById('back-input-btn')?.addEventListener('click', () => {
      retroAudio.playSelect();
      this.renderInputView();
    });

    document.getElementById('start-battle-btn')?.addEventListener('click', () => {
      retroAudio.playSelect();
      this.startBattle();
    });
  }

  /**
   * 画面3: バトル画面の開始
   */
  private startBattle() {
    if (!this.p1Monster || !this.p2Monster) return;

    this.isSkipping = false;
    this.currentSpeed = 1;

    // バトルシミュレーションを実行してログを完全取得
    const battleResult = simulateBattle(this.p1Monster, this.p2Monster);

    this.renderBattleArena(battleResult);
    this.playBattleSequence(battleResult);
  }

  /**
   * バトルアリーナの描画
   */
  private renderBattleArena(result: BattleResult) {
    if (!this.p1Monster || !this.p2Monster) return;
    this.clearViewers();

    const p1 = this.p1Monster;
    const p2 = this.p2Monster;

    const renderTypeTags = (m: Monster) => m.types
      .map(t => `<span class="type-badge" style="background:${TYPE_INFO[t].badgeBg}; font-size:10px; padding:1px 5px;">${TYPE_INFO[t].name}</span>`)
      .join(' ');

    this.container.innerHTML = `
      <header class="game-header">
        <h1 class="game-title">BATTLE ARENA</h1>
        <div style="display:flex; justify-content:center; gap:8px;">
          <span id="turn-counter" style="font-family:var(--pixel-font); font-size:13px; color:var(--accent-gold);">TURN 1 / 30</span>
        </div>
      </header>

      ${this.renderModeToggleBar(false)}

      <div class="retro-box battle-view">
        <div class="battle-arena">
          <!-- P2 (奥) -->
          <div class="ground-p2"></div>
          <div class="fighter-sprite-wrapper p2" id="sprite-wrap-p2"></div>
          <div class="status-plate p2">
            <div class="plate-header">
              <span class="plate-name">${p2.name}</span>
              <span class="plate-level">Lv.50</span>
            </div>
            <div style="margin-bottom:4px;">${renderTypeTags(p2)}</div>
            <div class="hp-bar-container">
              <span class="hp-badge">HP</span>
              <div class="hp-track">
                <div class="hp-fill" id="hp-fill-p2" style="width: 100%;"></div>
              </div>
            </div>
            <div class="hp-nums" id="hp-num-p2">${p2.maxHp} / ${p2.maxHp}</div>
          </div>

          <!-- P1 (手前) -->
          <div class="ground-p1"></div>
          <div class="fighter-sprite-wrapper p1" id="sprite-wrap-p1"></div>
          <div class="status-plate p1">
            <div class="plate-header">
              <span class="plate-name">${p1.name}</span>
              <span class="plate-level">Lv.50</span>
            </div>
            <div style="margin-bottom:4px;">${renderTypeTags(p1)}</div>
            <div class="hp-bar-container">
              <span class="hp-badge">HP</span>
              <div class="hp-track">
                <div class="hp-fill" id="hp-fill-p1" style="width: 100%;"></div>
              </div>
            </div>
            <div class="hp-nums" id="hp-num-p1">${p1.maxHp} / ${p1.maxHp}</div>
          </div>
        </div>

        <!-- メッセージウィンドウ -->
        <div class="message-window" id="battle-message-window">
          <div class="message-line">${p1.name} と ${p2.name} の 勝負が はじまった！</div>
        </div>

        <!-- 速度・コントロールバー -->
        <div class="controls-bar">
          <div class="speed-btns">
            <span style="font-size:12px; color:var(--text-dim); margin-right:4px;">再生速度:</span>
            <button class="ctrl-btn active" id="spd-1x">1x</button>
            <button class="ctrl-btn" id="spd-2x">2x</button>
            <button class="ctrl-btn" id="spd-4x">4x</button>
            <button class="ctrl-btn" id="btn-skip" style="margin-left:8px; background:#475569; color:#f8fafc;">SKIP ⏩</button>
          </div>
          <button class="ctrl-btn" id="audio-toggle-btn">🔊 サウンド: ON</button>
        </div>
      </div>
    `;

    // アリーナ上のモンスターをセット
    this.updateArenaFighters();

    // トグルボタンイベント
    this.container.querySelectorAll('.mode-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        retroAudio.playSelect();
        const target = e.currentTarget as HTMLElement;
        const newMode = target.dataset.mode as DisplayMode;
        if (newMode && newMode !== this.displayMode && newMode !== 'compare') {
          this.displayMode = newMode;
          this.updateArenaFighters();
          // トグルUIのactive更新
          this.container.querySelectorAll('.mode-toggle-btn').forEach(b => {
            const m = (b as HTMLElement).dataset.mode;
            b.classList.toggle('active', m === this.displayMode);
            b.classList.toggle('active-2d', m === '2d' && this.displayMode === '2d');
          });
        }
      });
    });

    // 速度ボタン
    const spd1 = document.getElementById('spd-1x')!;
    const spd2 = document.getElementById('spd-2x')!;
    const spd4 = document.getElementById('spd-4x')!;
    const btnSkip = document.getElementById('btn-skip')!;
    const btnAudio = document.getElementById('audio-toggle-btn')!;

    const setSpeed = (spd: number, activeBtn: HTMLElement) => {
      this.currentSpeed = spd;
      [spd1, spd2, spd4].forEach(b => b.classList.remove('active'));
      activeBtn.classList.add('active');
    };

    spd1.addEventListener('click', () => setSpeed(1, spd1));
    spd2.addEventListener('click', () => setSpeed(2, spd2));
    spd4.addEventListener('click', () => setSpeed(4, spd4));

    btnSkip.addEventListener('click', () => {
      this.isSkipping = true;
    });

    btnAudio.addEventListener('click', () => {
      const enabled = !retroAudio.isEnabled();
      retroAudio.setEnabled(enabled);
      btnAudio.textContent = enabled ? '🔊 サウンド: ON' : '🔈 サウンド: OFF';
    });
  }

  /**
   * バトルアリーナ内のP1・P2モンスター表示の更新（2D / 3D 切り替え）
   */
  private updateArenaFighters() {
    if (!this.p1Monster || !this.p2Monster) return;

    const wrapP1 = document.getElementById('sprite-wrap-p1');
    const wrapP2 = document.getElementById('sprite-wrap-p2');
    if (!wrapP1 || !wrapP2) return;

    // 既存ビューアの破棄
    if (this.p1ArenaViewer) {
      this.p1ArenaViewer.dispose();
      this.p1ArenaViewer = null;
    }
    if (this.p2ArenaViewer) {
      this.p2ArenaViewer.dispose();
      this.p2ArenaViewer = null;
    }

    wrapP1.innerHTML = '';
    wrapP2.innerHTML = '';

    if (this.displayMode === '3d') {
      const box1 = document.createElement('div');
      box1.className = 'fighter-3d-box';
      wrapP1.appendChild(box1);

      const box2 = document.createElement('div');
      box2.className = 'fighter-3d-box';
      wrapP2.appendChild(box2);

      this.p1ArenaViewer = new Monster3DViewer(
        box1,
        this.p1Monster.spriteSeed,
        this.p1Monster.types[0],
        this.p1Monster.types[1],
        this.p1Monster.stats,
        { viewAngle: 'p1-arena', interactive: false }
      );
      this.viewers.push(this.p1ArenaViewer);

      this.p2ArenaViewer = new Monster3DViewer(
        box2,
        this.p2Monster.spriteSeed,
        this.p2Monster.types[0],
        this.p2Monster.types[1],
        this.p2Monster.stats,
        { viewAngle: 'p2-arena', interactive: false }
      );
      this.viewers.push(this.p2ArenaViewer);
    } else {
      // 2D
      wrapP1.innerHTML = `<img id="img-p1" src="${this.p1SpriteUrl}" alt="${this.p1Monster.name}" />`;
      wrapP2.innerHTML = `<img id="img-p2" src="${this.p2SpriteUrl}" alt="${this.p2Monster.name}" />`;
    }
  }

  /**
   * バトルログのアニメーション逐次再生
   */
  private async playBattleSequence(result: BattleResult) {
    const delay = (ms: number) => {
      if (this.isSkipping) return Promise.resolve();
      return new Promise(resolve => setTimeout(resolve, ms / this.currentSpeed));
    };

    const msgBox = document.getElementById('battle-message-window');
    const turnCounter = document.getElementById('turn-counter');

    await delay(1000);

    for (const log of result.logs) {
      if (this.isSkipping) break;

      if (turnCounter) {
        turnCounter.textContent = `TURN ${log.turn} / 30`;
      }

      const isP1Attacking = log.attackerName === this.p1Monster?.name;
      const attackerWrap = document.getElementById(isP1Attacking ? 'sprite-wrap-p1' : 'sprite-wrap-p2');
      const defenderWrap = document.getElementById(isP1Attacking ? 'sprite-wrap-p2' : 'sprite-wrap-p1');
      const defenderHpFill = document.getElementById(isP1Attacking ? 'hp-fill-p2' : 'hp-fill-p1');
      const defenderHpNum = document.getElementById(isP1Attacking ? 'hp-num-p2' : 'hp-num-p1');

      const attackerViewer = isP1Attacking ? this.p1ArenaViewer : this.p2ArenaViewer;
      const defenderViewer = isP1Attacking ? this.p2ArenaViewer : this.p1ArenaViewer;

      // 1. 技名コール
      retroAudio.playAttack();
      if (msgBox) {
        msgBox.innerHTML = `
          <div class="message-line">
            <span class="message-highlight">${log.attackerName}</span> の 
            <span style="color:#60a5fa; font-weight:bold;">${log.move.name}</span>！
          </div>
        `;
      }

      // 攻撃側のアニメーション
      attackerWrap?.classList.add(isP1Attacking ? 'attacking-p1' : 'attacking-p2');
      attackerViewer?.triggerAttack(400);

      await delay(400);
      attackerWrap?.classList.remove(isP1Attacking ? 'attacking-p1' : 'attacking-p2');

      // 2. 命中・ダメージ判定
      if (!log.isHit) {
        if (msgBox) {
          msgBox.innerHTML += `<div class="message-line" style="color:#94a3b8;">しかし こうげきは はずれた！</div>`;
        }
        await delay(600);
        continue;
      }

      // 被弾リアクション
      defenderWrap?.classList.add('taking-hit');
      defenderViewer?.triggerHit(450);

      // サウンド
      if (log.typeMultiplier === 0) {
        retroAudio.playNotVeryEffective();
      } else if (log.isCritical) {
        retroAudio.playCritical();
      } else if (log.typeMultiplier >= 2.0) {
        retroAudio.playSuperEffective();
      } else if (log.typeMultiplier <= 0.5) {
        retroAudio.playNotVeryEffective();
      } else {
        retroAudio.playHit();
      }

      // メッセージ追記
      if (msgBox) {
        if (log.typeMultiplier === 0) {
          msgBox.innerHTML += `<div class="message-line" style="color:#cbd5e1;">あいてには まったく こうかがないようだ…</div>`;
        } else {
          if (log.isCritical) {
            msgBox.innerHTML += `<div class="message-line" style="color:#fbbf24;">きゅうしょに あたった！</div>`;
          }
          if (log.typeMultiplier >= 2.0) {
            msgBox.innerHTML += `<div class="message-line" style="color:#ef4444; font-weight:bold;">こうかは ばつぐんだ！ (-${log.damage})</div>`;
          } else if (log.typeMultiplier <= 0.5) {
            msgBox.innerHTML += `<div class="message-line" style="color:#94a3b8;">こうかは いまひとつのようだ… (-${log.damage})</div>`;
          } else {
            msgBox.innerHTML += `<div class="message-line">(-${log.damage} ダメージ)</div>`;
          }
        }
      }

      // HPバー更新
      if (defenderHpFill && defenderHpNum) {
        const pct = Math.max(0, (log.defenderRemainingHp / log.defenderMaxHp) * 100);
        defenderHpFill.style.width = `${pct}%`;
        defenderHpFill.classList.remove('yellow', 'red');
        if (pct <= 20) {
          defenderHpFill.classList.add('red');
        } else if (pct <= 50) {
          defenderHpFill.classList.add('yellow');
        }
        defenderHpNum.textContent = `${log.defenderRemainingHp} / ${log.defenderMaxHp}`;
      }

      await delay(450);
      defenderWrap?.classList.remove('taking-hit');

      // ひんし判定
      if (log.isFainted) {
        retroAudio.playFaint();
        defenderWrap?.classList.add('fainted');
        defenderViewer?.triggerFaint();
        if (msgBox) {
          msgBox.innerHTML += `<div class="message-line" style="color:#f87171; font-weight:bold;">${log.defenderName} は たおれた！</div>`;
        }
        await delay(1000);
        break;
      }

      await delay(500);
    }

    // スキップされた場合のHPバー最終同期
    if (this.isSkipping) {
      this.syncFinalBattleState(result);
    }

    // リザルト画面へ
    await delay(600);
    this.renderResultModal(result);
  }

  /**
   * スキップ時のHP強制同期
   */
  private syncFinalBattleState(result: BattleResult) {
    const hp1 = document.getElementById('hp-fill-p1');
    const num1 = document.getElementById('hp-num-p1');
    const hp2 = document.getElementById('hp-fill-p2');
    const num2 = document.getElementById('hp-num-p2');

    if (this.p1Monster && hp1 && num1) {
      const pct1 = Math.max(0, (result.p1FinalHp / this.p1Monster.maxHp) * 100);
      hp1.style.width = `${pct1}%`;
      num1.textContent = `${result.p1FinalHp} / ${this.p1Monster.maxHp}`;
    }

    if (this.p2Monster && hp2 && num2) {
      const pct2 = Math.max(0, (result.p2FinalHp / this.p2Monster.maxHp) * 100);
      hp2.style.width = `${pct2}%`;
      num2.textContent = `${result.p2FinalHp} / ${this.p2Monster.maxHp}`;
    }

    if (result.winner) {
      const loserIsP1 = result.loser?.name === this.p1Monster?.name;
      const loserWrap = document.getElementById(loserIsP1 ? 'sprite-wrap-p1' : 'sprite-wrap-p2');
      loserWrap?.classList.add('fainted');
      if (loserIsP1) {
        this.p1ArenaViewer?.triggerFaint();
      } else {
        this.p2ArenaViewer?.triggerFaint();
      }
    }
  }

  /**
   * 画面4: リザルトモーダル
   */
  private renderResultModal(result: BattleResult) {
    if (result.winner) {
      retroAudio.playVictory();
    }

    let resultTitle = '';
    let winnerSprite = '';

    const isP1Win = result.winner?.name === this.p1Monster?.name;
    const winnerMonster = result.winner ? (isP1Win ? this.p1Monster : this.p2Monster) : null;

    const modal = document.createElement('div');
    modal.className = 'result-overlay';

    let modalViewer: Monster3DViewer | null = null;

    const renderModalContent = () => {
      let details = '';

      if (result.isDraw) {
        resultTitle = 'DRAW (引き分け！)';
        details = `<p style="margin: 12px 0;">30ターンの激闘の末、両者ともに決着がつかず引き分けとなりました。</p>`;
      } else if (result.winner && winnerMonster) {
        resultTitle = `${result.winner.name} の 勝利！`;
        winnerSprite = isP1Win ? this.p1SpriteUrl : this.p2SpriteUrl;

        const reasonStr = result.winReason === 'knockout'
          ? `${result.turns}ターンでノックアウト勝利！`
          : `30ターン制限によるHP割合判定勝利！`;

        const previewHtml = this.displayMode === '2d'
          ? `<div style="margin: 12px 0;"><img src="${winnerSprite}" style="width: 120px; height: 120px; image-rendering: pixelated; animation: idle-float 1.8s ease-in-out infinite;" /></div>`
          : `<div style="margin: 12px 0; width: 140px; height: 140px; margin-left: auto; margin-right: auto; position: relative;" id="modal-winner-3d-wrap"></div>`;

        const modalToggleHtml = `
          <div style="display:flex; justify-content:center; gap:6px; margin: 8px 0;">
            <button class="mode-toggle-btn ${this.displayMode !== '2d' ? 'active' : ''}" id="modal-toggle-3d" style="font-size:9px; padding:3px 10px;">✨ 3D</button>
            <button class="mode-toggle-btn ${this.displayMode === '2d' ? 'active active-2d' : ''}" id="modal-toggle-2d" style="font-size:9px; padding:3px 10px;">👾 2D</button>
          </div>
        `;

        details = `
          ${modalToggleHtml}
          ${previewHtml}
          <p style="font-size: 14px; color: var(--text-dim);">${reasonStr}</p>
          <p style="font-size: 13px; color: #cbd5e1; margin-top: 4px;">
            残りHP: ${isP1Win ? result.p1FinalHp : result.p2FinalHp} / ${result.winner.maxHp}
          </p>
        `;
      }

      modal.innerHTML = `
        <div class="result-card">
          <h2 class="winner-badge">${resultTitle}</h2>
          ${details}
          <div style="display:flex; flex-direction:column; gap:10px; margin-top:20px;">
            <button class="start-btn" id="rematch-btn">もう一度たたかう（再戦）</button>
            <button class="random-btn" id="new-battle-btn" style="padding:10px; font-size:14px;">別の名前でたたかう</button>
          </div>
        </div>
      `;

      if (modalViewer) {
        modalViewer.dispose();
        modalViewer = null;
      }

      if (this.displayMode !== '2d' && winnerMonster) {
        const modalWrap = modal.querySelector('#modal-winner-3d-wrap') as HTMLElement;
        if (modalWrap) {
          modalViewer = new Monster3DViewer(
            modalWrap,
            winnerMonster.spriteSeed,
            winnerMonster.types[0],
            winnerMonster.types[1],
            winnerMonster.stats,
            { autoRotate: true, viewAngle: 'front' }
          );
        }
      }

      modal.querySelector('#modal-toggle-3d')?.addEventListener('click', () => {
        retroAudio.playSelect();
        this.displayMode = '3d';
        renderModalContent();
      });

      modal.querySelector('#modal-toggle-2d')?.addEventListener('click', () => {
        retroAudio.playSelect();
        this.displayMode = '2d';
        renderModalContent();
      });

      modal.querySelector('#rematch-btn')?.addEventListener('click', () => {
        retroAudio.playSelect();
        cleanupModal();
        this.startBattle();
      });

      modal.querySelector('#new-battle-btn')?.addEventListener('click', () => {
        retroAudio.playSelect();
        cleanupModal();
        this.renderInputView();
      });
    };

    const cleanupModal = () => {
      if (modalViewer) {
        modalViewer.dispose();
        modalViewer = null;
      }
      modal.remove();
    };

    renderModalContent();
    document.body.appendChild(modal);
  }
}
