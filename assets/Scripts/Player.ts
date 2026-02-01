import { _decorator, Animation, Component, RigidBody2D, Vec2, Vec3, math, ERigidBody2DType, Collider2D, Contact2DType } from 'cc';
import { GameManager, GameEventSymbols } from './GameManager';
import { AudioManager } from './AudioManager';
import { INavigator } from './INavigator';
import { GameConfig } from './GameConfig';

const { ccclass, property } = _decorator;

/**
 * Player
 * 플레이어 캐릭터의 물리와 애니메이션을 제어하는 실체 클래스입니다.
 * 
 * [Unity Perspective]
 * 유니티의 MonoBehaviour를 상속받은 캐릭터 컨트롤러와 같습니다.
 * Rigidbody2D를 통해 중력과 힘을 시뮬레이션하고, Collider2D로 충돌을 감지합니다.
 */
@ccclass('Player')
export class Player extends Component implements INavigator {
    //--------------------------------------------------------------------------
    // Private Cached Components & States (컴포넌트 캐시 및 상태)
    //--------------------------------------------------------------------------

    /** 유니티의 Rigidbody2D와 동일 */
    private _physicsBody: RigidBody2D = null;

    /** 유니티의 Animation 컴포넌트와 동일 */
    private _animationController: Animation = null;

    /** 유니티의 Collider2D와 동일 */
    private _contactGeometry: Collider2D = null;

    /** 충돌 등으로 인해 조종 불능 상태가 되었는가? */
    private _isTerminationTriggered: boolean = false;
    public get isTerminationTriggered(): boolean { return this._isTerminationTriggered; }

    /** [Zero-GC] 매 프레임 생상을 방지하기 위한 물리 연산용 벡터 캐시 */
    private _cachedVelocity: Vec2 = new Vec2();
    private _cachedEulerAngles: Vec3 = new Vec3();

    //--------------------------------------------------------------------------
    // Life Cycle Methods
    //--------------------------------------------------------------------------

    onLoad() {
        this.cacheInternalComponents();

        // [Self-Registration] 매니저에게 나를 플레이어로 등록 (유연성 확보)
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

    /** 매 프레임 캐릭터의 회전(Orientation) 각도 업데이트 (유니티의 Update) */
    update(dt: number) {
        // 죽었거나, 물리 엔진이 비활성 상태라면 업데이트 스킵
        if (this._isTerminationTriggered || !this._physicsBody || this._physicsBody.type !== ERigidBody2DType.Dynamic) return;

        this.synchronizeVisualOrientation(dt);
    }

    //--------------------------------------------------------------------------
    // Optimization & Setup (설정 및 최적화)
    //--------------------------------------------------------------------------

    /** 필요한 컴포넌트들을 미리 찾아 변수에 저장 (유니티의 GetComponent 지양 목적) */
    private cacheInternalComponents() {
        this._physicsBody = this.getComponent(RigidBody2D);
        this._animationController = this.getComponent(Animation);
        this._contactGeometry = this.getComponent(Collider2D);
    }

    private registerSystemEvents() {
        GameManager.messageBus.on(GameEventSymbols.SESSION_START, this.onSessionStart, this);
        GameManager.messageBus.on(GameEventSymbols.SESSION_END, this.onSessionEnd, this);
        GameManager.messageBus.on(GameEventSymbols.SYSTEM_RESET, this.resetNavigatorState, this);

        // 충돌 이벤트 리스너 등록 (유니티의 OnCollisionEnter2D와 유사)
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
    // Core Mechanics (핵심 물리 로직)
    //--------------------------------------------------------------------------

    /** 상승/하강 속도에 맞춰 기체의 머리 각도를 부드럽게 꺾어줍니다. */
    private synchronizeVisualOrientation(dt: number) {
        if (!this._physicsBody) return;

        const currentVerticalVelocity = this._physicsBody.linearVelocity.y;
        // 위로 올라갈 땐 머리를 들고, 떨어질 땐 아래를 향하도록 타겟 각도 결정
        const targetAscentAngle = currentVerticalVelocity > 0 ? GameConfig.MAX_ASCENT_DEGREES : GameConfig.MAX_DESCENT_DEGREES;

        this._cachedEulerAngles.set(this.node.eulerAngles);
        // Lerp(선형 보간)를 통해 각도를 부드럽게 전환 (유니티의 Mathf.LerpAngle과 유사)
        this._cachedEulerAngles.z = math.lerp(this._cachedEulerAngles.z, targetAscentAngle, dt * GameConfig.ROTATION_INTERPOLATION_WEIGHT);

        this.node.setRotationFromEuler(this._cachedEulerAngles);
    }

    /** 무언가에 부딪혔을 때 처리되는 시퀀스 */
    private handleCollisionSequence(self: Collider2D, other: Collider2D) {
        if (this._isTerminationTriggered) return;

        if (GameManager.instance) {
            // 충돌 효과음 재생
            if (AudioManager.instance) AudioManager.instance.playHit();

            // 게임오버 상태로 전이
            GameManager.instance.executeGameOver();
        }
    }

    //--------------------------------------------------------------------------
    // Command Handlers (INavigator 인터페이스 구현)
    //--------------------------------------------------------------------------

    /** 위로 날아오르게 합니다. */
    public fly() {
        if (this._isTerminationTriggered || !this._physicsBody) return;

        // Y축 속력을 순간적으로 덮어씌워 위로 튀어 오르게 함 (유니티의 Velocity조작과 동일)
        this._cachedVelocity.set(0, GameConfig.LEAP_IMPULSE_MAGNITUDE);
        this._physicsBody.linearVelocity = this._cachedVelocity;

        // 날갯짓 애니메이션 재생
        if (this._animationController) {
            this._animationController.play();
        }

        // 날갯짓 효과음 재생
        if (AudioManager.instance) {
            AudioManager.instance.playWing();
        }
    }

    /** 플레이어의 위치와 물리 상태를 태초의 상태로 되돌립니다. */
    public resetNavigatorState() {
        this._isTerminationTriggered = false;

        this.node.setPosition(0, 0, 0);
        this.node.setRotationFromEuler(0, 0, 0);

        if (this._physicsBody) {
            // 정적(Static) 상태로 바꿔 중력의 영향을 잠시 차단
            this._physicsBody.type = ERigidBody2DType.Static;
            this._physicsBody.linearVelocity = Vec2.ZERO;
        }

        if (this._animationController) {
            this._animationController.play();
        }
    }

    /** 게임 세션이 실제로 시작될 때 호출 */
    private onSessionStart() {
        if (this._physicsBody) {
            // 물리 엔진을 활성화(Dynamic)하여 중력을 받게 함
            this._physicsBody.type = ERigidBody2DType.Dynamic;
        }
        this.fly(); // 시작하자마자 가벼운 첫 점프 제공
    }

    /** 게임오버 되었을 때 호출 */
    private onSessionEnd() {
        this._isTerminationTriggered = true;
        if (this._animationController) {
            this._animationController.stop(); // 퍼포먼스 중단
        }
    }
}
