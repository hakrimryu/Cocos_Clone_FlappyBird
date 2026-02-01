import { _decorator, Component, director, EventKeyboard, input, Input, KeyCode, EventTarget } from 'cc';
import { GameConfig } from './GameConfig';
import { INavigator } from './INavigator';
import { AudioManager } from './AudioManager';

const { ccclass, property } = _decorator;

/** 
 * @en
 * Defines atomic states to control the overall game flow.
 * 
 * @kr
 * 전체 게임 흐름을 제어하는 원자적 상태 정의입니다.
 * 
 * @jp
 * 全体のゲームの流れを制御する状態定義です。
 */
export enum GameState {
    PREPARING,   // @en Waiting for 'Tap to Start' @kr 초기 준비 상태 @jp 開始待機状態
    ACTIVE,      // @en Game is in progress @kr 실제 진행 중 @jp ゲーム進行中
    TERMINATED   // @en Game over @kr 종료 상태 @jp ゲーム終了状態
}

/**
 * @en
 * Identifier for global game events.
 * Used for communication similar to Unity's EventSystem or Delegates.
 * 
 * @kr
 * 프로젝트 전역에서 사용되는 이벤트 식별자입니다.
 * 유니티의 EventSystem이나 Delegate와 유사한 통신을 위해 사용됩니다.
 * 
 * @jp
 * プロジェクト全体で使用されるイベント識別子です。
 * UnityのEventSystemやDelegateと同様の通信に使用されます。
 */
export const GameEventSymbols = {
    SESSION_START: 'game:session-start',    // @en Game start @kr 게임 시작 @jp ゲーム開始
    SESSION_END: 'game:session-end',        // @en Game end @kr 게임 종료 @jp ゲーム終了
    SCORE_INCREMENT: 'game:score-increment',// @en Score gain @kr 점수 획득 @jp スコア獲得
    SYSTEM_RESET: 'game:system-reset',      // @en System reset @kr 시스템 초기화 @jp システム初期化
} as const;

/**
 * @en
 * Main controller that coordinates the overall game flow and state.
 * Similar to a Manager object used in Unity's Singleton pattern.
 * 
 * @kr
 * 전체 게임의 흐름과 상태를 조율하는 메인 컨트롤러입니다.
 * 유니티의 Singleton 패턴을 사용한 매니저 객체와 유사합니다.
 * 
 * @jp
 * ゲーム全体の流れと状態を管理するメインコントローラーです。
 * Unityのシングルトンパターンを使用したマネージャーオブジェクトと同様です。
 */
@ccclass('GameManager')
export class GameManager extends Component {
    //--------------------------------------------------------------------------
    // Public Static Accessor (Singleton)
    //--------------------------------------------------------------------------
    private static _instance: GameManager = null;
    public static get instance(): GameManager { return this._instance; }

    /** 
     * @en Global message bus for event-driven communication
     * @kr 전역 메시지 버스 (유니티의 전역 이벤트 시스템 또는 Messenger와 유사한 역할)
     * @jp イベント駆動型通信のためのグローバルメッセージバス
     */
    public static readonly messageBus: EventTarget = new EventTarget();

    //--------------------------------------------------------------------------
    // Private State Variables
    //--------------------------------------------------------------------------

    /** 
     * @en Reference to the character being controlled
     * @kr 현재 게임이 조종하고 있는 캐릭터 (인터페이스를 통해 참조)
     * @jp 現在操作されているキャラクターのリファレンス
     */
    private _navigator: INavigator = null;
    public get navigator(): INavigator { return this._navigator; }

    /** 
     * @en Current state of the engine (preparing, active, terminated)
     * @kr 엔진의 현재 상태
     * @jp エンジンの現在の状態
     */
    private _currentGameState: GameState = GameState.PREPARING;
    public get currentGameState(): GameState { return this._currentGameState; }

    /** 
     * @en Score earned in the current session
     * @kr 현재 세션의 획득 점수
     * @jp 現在のセッションで獲得したスコア
     */
    private _score: number = 0;
    public get score(): number { return this._score; }

    //--------------------------------------------------------------------------
    // Dynamic Difficulty Accessors
    //--------------------------------------------------------------------------

    /** 
     * @en Speed multiplier based on score (increases 10% every 10 points)
     * @kr 현재 점수를 기반으로 도출된 속도 배율 (10점당 10%씩 상승)
     * @jp スコアに基づいた速度倍率（10ポイントごとに10%上昇）
     */
    public get currentSpeedMultiplier(): number {
        const step = Math.floor(this._score / 10);
        const multiplier = 1.0 + (step * 0.1);
        return Math.min(GameConfig.MAX_SPEED_MULTIPLIER, multiplier);
    }

    /** 
     * @en Background scroll speed adjusted for current difficulty
     * @kr 현재 점수가 반영된 배경 스크롤 속도
     * @jp 現在の難易度に合わせて調整された背景スクロール速度
     */
    public get currentWorldSpeed(): number {
        return GameConfig.WORLD_SCROLL_VELOCITY * this.currentSpeedMultiplier;
    }

    /** 
     * @en Pipe movement speed adjusted for current difficulty
     * @kr 현재 점수가 반영된 파이프 이동 속도
     * @jp 現在の難易度に合わせて調整されたパイプの移動速度
     */
    public get currentObstacleSpeed(): number {
        return GameConfig.OBSTACLE_LATERAL_SPEED * this.currentSpeedMultiplier;
    }

