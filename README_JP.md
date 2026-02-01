# PJ_Clone_FlappyBird

[![Cocos Creator](https://img.shields.io/badge/Cocos%20Creator-3.8.x-orange.svg)](https://www.cocos.com/en/creator)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

[English](./README.md) | [한국어](./README_KR.md)

## 📝 プロジェクト概要

このプロジェクトは、Unity環境に精通したエンジニアがCocos Creator 3.xエンジンのワークフローを習得し、実務での活用可能性を検討するために制作されました。単なる機能実装にとどまらず、ライフサイクル管理、物理エンジン統合、効率的なリソース管理、設計パターンの適用など、保守性と拡張性を重視した設計を行っています。

---

## 🛠 主な技術スタック

- **Engine**: Cocos Creator 3.8.x
- **Language**: TypeScript (Strict Mode)
- **Physics**: 2D Physics Input & Collision Sensing
- **UI & Animation**: Tween-based UI Animations
- **Patterns**: Singleton, Pub/Sub (EventTarget), Object Pooling, Abstraction (Interface)
- **Persistence**: sys.localStorage

---

## 🏗 スクリプト別詳細実装および技術分析

### 1. `GameConfig.ts`
- **役割**: プロジェクト内のすべての企画数値（速度、間隔、範囲など）およびシステム設定値を中央で管理する構成クラスです。
- **適用技術**: `TypeScript Static Readonly`パターンを採用し、データの完全性を確保しました。
- **主要コード**:
  ```typescript
  public static readonly WORLD_SCROLL_VELOCITY: number = 300;
  public static readonly PIPE_SPAWN_INTERVAL: number = 1.6;
  public static readonly MAX_SPEED_MULTIPLIER: number = 1.8;
  ```
- **技術的背景**: マジックナンバーを排除し、ハードコーディングのないクリーンコード環境を構築。企画定数が一箇所に集約されているため、バランス調整時のメンテナンス性が高い設計です。

### 2. `GameManager.ts`
- **役割**: ゲームセッション全体のライフサイクル（準備、進行、終了）を管理し、各システムのステートを制御する中央コントローラーです。
- **適用技術**: `Singleton Pattern`によるグローバルアクセスを確保し、`EventTarget`を活用したメッセージバスシステムにより、オブジェクト間の結合度を低減しました。
- **主要コード**:
  ```typescript
  public static readonly messageBus: EventTarget = new EventTarget();

  public get currentSpeedMultiplier(): number {
      const step = Math.floor(this._score / 10);
      return Math.min(GameConfig.MAX_SPEED_MULTIPLIER, 1.0 + (step * 0.1));
  }
  ```
- **技術的背景**: 全局的なイベントシステムを介してオブジェクト間の直接参照を遮断し、プロジェクト規模の拡大に伴うコードの複雑化を防止しています。

### 3. `INavigator.ts`
- **役割**: プレイヤーのコアアクション（Fly, Resetなど）を定義する抽象インターフェースです。
- **適用技術**: `Interface-based Abstraction`により、具体的な実装クラスと呼び出しロジックを分離しました。
- **主要コード**:
  ```typescript
  export interface INavigator {
      fly(): void;
      resetNavigatorState(): void;
      isTerminationTriggered: boolean;
  }
  ```
- **技術的背景**: 依存性逆転の原則（DIP）を適用。`GameManager`はインターフェースを介してプレイヤーに命令を下すため、キャラクターや挙動の差し替えが容易な拡張性を備えています。

### 4. `PipeSpawner.ts`
- **役割**: 障害物を定期的に生成し、画面外に出たオブジェクトを再利用するマネージャーです。
- **適用技術**: `NodePool`（オブジェクトプーリング）、`Prewarm`戦略、`Memory Safety Guard`を実装しました。
- **主要コード**:
  ```typescript
  private executeAtomicGeneration() {
      if (this.node.children.length >= GameConfig.MAX_ACTIVE_OBSTACLES) return;
      let node = this._obstacleNodePool.size() > 0 ? this._obstacleNodePool.get() : instantiate(this._obstacleBlueprint);
      // ... 初期化シーケンス
  }
  ```
- **技術的背景**: `Prewarm`により初回フレームの演算スパイクを防止。また、`MAX_ACTIVE_OBSTACLES`による生成制限を設けることで、ランタイム中のメモリ漏洩や過負荷を防御しています。

### 5. `Pipes.ts` & `Ground.ts`
- **役割**: 障害物のランダム配置と背景の無限スクロールを担当する環境コンポーネントです。
- **適用技術**: `Parallax Scrolling`、`Zero-GC`ベクトルキャッシュ技法を採用しました。
- **主要コード**:
  ```typescript
  private _localTranslationCache: Vec3 = new Vec3(); // Zero-GC キャッシング

  if (this._localTranslationCache.x + extent <= 0) {
      this._localTranslationCache.x += this._loopingBoundaryWidth; // 物理的なズレを補正
  }
  ```
- **技術的背景**: JavaScriptのガベージコレクター（GC）による負荷を最小限に抑えるため、フレームごとのベクトル生成をキャッシュ再利用に変更。また、浮動小数点誤差を考慮した補正ロジックにより、視覚的な途切れのないスクロールを実現しました。

### 6. `Player.ts`
- **役割**: プレイヤーの物理挙動、アニメーション演出、および回転制御を担当します。
- **適用技術**: `Rigidbody2D Physics`、`Lerp-based Rotation`、`Self-registration`パターンを適用しました。
- **主要コード**:
  ```typescript
  const targetAscentAngle = currentVerticalVelocity > 0 ? GameConfig.MAX_ASCENT_DEGREES : GameConfig.MAX_DESCENT_DEGREES;
  this._cachedEulerAngles.z = math.lerp(this._cachedEulerAngles.z, targetAscentAngle, dt * GameConfig.ROTATION_INTERPOLATION_WEIGHT);
  ```
- **技術的背景**: 垂直方向の速度データに基づき回転角度を線形補間（Lerp）することで滑らかな演出を実現。自身をマネージャーに登録する構造により、柔軟なオブジェクト関係を構築しています。

### 7. `Results.ts`
- **役割**: スコア表示、記録の保存、およびリザルトUIの演出を制御します。
- **適用技術**: `LocalStorage Persistence`、`Tween Animation`（スコアカウントアップ）を実装しました。
- **主要コード**:
  ```typescript
  tween(dummy)
      .to(0.15, { value: this._activeSessionScore }, {
          onUpdate: () => { this._realtimeScoreDisplay.string = Math.floor(dummy.value).toString(); }
      }).start();
  ```
- **技術的背景**: データの保存キーを中央管理化し整合性を維持。単なる値の更新ではなく、TweenアニメーションやUIエフェクトを加えることで、プロジェクトのクオリティを高めています。

### 8. `AudioManager.ts`
- **役割**: ゲーム全体の効果音（SFX）再生とオーディオフィードバックを統括するシステムマネージャーです。
- **適用技術**: `Singleton Pattern`、`@requireComponent`デコレータによる依存性保証、`playOneShot`の最適化を適用しました。
- **主要コード**:
  ```typescript
  @requireComponent(AudioSource)
  export class AudioManager extends Component {
      private emitOneShot(clip: AudioClip) {
          if (clip && this._audioSource) this._audioSource.playOneShot(clip, 1.0);
      }
  }
  ```
- **技術的背景**: オーディオリソースの管理と再生ロジックを分離。必須コンポーネントの宣言により、ランタイムエラーを未然に防いでいます。

---

## ⚙️ 実行およびビルド

1. [Cocos Creator 3.8.x](https://www.cocos.com/en/creator/download)をインストール。
2. リポジトリをクローンし、Cocos Creatorでプロジェクトをロード。
3. `assets/Scenes/Main.scene`を開き、プレビューを実行。
