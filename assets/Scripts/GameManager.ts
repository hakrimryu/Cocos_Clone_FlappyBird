import { _decorator, Component, director, EventKeyboard, input, Input, KeyCode, EventTarget } from 'cc';
import { GameConfig } from './GameConfig';
import { INavigator } from './INavigator';
import { AudioManager } from './AudioManager';

const { ccclass, property } = _decorator;

/** 
 * GameState
 * 전체 게임 흐름을 제어하는 원자적 상태 정의입니다.
 */
export enum GameState {
    PREPARING,   // 초기 준비 상태 (Tap to Start 대기 중)
    ACTIVE,      // 실제 게임 진행 중
    TERMINATED   // 게임 종료 상태 (GameOver)
}

/**
 * GameEventSymbols
 * 프로젝트 전역에서 사용되는 이벤트 식별자입니다.
 * 유니티의 EventSystem이나 Delegate와 유사한 통신을 위해 사용됩니다.
 */
export const GameEventSymbols = {
    SESSION_START: 'game:session-start',    // 게임 시작 시 발동
    SESSION_END: 'game:session-end',        // 게임 종료 시 발동
    SCORE_INCREMENT: 'game:score-increment',// 점수 획득 시 발동
    SYSTEM_RESET: 'game:system-reset',      // 시스템 초기화 시 발동
} as const;

/**
 * GameManager
 * 전체 게임의 흐름과 상태를 조율하는 메인 컨트롤러입니다.
 * 
 * [Unity Perspective]
 * 유니티의 Singleton 패턴을 사용한 매니저 객체와 유사합니다.
 * 모든 밸런스 데이터는 GameConfig로 분리하고, 입력을 받아 상태 전환을 처리합니다.
 */
@ccclass('GameManager')
export class GameManager extends Component {
    //--------------------------------------------------------------------------
    // Public Static Accessor (Singleton)
    // 싱글톤 패턴을 통해 전역에서 GameManager.instance로 접근 가능하게 합니다.
    //--------------------------------------------------------------------------
    private static _instance: GameManager = null;
    public static get instance(): GameManager { return this._instance; }

    /** 전역 메시지 버스 (유니티의 전역 이벤트 시스템 또는 Messenger와 유사한 역할) */
    public static readonly messageBus: EventTarget = new EventTarget();

    //--------------------------------------------------------------------------
    // Private State Variables
    //--------------------------------------------------------------------------

    /** 현재 게임이 조종하고 있는 캐릭터 (인터페이스를 통해 참조하여 유연성 확보) */
    private _navigator: INavigator = null;
    public get navigator(): INavigator { return this._navigator; }

    /** 엔진의 현재 상태 */
    private _currentGameState: GameState = GameState.PREPARING;
    public get currentGameState(): GameState { return this._currentGameState; }

    /** 현재 세션의 획득 점수 */
    private _score: number = 0;
    public get score(): number { return this._score; }

    //--------------------------------------------------------------------------
    // Dynamic Difficulty Accessors (실시간 난이도 계산기)
    //--------------------------------------------------------------------------

    /** 현재 점수를 기반으로 도출된 속도 배율 (10점당 10%씩 상승, 최대 1.8~2.0배) */
    public get currentSpeedMultiplier(): number {
        const step = Math.floor(this._score / 10);
        const multiplier = 1.0 + (step * 0.1);
        return Math.min(GameConfig.MAX_SPEED_MULTIPLIER, multiplier);
    }

    /** 현재 점수가 반영된 배경 스크롤 속도 */
    public get currentWorldSpeed(): number {
        return GameConfig.WORLD_SCROLL_VELOCITY * this.currentSpeedMultiplier;
    }

    /** 현재 점수가 반영된 파이프 이동 속도 */
    public get currentObstacleSpeed(): number {
        return GameConfig.OBSTACLE_LATERAL_SPEED * this.currentSpeedMultiplier;
    }

    /** 현재 속도 배율에 최적화된 파이프 생성 주기 (빠를수록 더 자주 생성) */
    public get currentSpawnInterval(): number {
        return GameConfig.PIPE_SPAWN_INTERVAL / this.currentSpeedMultiplier;
    }

    //--------------------------------------------------------------------------
    // Life Cycle Methods (유니티 LifeCycle과 대응)
    //--------------------------------------------------------------------------

    /** 유니티의 Awake() 시점 */
    onLoad() {
        this.initializeSingleton();
        this.initializeInputListeners();
    }

    /** 유니티의 Start() 시점 */
    start() {
        this.requestSystemReset();
    }

