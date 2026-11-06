import * as THREE from 'three';
import { generateMonster3D, Monster3DModel, AnimationState } from './monster3dGenerator';
import { PokemonType, Stats } from '../types';

export interface ViewerOptions {
  viewAngle?: 'front' | 'p1-arena' | 'p2-arena';
  autoRotate?: boolean;
  interactive?: boolean;
}

export class Monster3DViewer {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private model: Monster3DModel | null = null;
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  private totalTime: number = 0;

  private currentState: AnimationState = 'idle';
  private autoRotate: boolean = false;
  private interactive: boolean = true;
  private userRotationY: number = 0;
  private userRotationX: number = 0;
  private isDragging: boolean = false;
  private prevMouseX: number = 0;
  private prevMouseY: number = 0;

  private resizeObserver: ResizeObserver | null = null;
  private onPointerDownHandler = (e: PointerEvent) => this.onPointerDown(e);
  private onPointerMoveHandler = (e: PointerEvent) => this.onPointerMove(e);
  private onPointerUpHandler = () => this.onPointerUp();

  constructor(
    container: HTMLElement,
    seed: number,
    primaryType: PokemonType,
    secondaryType?: PokemonType,
    stats?: Stats,
    options: ViewerOptions = {}
  ) {
    this.container = container;
    this.autoRotate = options.autoRotate ?? false;
    this.interactive = options.interactive ?? true;

    // 1. シーン作成
    this.scene = new THREE.Scene();

    // 2. カメラ作成
    const width = container.clientWidth || 160;
    const height = container.clientHeight || 160;
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);

    // アングル初期化
    if (options.viewAngle === 'p1-arena') {
      // P1: 後ろから相手（右奥）を見据えるアングル
      this.camera.position.set(-1.8, 2.2, -3.8);
      this.camera.lookAt(0.5, 1.3, 1.2);
    } else if (options.viewAngle === 'p2-arena') {
      // P2: 奥から手前（左手前）を見据えるアングル
      this.camera.position.set(1.6, 2.0, 3.8);
      this.camera.lookAt(-0.4, 1.1, -1.0);
    } else {
      // front (ステータス・リザルト画面用)
      this.camera.position.set(0, 1.6, 4.4);
      this.camera.lookAt(0, 1.2, 0);
    }

    // 3. ライティング
    const ambLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambLight);

    const mainDirLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainDirLight.position.set(4, 8, 5);
    this.scene.add(mainDirLight);

    const rimDirLight = new THREE.DirectionalLight(0x88ccff, 0.9);
    rimDirLight.position.set(-4, 3, -4);
    this.scene.add(rimDirLight);

    // 4. レンダラー作成
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.domElement.style.width = '100%';
      this.renderer.domElement.style.height = '100%';
      this.renderer.domElement.style.display = 'block';
      this.renderer.domElement.style.touchAction = 'none';

      this.container.appendChild(this.renderer.domElement);
    } catch (e) {
      console.warn('WebGL initialization failed, falling back:', e);
      return;
    }

    // 5. 3Dモデル生成
    this.model = generateMonster3D(seed, primaryType, secondaryType, stats);
    this.scene.add(this.model.root);

    // 6. インタラクション登録
    if (this.interactive && this.renderer) {
      const el = this.renderer.domElement;
      el.addEventListener('pointerdown', this.onPointerDownHandler);
      window.addEventListener('pointermove', this.onPointerMoveHandler);
      window.addEventListener('pointerup', this.onPointerUpHandler);
    }

    // 7. リサイズ監視
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.container);
    }

    // 8. ループ開始
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  public setState(state: AnimationState) {
    this.currentState = state;
  }

  public triggerAttack(durationMs: number = 500) {
    this.setState('attack');
    setTimeout(() => {
      if (this.currentState === 'attack') {
        this.setState('idle');
      }
    }, durationMs);
  }

  public triggerHit(durationMs: number = 450) {
    this.setState('hit');
    setTimeout(() => {
      if (this.currentState === 'hit') {
        this.setState('idle');
      }
    }, durationMs);
  }

  public triggerFaint() {
    this.setState('faint');
  }

  private loop(now: number) {
    this.animFrameId = requestAnimationFrame(this.loop);

    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.totalTime += delta;

    if (this.model) {
      this.model.update(delta, this.currentState, this.totalTime);

      if (this.autoRotate && !this.isDragging) {
        this.userRotationY += delta * 0.8;
      }

      this.model.root.rotation.y = this.userRotationY;
      this.model.root.rotation.x = this.userRotationX;
    }

    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private onResize() {
    if (!this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private onPointerDown(e: PointerEvent) {
    this.isDragging = true;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.isDragging) return;
    const deltaX = e.clientX - this.prevMouseX;
    const deltaY = e.clientY - this.prevMouseY;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;

    this.userRotationY += deltaX * 0.015;
    this.userRotationX = Math.max(-0.6, Math.min(0.6, this.userRotationX + deltaY * 0.01));
  }

  private onPointerUp() {
    this.isDragging = false;
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.interactive && this.renderer) {
      const el = this.renderer.domElement;
      el.removeEventListener('pointerdown', this.onPointerDownHandler);
      window.removeEventListener('pointermove', this.onPointerMoveHandler);
      window.removeEventListener('pointerup', this.onPointerUpHandler);
    }

    if (this.model) {
      this.model.dispose();
      this.scene.remove(this.model.root);
      this.model = null;
    }

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
  }
}
