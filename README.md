# PJ_Clone_FlappyBird

[![Cocos Creator](https://img.shields.io/badge/Cocos%20Creator-3.8.x-orange.svg)](https://www.cocos.com/en/creator)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

[한국어](./README_KR.md) | [日本語](./README_JP.md)

## 📝 Overview

This project is a technical implementation developed by a Unity developer to master the Cocos Creator 3.x workflow. It focuses on re-implementing core Flappy Bird logic while exploring engine-specific characteristics, resource management optimization, and design patterns.

---

## 🛠 Tech Stack

- **Engine**: Cocos Creator 3.8.x
- **Language**: TypeScript (Strict Mode)
- **Physics**: 2D Physics & Collision Sensing
- **UI & Animation**: Tween-based UI Animations
- **Patterns**: Singleton, Pub/Sub (EventTarget), Object Pooling, Abstraction (Interface)
- **Persistence**: sys.localStorage

---

## 🏗 Script Implementation & Technical Analysis

### 1. `GameConfig.ts`
- **Role**: A configuration class that centrally controls all design parameters (speed, intervals, ranges) and system settings.
- **Applied Tech**: Uses the `TypeScript Static Readonly` pattern to ensure data integrity.
- **Key Code**:
  ```typescript
  public static readonly WORLD_SCROLL_VELOCITY: number = 300;
  public static readonly PIPE_SPAWN_INTERVAL: number = 1.6;
  public static readonly MAX_SPEED_MULTIPLIER: number = 1.8;
  ```
- **Rationale**: Eliminates magic numbers to create a clean-code environment; centralized constants allow for high maintainability during balancing steps.

### 2. `GameManager.ts`
- **Role**: The central controller that manages the game session lifecycle (Prepare, Active, Terminated) and orchestrates system states.
- **Applied Tech**: Implemented with the `Singleton Pattern` for global accessibility and an `EventTarget`-based message bus to decouple objects.
- **Key Code**:
  ```typescript
  public static readonly messageBus: EventTarget = new EventTarget();

  public get currentSpeedMultiplier(): number {
      const step = Math.floor(this._score / 10);
      return Math.min(GameConfig.MAX_SPEED_MULTIPLIER, 1.0 + (step * 0.1));
  }
  ```
- **Rationale**: A global event system removes direct references between objects, preventing code complexity from increasing as the project scale grows.

### 3. `INavigator.ts`
- **Role**: An abstraction interface defining core player actions (Fly, Reset, etc.).
- **Applied Tech**: Decoupled concrete implementation from logic through `Interface-based Abstraction`.
- **Key Code**:
  ```typescript
  export interface INavigator {
      fly(): void;
      resetNavigatorState(): void;
      isTerminationTriggered: boolean;
  }
  ```
- **Rationale**: Applying the Dependency Inversion Principle (DIP) ensures scalability, as the `GameManager` interacts with the interface rather than specific classes, making logic replacement easier.

### 4. `PipeSpawner.ts`
- **Role**: A manager that periodically spawns obstacles and recycles off-screen objects.
- **Applied Tech**: Implemented `NodePool` (Object Pooling), `Prewarm` strategies, and `Memory Safety Guards`.
- **Key Code**:
  ```typescript
  private executeAtomicGeneration() {
      if (this.node.children.length >= GameConfig.MAX_ACTIVE_OBSTACLES) return;
      let node = this._obstacleNodePool.size() > 0 ? this._obstacleNodePool.get() : instantiate(this._obstacleBlueprint);
      // ... initialization sequence
  }
  ```
- **Rationale**: `Prewarm` prevents CPU spikes on the first frame, and `MAX_LIMIT` guards prevent excessive memory growth during runtime.

### 5. `Pipes.ts` & `Ground.ts`
- **Role**: Environmental components responsible for random obstacle placement and infinite background scrolling.
- **Applied Tech**: Utilizes `Parallax Scrolling` and `Zero-GC` vector caching.
- **Key Code**:
  ```typescript
  private _localTranslationCache: Vec3 = new Vec3(); // Zero-GC caching

  if (this._localTranslationCache.x + extent <= 0) {
      this._localTranslationCache.x += this._loopingBoundaryWidth; // Error correction
  }
  ```
- **Rationale**: To minimize Garbage Collector (GC) pressure, per-frame vector instantiation is replaced with caching, and error correction logic ensures visual continuity.

### 6. `Player.ts`
- **Role**: Controls player physics interactions, and rotation animations.
- **Applied Tech**: Uses `Rigidbody2D Physics`, `Lerp-based Rotation`, and the `Self-registration` pattern.
- **Key Code**:
  ```typescript
  const targetAscentAngle = currentVerticalVelocity > 0 ? GameConfig.MAX_ASCENT_DEGREES : GameConfig.MAX_DESCENT_DEGREES;
  this._cachedEulerAngles.z = math.lerp(this._cachedEulerAngles.z, targetAscentAngle, dt * GameConfig.ROTATION_INTERPOLATION_WEIGHT);
  ```
- **Rationale**: Smooth rotation angles are derived by interpolating (Lerp) physical velocity data, and self-registration into the manager simplifies object relation setup.

### 7. `Results.ts`
- **Role**: Manages score display, record persistence, and result screen UI animations.
- **Applied Tech**: Implemented `LocalStorage Persistence` and `Tween Animation` (Score Count-up).
- **Key Code**:
  ```typescript
  tween(dummy)
      .to(0.15, { value: this._activeSessionScore }, {
          onUpdate: () => { this._realtimeScoreDisplay.string = Math.floor(dummy.value).toString(); }
      }).start();
  ```
- **Rationale**: Enhances visual fidelity through tweened animations while maintaining data consistency by centrally managing storage keys.

### 8. `AudioManager.ts`
- **Role**: A system manager overseeing global sfx playback and audio feedback.
- **Applied Tech**: Features `Singleton Pattern`, dependency safety via `@requireComponent`, and `playOneShot` optimization.
- **Key Code**:
  ```typescript
  @requireComponent(AudioSource)
  export class AudioManager extends Component {
      private emitOneShot(clip: AudioClip) {
          if (clip && this._audioSource) this._audioSource.playOneShot(clip, 1.0);
      }
  }
  ```
- **Rationale**: Separates audio resource management from calling logic and prevents runtime exceptions through mandatory component declarations.

---

## ⚙️ Environment & Build

1. Install [Cocos Creator 3.8.x](https://www.cocos.com/en/creator/download).
2. Clone the repository and load the project in Cocos Creator.
3. Run `assets/Scenes/Main.scene`.