    /** 컴포넌트 파괴 시 (유니티의 OnDestroy) */
    onDestroy() {
        this.cleanupInputListeners();
        if (GameManager._instance === this) {
            GameManager._instance = null;
        }
    }

    //--------------------------------------------------------------------------
    // Public Registration API (자기 등록 시스템)
    //--------------------------------------------------------------------------

    /** 
     * 플레이어 객체가 생성될 때 스스로를 등록하는 함수입니다.
     * 하이어라이키 상의 특정 경로에 의존하지 않고 객체 간 연결을 가능하게 합니다.
     */
    public registerNavigator(navigator: INavigator) {
        this._navigator = navigator;
    }

    //--------------------------------------------------------------------------
    // Internal Logic (내부 처리 로직)
    //--------------------------------------------------------------------------

    /** 싱글톤 관계 설정 및 중복 방지 */
    private initializeSingleton() {
        if (GameManager._instance) {
            this.node.destroy();
            return;
        }
        GameManager._instance = this;
    }

    /** 입력 리스너 초기화 */
    private initializeInputListeners() {
        // 전역 입력 시스템에 리스너 등록 (유니티의 InputManager 같은 역할)
        input.on(Input.EventType.KEY_DOWN, this.handleKeyboardInput, this);
        input.on(Input.EventType.TOUCH_START, this.handleInteractionTrigger, this);
    }

    /** 입력 리스너 해제 */
    private cleanupInputListeners() {
        input.off(Input.EventType.KEY_DOWN, this.handleKeyboardInput, this);
        input.off(Input.EventType.TOUCH_START, this.handleInteractionTrigger, this);
    }

    /** 키보드 입력 처리 */
    private handleKeyboardInput(event: EventKeyboard) {
        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ARROW_UP) {
            this.handleInteractionTrigger();
        }
    }

    /** 터치나 버튼 입력을 게임의 동작으로 변환하는 핵심 브릿지입니다. */
    private handleInteractionTrigger() {
        switch (this._currentGameState) {
            case GameState.PREPARING:
            case GameState.TERMINATED:
                // 준비 상태나 종료 상태라면 게임을 다시 시작
                this.executeGameStart();
                break;
            case GameState.ACTIVE:
                // 게임 중이라면 점프 명령 하달
                if (this._navigator) this._navigator.fly();
                break;
        }
    }

    //--------------------------------------------------------------------------
    // Public Command API (외부 통제용 인터페이스)
    //--------------------------------------------------------------------------

    /** 게임 세션을 시작합니다. */
    public executeGameStart() {
        this.requestSystemReset();
        this.transitionToState(GameState.ACTIVE);
        GameManager.messageBus.emit(GameEventSymbols.SESSION_START);

        // 게임 시작/전환 효과음
        if (AudioManager.instance) AudioManager.instance.playSwoosh();
    }

    /** 플레이어가 죽었을 때 게임오버를 처리합니다. */
    public executeGameOver() {
        if (this._currentGameState === GameState.TERMINATED) return;

        this.transitionToState(GameState.TERMINATED);
        GameManager.messageBus.emit(GameEventSymbols.SESSION_END);

        // 게임오버(추락/종료) 효과음
        if (AudioManager.instance) AudioManager.instance.playDie();
    }

    /** 파이프 통과 시 점수를 올립니다. */
    public registerScoreIncrement(points: number = 1) {
        if (this._currentGameState !== GameState.ACTIVE) return;
        this._score += points;

        // 점수 획득 효과음
        if (AudioManager.instance) AudioManager.instance.playPoint();

        // 점수가 올라감에 따라 속도 시스템이 참조할 수 있도록 전역에 알림
        GameManager.messageBus.emit(GameEventSymbols.SCORE_INCREMENT, points);
    }

    /** 모든 시스템을 최초 준비 상태로 물리적 리셋 합니다. */
    public requestSystemReset() {
        this._score = 0;
        this.transitionToState(GameState.PREPARING);
        GameManager.messageBus.emit(GameEventSymbols.SYSTEM_RESET);
    }

    /** 상태 전환 및 물리 시간(TimeScale 과 유사) 제어 */
    private transitionToState(targetState: GameState) {
        if (this._currentGameState === targetState) return;
        this._currentGameState = targetState;

        switch (targetState) {
            case GameState.PREPARING:
                // 준비 시엔 물리 연산 중단 (유니티의 Time.timeScale = 0과 유사)
                director.pause();
                break;
            case GameState.ACTIVE:
                director.resume();
                break;
            case GameState.TERMINATED:
                director.pause();
                break;
        }
    }
}
