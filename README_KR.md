# PJ_Clone_FlappyBird

[![Cocos Creator](https://img.shields.io/badge/Cocos%20Creator-3.8.x-orange.svg)](https://www.cocos.com/en/creator)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

[English](./README.md) | [日本語](./README_JP.md)

## 📝 프로젝트 개요

이 프로젝트는 Unity 환경의 개발자가 Cocos Creator 3.x 엔진을 학습하기 위해 진행한 구현 작업물입니다. Flappy Bird의 핵심 로직을 코코스 환경에 맞춰 재구현하며, 엔진의 구조적 특성을 파악하고 효율적인 리소스 관리 및 설계 패턴을 적용해 보는 것에 중점을 두었습니다.

---

## 🛠 주요 기술 스택

- **Engine**: Cocos Creator 3.8.x
- **Language**: TypeScript (Strict Mode)
- **Physics**: 2D Physics Input & Collision Sensing
- **UI & Animation**: Tween-based UI Animations
- **Patterns**: Singleton, Pub/Sub (EventTarget), Object Pooling, Abstraction (Interface)
- **Persistence**: sys.localStorage

---

## 🏗 스크립트별 상세 구현 및 기술 분석

### 1. `GameConfig.ts`
- **역할**: 프로젝트의 모든 기획 수치(속도, 간격, 범위 등)와 시스템 설정값을 중앙에서 제어하는 환경 설정 클래스입니다.
- **적용 기술**: `TypeScript Static Readonly` 패턴을 사용하여 데이터의 무결성을 확보했습니다.
- **핵심 코드**:
  ```typescript
  public static readonly WORLD_SCROLL_VELOCITY: number = 300;
  public static readonly PIPE_SPAWN_INTERVAL: number = 1.6;
  public static readonly MAX_SPEED_MULTIPLIER: number = 1.8;
  ```
- **기술적 근거**: 매직 넘버를 제거하여 하드코딩 없는 클린 코드 환경을 조성했으며, 모든 기획 상수가 한곳에 집약되어 있어 밸런스 수정 시 유지보수성이 높습니다.

### 2. `GameManager.ts`
- **역할**: 게임의 전체 세션 생명 주기(준비, 진행, 종료)를 관리하고 각 시스템의 상태를 조율하는 중앙 컨트롤러입니다.
- **적용 기술**: `Singleton Pattern`으로 전역 접근성을 확보하고, `EventTarget`을 활용한 메시지 버스 시스템으로 객체 간 결합도를 낮췄습니다.
- **핵심 코드**:
  ```typescript
  public static readonly messageBus: EventTarget = new EventTarget();

  public get currentSpeedMultiplier(): number {
      const step = Math.floor(this._score / 10);
      return Math.min(GameConfig.MAX_SPEED_MULTIPLIER, 1.0 + (step * 0.1));
  }
  ```
- **기술적 근거**: 전역 이벤트 시스템은 객체 간의 직접적인 참조를 끊어 프로젝트 규모 확장에 따른 코드 복잡도 상승을 방지합니다.

### 3. `INavigator.ts`
- **역할**: 플레이어의 핵심 동작(Fly, Reset 등)을 정의하는 추상화 인터페이스입니다.
- **적용 기술**: `Interface-based Abstraction`을 통해 구체적인 구현체와 로직을 분리했습니다.
- **핵심 코드**:
  ```typescript
  export interface INavigator {
      fly(): void;
      resetNavigatorState(): void;
      isTerminationTriggered: boolean;
  }
  ```
- **기술적 근거**: 의존성 역전 원칙(DIP)을 적용하여 `GameManager`가 특정 클래스에 의존하지 않고 인터페이스를 통해 명령을 전달하므로 캐릭터나 로직 교체 시 확장성이 보장됩니다.

### 4. `PipeSpawner.ts`
- **역할**: 장애물을 주기적으로 생성하고 화면 밖으로 나간 객체를 재사용하는 매니저입니다.
- **적용 기술**: `NodePool` (오브젝트 풀링), `Prewarm` 기법, `Memory Safety Guard`를 적용했습니다.
- **핵심 코드**:
  ```typescript
  private executeAtomicGeneration() {
      if (this.node.children.length >= GameConfig.MAX_ACTIVE_OBSTACLES) return;
      let node = this._obstacleNodePool.size() > 0 ? this._obstacleNodePool.get() : instantiate(this._obstacleBlueprint);
      // ... 초기화 시퀀스
  }
  ```
- **기술적 근거**: `Prewarm`을 통해 첫 프레임의 연산 스파이크를 방지하고, `MAX_LIMIT` 설정을 통해 런타임 중의 급격한 메모리 상승을 방어합니다.

### 5. `Pipes.ts` & `Ground.ts`
- **역할**: 장애물의 무작위 배치와 배경의 무한 스크롤을 담당하는 환경 컴포넌트입니다.
- **적용 기술**: `Parallax Scrolling`, `Zero-GC` 벡터 캐싱 기법을 사용했습니다.
- **핵심 코드**:
  ```typescript
  private _localTranslationCache: Vec3 = new Vec3(); // Zero-GC 캐싱

  if (this._localTranslationCache.x + extent <= 0) {
      this._localTranslationCache.x += this._loopingBoundaryWidth; // 물리 오차 보정
  }
  ```
- **기술적 근거**: 자바스크립트 가비지 컬렉터(GC) 부하를 최소화하기 위해 매 프레임 발생하는 벡터 생성을 캐싱 기법으로 대체했으며, 오차 보정 로직을 통해 시각적 끊김을 방지했습니다.

### 6. `Player.ts`
- **역할**: 플레이어의 물리 상호작용 및 회전 애니메이션 연출을 제어합니다.
- **적용 기술**: `Rigidbody2D Physics`, `Lerp-based Rotation`, `Self-registration` 패턴을 사용했습니다.
- **핵심 코드**:
  ```typescript
  const targetAscentAngle = currentVerticalVelocity > 0 ? GameConfig.MAX_ASCENT_DEGREES : GameConfig.MAX_DESCENT_DEGREES;
  this._cachedEulerAngles.z = math.lerp(this._cachedEulerAngles.z, targetAscentAngle, dt * GameConfig.ROTATION_INTERPOLATION_WEIGHT);
  ```
- **기술적 근거**: 물리 속도 데이터를 선형 보간(Lerp)하여 부드러운 회전 각도를 도출하고, 매니저에 스스로를 등록하는 구조를 통해 객체 간 연결 편의성을 확보했습니다.

### 7. `Results.ts`
- **역할**: 점수 표기, 기록 저장 및 결과창 UI 연출을 관리합니다.
- **적용 기술**: `LocalStorage Persistence`, `Tween Animation` (Score Count-up)을 적용했습니다.
- **핵심 코드**:
  ```typescript
  tween(dummy)
      .to(0.15, { value: this._activeSessionScore }, {
          onUpdate: () => { this._realtimeScoreDisplay.string = Math.floor(dummy.value).toString(); }
      }).start();
  ```
- **기술적 근거**: 단순한 데이터 갱신을 넘어 트윈 애니메이션을 통한 시각적 완성도를 높였으며, 데이터 저장 키를 중앙 관리하여 정합성을 유지합니다.

### 8. `AudioManager.ts`
- **역할**: 전역 효과음(SFX) 재생 및 오디오 피드백을 총괄하는 시스템 매니저입니다.
- **적용 기술**: `Singleton Pattern`, `@requireComponent` 데코레이터를 통한 의존성 안전 확보, `playOneShot` 최적화가 적용되었습니다.
- **핵심 코드**:
  ```typescript
  @requireComponent(AudioSource)
  export class AudioManager extends Component {
      private emitOneShot(clip: AudioClip) {
          if (clip && this._audioSource) this._audioSource.playOneShot(clip, 1.0);
      }
  }
  ```
- **기술적 근거**: 오디오 리소스 관리와 호출 로직을 분리하고, 필수 컴포넌트 선언을 통해 런타임 예외를 방지했습니다.

---

## ⚙️ 실행 및 빌드

1. [Cocos Creator 3.8.x](https://www.cocos.com/en/creator/download) 설치.
2. 저장소 클론 후 코코스 크리에이터에서 프로젝트 로드.
3. `assets/Scenes/Main.scene` 실행.
