import { _decorator, Animation, Component, RigidBody2D, Vec2, Vec3, math, ERigidBody2DType, Collider2D, Contact2DType } from 'cc';
import { GameManager, GameEventSymbols } from './GameManager';
import { AudioManager } from './AudioManager';
import { INavigator } from './INavigator';
import { GameConfig } from './GameConfig';

const { ccclass, property } = _decorator;

/**
 * @en
 * Concrete class that controls the physics and animation of the player character.
 * Similar to a Character Controller inheriting from MonoBehaviour in Unity.
 * 
 * @kr
 * 플레이어 캐릭터의 물리와 애니메이션을 제어하는 실체 클래스입니다.
 * Rigidbody2D를 통해 중력과 힘을 시뮬레이션하고, Collider2D로 충돌을 감지합니다.
 * 
 * @jp
 * プレイヤーキャラクターの物理とアニメーションを制御する実体クラスです。
 * UnityのMonoBehaviourを継承したキャラクターコントローラーと同様です。
 * Rigidbody2Dを通じて重力と力をシミュレーションし、Collider2Dで衝突を検知します。
 */
@ccclass('Player')
export class Player extends Component implements INavigator {
    //--------------------------------------------------------------------------
    // Private Cached Components & States
    //--------------------------------------------------------------------------

    /** @en Equivalent to Unity's Rigidbody2D @kr 유니티의 Rigidbody2D와 동일 @jp UnityのRigidbody2Dと同様 */
    private _physicsBody: RigidBody2D = null;

    /** @en Equivalent to Unity's Animation component @kr 유니티의 Animation 컴포넌트와 동일 @jp UnityのAnimationコンポーネントと同様 */
    private _animationController: Animation = null;

    /** @en Equivalent to Unity's Collider2D @kr 유니티의 Collider2D와 동일 @jp UnityのCollider2Dと同様 */
    private _contactGeometry: Collider2D = null;

    /** @en Whether the player is out of control due to a collision @kr 조종 불능 상태 여부 @jp 衝突などにより操作不能状態になったかどうか */
    private _isTerminationTriggered: boolean = false;
    public get isTerminationTriggered(): boolean { return this._isTerminationTriggered; }

    /** @en Vector caches for physics calculations (Zero-GC) @kr 물리 연산용 벡터 캐시 @jp 物理演算用ベクトルキャッシュ */
    private _cachedVelocity: Vec2 = new Vec2();
    private _cachedEulerAngles: Vec3 = new Vec3();

    //--------------------------------------------------------------------------
    // Life Cycle Methods
    //--------------------------------------------------------------------------

    onLoad() {
        this.cacheInternalComponents();

        // [Self-Registration] @en Register self as the navigator to the manager @kr 매니저에게 나를 플레이어로 등록 @jp マネージャーに自身をプレイヤーとして登録
        if (GameManager.instance) {
            GameManager.instance.registerNavigator(this);
        }
    }

    onEnable() {
        this.registerSystemEvents();
    }

    onDisable() {
        this.unregisterSystemEvents();
    }

    /** @en Updates visual rotation based on velocity @kr 매 프레임 캐릭터의 회전 각도 업데이트 @jp 毎フレームキャラクターの回転角度を更新 */
    update(dt: number) {
        // @en Skip update if dead or physics is not dynamic @kr 죽었거나 물리 엔진 비활성 시 업데이트 스킵 @jp 死亡時や物理エンジン非アクティブ時は更新をスキップ
        if (this._isTerminationTriggered || !this._physicsBody || this._physicsBody.type !== ERigidBody2DType.Dynamic) return;

        this.synchronizeVisualOrientation(dt);
    }

    //--------------------------------------------------------------------------
    // Optimization & Setup
    //--------------------------------------------------------------------------

    /** @en Cache necessary components beforehand @kr 필요한 컴포넌트들을 미리 찾아 캐싱 @jp 必要なコンポーネントをあらかじめキャッシュ */
    private cacheInternalComponents() {
        this._physicsBody = this.getComponent(RigidBody2D);
        this._animationController = this.getComponent(Animation);
        this._contactGeometry = this.getComponent(Collider2D);
    }

    private registerSystemEvents() {
        GameManager.messageBus.on(GameEventSymbols.SESSION_START, this.onSessionStart, this);
        GameManager.messageBus.on(GameEventSymbols.SESSION_END, this.onSessionEnd, this);
        GameManager.messageBus.on(GameEventSymbols.SYSTEM_RESET, this.resetNavigatorState, this);

        // @en Register collision event listener (similar to OnCollisionEnter2D) @kr 충돌 이벤트 리스너 등록 @jp 衝突イベントリスナーの登録
        if (this._contactGeometry) {
            this._contactGeometry.on(Contact2DType.BEGIN_CONTACT, this.handleCollisionSequence, this);
        }
    }