    /** 
     * @en Optimized pipe spawn interval based on current speed multiplier
     * @kr 현재 속도 배율에 최적화된 파이프 생성 주기
     * @jp 現在の速度倍率に基づいたパイプ生成間隔
     */
    public get currentSpawnInterval(): number {
        return GameConfig.PIPE_SPAWN_INTERVAL / this.currentSpeedMultiplier;
    }

    //--------------------------------------------------------------------------
    // Life Cycle Methods
    //--------------------------------------------------------------------------

    onLoad() {
        this.initializeSingleton();
        this.initializeInputListeners();
    }

    start() {
        this.requestSystemReset();
    }

    onDestroy() {
        this.cleanupInputListeners();
        if (GameManager._instance === this) {
            GameManager._instance = null;
        }
    }

    //--------------------------------------------------------------------------
    // Public Registration API
    //--------------------------------------------------------------------------

    /** 
     * @en Called by the player object to register itself with the manager
     * @kr 플레이어 객체가 생성될 때 스스로를 등록하는 함수입니다.
     * @jp プレイヤーオブジェクト自身の登録用関数
     */
    public registerNavigator(navigator: INavigator) {
        this._navigator = navigator;
    }

    //--------------------------------------------------------------------------
    // Internal Logic
    //--------------------------------------------------------------------------

    /** 
     * @en Singleton relationship setup and duplicate detection
     * @kr 싱글톤 관계 설정 및 중복 방지
     * @jp シングルトン関係の設定と重複防止
     */
    private initializeSingleton() {
        if (GameManager._instance) {
            this.node.destroy();
            return;
        }
        GameManager._instance = this;
    }

    /** 
     * @en Register listeners for global input events
     * @kr 입력 리스너 초기화
     * @jp 入力リスナーの初期化
     */
    private initializeInputListeners() {
        input.on(Input.EventType.KEY_DOWN, this.handleKeyboardInput, this);
        input.on(Input.EventType.TOUCH_START, this.handleInteractionTrigger, this);
    }

    /** 
     * @en Remove listeners for global input events
     * @kr 입력 리스너 해제
     * @jp 入力リスナーの解除
     */
    private cleanupInputListeners() {
        input.off(Input.EventType.KEY_DOWN, this.handleKeyboardInput, this);
        input.off(Input.EventType.TOUCH_START, this.handleInteractionTrigger, this);
    }

    /** 
     * @en Input handler for keyboard events
     * @kr 키보드 입력 처리
     * @jp キーボード入力処理
     */
    private handleKeyboardInput(event: EventKeyboard) {
        if (event.keyCode === KeyCode.SPACE || event.keyCode === KeyCode.ARROW_UP) {
            this.handleInteractionTrigger();
        }
    }

    /** 
     * @en Converts interaction events (touch/key) into game actions
     * @kr 터치나 버튼 입력을 게임의 동작으로 변환하는 핵심 브릿지입니다.
     * @jp タッチやキー入力をゲームのアクションに変換するブリッジ
     */
    private handleInteractionTrigger() {
        switch (this._currentGameState) {
            case GameState.PREPARING:
            case GameState.TERMINATED:
                this.executeGameStart();
                break;
            case GameState.ACTIVE:
                if (this._navigator) this._navigator.fly();
                break;
        }
    }

    //--------------------------------------------------------------------------
    // Public Command API
    //--------------------------------------------------------------------------

    /** 
     * @en Starts a new game session
     * @kr 게임 세션을 시작합니다.
     * @jp ゲームセッションを開始します。
     */
    public executeGameStart() {
        this.requestSystemReset();
        this.transitionToState(GameState.ACTIVE);
        GameManager.messageBus.emit(GameEventSymbols.SESSION_START);

        if (AudioManager.instance) AudioManager.instance.playSwoosh();
    }

    /** 
     * @en Handles game over when the player dies
     * @kr 플레이어가 죽었을 때 게임오버를 처리합니다.
     * @jp プレイヤー死亡時のゲームオーバー処理
     */
    public executeGameOver() {
        if (this._currentGameState === GameState.TERMINATED) return;

        this.transitionToState(GameState.TERMINATED);
        GameManager.messageBus.emit(GameEventSymbols.SESSION_END);

        if (AudioManager.instance) AudioManager.instance.playDie();
    }

    /** 
     * @en Increments game score
     * @kr 파이프 통과 시 점수를 올립니다.
     * @jp スコアを加算します。
     */
    public registerScoreIncrement(points: number = 1) {
        if (this._currentGameState !== GameState.ACTIVE) return;
        this._score += points;

        if (AudioManager.instance) AudioManager.instance.playPoint();

        GameManager.messageBus.emit(GameEventSymbols.SCORE_INCREMENT, points);
    }

    /** 
     * @en Resets all systems to the initial preparing state
     * @kr 모든 시스템을 최초 준비 상태로 물리적 리셋 합니다.
     * @jp システム全体を初期状態にリセットします。
     */
    public requestSystemReset() {
        this._score = 0;
        this.transitionToState(GameState.PREPARING);
        GameManager.messageBus.emit(GameEventSymbols.SYSTEM_RESET);
    }

    /** 
     * @en Manages state transitions and engine pause/resume
     * @kr 상태 전환 및 물리 시간 제어
     * @jp 状態の遷移とエンジンの停止/再開を管理します。
     */
    private transitionToState(targetState: GameState) {
        if (this._currentGameState === targetState) return;
        this._currentGameState = targetState;

        switch (targetState) {
            case GameState.PREPARING:
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