    private unregisterSystemEvents() {
        GameManager.messageBus.off(GameEventSymbols.SESSION_START, this.onSessionStart, this);
        GameManager.messageBus.off(GameEventSymbols.SESSION_END, this.onSessionEnd, this);
        GameManager.messageBus.off(GameEventSymbols.SYSTEM_RESET, this.resetNavigatorState, this);

        if (this._contactGeometry) {
            this._contactGeometry.off(Contact2DType.BEGIN_CONTACT, this.handleCollisionSequence, this);
        }
    }

    //--------------------------------------------------------------------------
    // Core Mechanics
    //--------------------------------------------------------------------------

    /** @en Smoothly tilts the head based on vertical velocity @kr 상승/하강 속도에 맞춰 기체의 머리 각도를 조정 @jp 上昇・下降速度に合わせて機体の頭の角度を滑らかに調整 */
    private synchronizeVisualOrientation(dt: number) {
        if (!this._physicsBody) return;

        const currentVerticalVelocity = this._physicsBody.linearVelocity.y;
        // @en Determine target angle: tilt up when ascending, down when falling @kr 타겟 각도 결정 @jp ターゲット角度の決定
        const targetAscentAngle = currentVerticalVelocity > 0 ? GameConfig.MAX_ASCENT_DEGREES : GameConfig.MAX_DESCENT_DEGREES;

        this._cachedEulerAngles.set(this.node.eulerAngles);
        // @en Transition angle smoothly via Lerp (similar to Mathf.LerpAngle in Unity) @kr Lerp를 통해 각도를 부드럽게 전환 @jp Lerpを使用して角度を滑らかに遷移
        this._cachedEulerAngles.z = math.lerp(this._cachedEulerAngles.z, targetAscentAngle, dt * GameConfig.ROTATION_INTERPOLATION_WEIGHT);

        this.node.setRotationFromEuler(this._cachedEulerAngles);
    }

    /** @en Sequence handled upon hitting an obstacle or the ground @kr 무언가에 부딪혔을 때 처리되는 시퀀스 @jp 何かに衝突した際の処理シーケンス */
    private handleCollisionSequence(self: Collider2D, other: Collider2D) {
        if (this._isTerminationTriggered) return;

        if (GameManager.instance) {
            if (AudioManager.instance) AudioManager.instance.playHit();
            GameManager.instance.executeGameOver();
        }
    }

    //--------------------------------------------------------------------------
    // Command Handlers (INavigator implementation)
    //--------------------------------------------------------------------------

    /** @en Triggers a leap upwards @kr 위로 날아오르게 합니다 @jp 上方に跳躍させます */
    public fly() {
        if (this._isTerminationTriggered || !this._physicsBody) return;

        // @en Instantly override Y-velocity to jump upwards @kr Y축 속력을 순간적으로 덮어씌워 점프 @jp Y軸の速度を瞬時に上書きしてジャンプ
        this._cachedVelocity.set(0, GameConfig.LEAP_IMPULSE_MAGNITUDE);
        this._physicsBody.linearVelocity = this._cachedVelocity;

        if (this._animationController) {
            this._animationController.play();
        }

        if (AudioManager.instance) {
            AudioManager.instance.playWing();
        }
    }

    /** @en Resets the player's position and physics to their initial state @kr 플레이어의 위치와 물리 상태를 초기 상태로 리셋 @jp プレイヤーの位置と物理状態を初期状態にリセット */
    public resetNavigatorState() {
        this._isTerminationTriggered = false;

        this.node.setPosition(0, 0, 0);
        this.node.setRotationFromEuler(0, 0, 0);

        if (this._physicsBody) {
            // @en Block gravity influence by switching to Static @kr 정적(Static) 상태로 바꿔 중력 차단 @jp 静的（Static）状態に切り替えて重力を遮断
            this._physicsBody.type = ERigidBody2DType.Static;
            this._physicsBody.linearVelocity = Vec2.ZERO;
        }

        if (this._animationController) {
            this._animationController.play();
        }
    }

    /** @en Called when the game session actually begins @kr 게임 세션이 실제로 시작될 때 호출 @jp ゲームセッションが実際に開始される際に呼び出し */
    private onSessionStart() {
        if (this._physicsBody) {
            // @en Enable gravity by switching to Dynamic @kr 물리 엔진을 활성화(Dynamic) @jp 物理エンジンを有効化（Dynamic）
            this._physicsBody.type = ERigidBody2DType.Dynamic;
        }
        this.fly(); // @en Provide a light first jump immediately @kr 시작하자마자 가벼운 첫 점프 @jp 開始直後に軽い最初のジャンプを提供
    }

    /** @en Called upon game over @kr 게임오버 되었을 때 호출 @jp ゲームオーバー時に呼び出し */
    private onSessionEnd() {
        this._isTerminationTriggered = true;
        if (this._animationController) {
            this._animationController.stop();
        }
    }
}
