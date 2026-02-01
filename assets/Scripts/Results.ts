import { _decorator, Component, Label, sys, tween, Vec3 } from 'cc';
import { GameConfig } from './GameConfig';
import { GameManager, GameEventSymbols } from './GameManager';

const { ccclass, property } = _decorator;

/**
 * @en
 * Presentation layer managing score display and UI visibility on the game screen.
 * Equivalent to a UI Manager or HUD script in Unity.
 * 
 * @kr
 * 게임 화면에 표시되는 점수와 UI 가시성을 관리하는 프리젠테이션 레이어입니다.
 * GameManager의 이벤트를 받아 텍스트 라벨을 업데이트하거나 안내 문구를 제어합니다.
 * 
 * @jp
 * ゲーム画面に表示されるスコアとUIの表示を管理するプレゼンテーション層です。
 * UnityのUI ManagerやHUDスクリプトと同様です。
 * GameManagerからのイベントを受け取り、テキストラベルの更新や案内メッセージの制御を行います。
 */
@ccclass('Results')
export class Results extends Component {
    //--------------------------------------------------------------------------
    // Inspector UI Bindings
    //--------------------------------------------------------------------------

    /** @en Real-time session score label @kr 실시간 세션 점수 라벨 @jp リアルタイムセッションスコアラベル */
    @property({ type: Label, visible: true, tooltip: "Label for real-time session score" })
    private _realtimeScoreDisplay: Label = null;

    /** @en High score label for the results screen @kr 결과 화면용 하이스코어 라벨 @jp 結果画面用のハイスコア表示ラベル */
    @property({ type: Label, visible: true, tooltip: "Label for persistent high score" })
    private _bestRecordDisplay: Label = null;

    /** @en Restart guidance text after Game Over @kr 게임오버 후 재시작 안내 문구 @jp ゲームオーバー後の再開案内テキスト */
    @property({ type: Label, visible: true, tooltip: "Guidance for session restart" })
    private _restartGuidanceDisplay: Label = null;

    /** @en Preparation guidance text before start @kr 게임 시작 전 준비 안내 문구 @jp ゲーム開始前の準備案内テキスト */
    @property({ type: Label, visible: true, tooltip: "Guidance for session preparation" })
    private _preparingGuidanceDisplay: Label = null;

    //--------------------------------------------------------------------------
    // Animation Controllers
    //--------------------------------------------------------------------------

    /** @en Tween for guidance pulse animation @kr 준비 안내 문구 펄스 애니메이션 트윈 @jp 準備案内テキストのパルスアニメーションTween */
    private _guidancePulseTween: any = null;

    /** @en Tween for score pop animation @kr 실시간 점수 라벨 팝 애니메이션 트윈 @jp リアルタイムスコアラベルのポップアニメーションTween */
    private _scorePopTween: any = null;

    //--------------------------------------------------------------------------
    // Private Domain State
    //--------------------------------------------------------------------------

    /** @en Persisted high score from LocalStorage @kr 저장소에서 로드된 역대 하이스코어 @jp ローカルストレージからロードされた過去の最高記録 */
    private _persistedBestRecord: number = 0;

    /** @en Real-time score of the current active session @kr 현재 활성 세션의 실시간 점수 @jp 現在進行中のセッションのリアルタイムスコア */
    private _activeSessionScore: number = 0;

    /** 
     * @en Unique key for data storage (equivalent to Unity's PlayerPrefs key)
     * @kr 데이터 저장을 위한 고유 키값
     * @jp データ保存用の固有キー（UnityのPlayerPrefsのキーと同様）
     */
    private readonly STORAGE_SCOPE_KEY = GameConfig.STORAGE_KEY_BEST_RECORD;

    //--------------------------------------------------------------------------
    // Life Cycle Methods
    //--------------------------------------------------------------------------

    onLoad() {
        this.loadBestRecordFromStorage();
        this.synchronizeSessionScoreDisplay();
        this.refreshUIVisibility(true);
    }

    onEnable() {
        this.subscribeToMessagingBus();
    }

    onDisable() {
        this.unsubscribeFromMessagingBus();
    }

    //--------------------------------------------------------------------------
    // Messaging & Persistence
    //--------------------------------------------------------------------------

    private subscribeToMessagingBus() {
        GameManager.messageBus.on(GameEventSymbols.SESSION_START, this.onSessionStarted, this);
        GameManager.messageBus.on(GameEventSymbols.SESSION_END, this.onSessionEnded, this);
        GameManager.messageBus.on(GameEventSymbols.SCORE_INCREMENT, this.handleScoreIncrement, this);
        GameManager.messageBus.on(GameEventSymbols.SYSTEM_RESET, this.handleSystemReset, this);
    }

    private unsubscribeFromMessagingBus() {
        GameManager.messageBus.off(GameEventSymbols.SESSION_START, this.onSessionStarted, this);
        GameManager.messageBus.off(GameEventSymbols.SESSION_END, this.onSessionEnded, this);
        GameManager.messageBus.off(GameEventSymbols.SCORE_INCREMENT, this.handleScoreIncrement, this);
        GameManager.messageBus.off(GameEventSymbols.SYSTEM_RESET, this.handleSystemReset, this);
    }

    /** @en Load score from local storage (similar to PlayerPrefs.GetInt) @kr 저장소에서 점수 로딩 @jp ストレージからスコアをロード */
    private loadBestRecordFromStorage() {
        const rawData = sys.localStorage.getItem(this.STORAGE_SCOPE_KEY);
        this._persistedBestRecord = rawData ? parseInt(rawData) : 0;
    }

    /** @en Persist high score to local storage (similar to PlayerPrefs.SetInt) @kr 저장소에 하이스코어 저장 @jp ストレージにハイスコアを保存 */
    private persistBestRecordToStorage() {
        sys.localStorage.setItem(this.STORAGE_SCOPE_KEY, this._persistedBestRecord.toString());
    }

    //--------------------------------------------------------------------------
    // Message Handlers
    //--------------------------------------------------------------------------

    private onSessionStarted() {
        // @en Hide all guidance text on start @kr 게임 시작 시 안내 문구 숨김 @jp ゲーム開始時に案内テキストを非表示
        this.refreshUIVisibility(false);
    }

    private onSessionEnded() {
        // @en Evaluate high score and show result UI @kr 신기록 판단 및 결과 UI 표시 @jp 記録更新を判定し、結果UIを表示
        this.evaluateNewBestRecord();
        this.refreshUIVisibility(false, true);
    }

    /** @en Reflect score increment in UI @kr 점수 획득 시 UI 반영 @jp スコア獲得時にUIへ反映 */
    private handleScoreIncrement(step: number) {
        this._activeSessionScore += step;
        this.synchronizeSessionScoreDisplay();
    }

    private handleSystemReset() {
        this._activeSessionScore = 0;
        this.synchronizeSessionScoreDisplay();
        this.refreshUIVisibility(true);
    }

    //--------------------------------------------------------------------------
    // UI Synchronizers
    //--------------------------------------------------------------------------

    /** @en Display current score on label @kr 현재 점수를 화면 라벨에 표기 @jp 現在のスコアをラベルに表示 */
    private synchronizeSessionScoreDisplay() {
        if (!this._realtimeScoreDisplay) return;

        // @en [UX] Soft count-up effect instead of instant value change @kr 점수 카운트업 연출 @jp スコアカウントアップの演出
        const dummy = { value: parseInt(this._realtimeScoreDisplay.string) || 0 };
        tween(dummy)
            .to(0.15, { value: this._activeSessionScore }, {
                onUpdate: () => {
                    this._realtimeScoreDisplay.string = Math.floor(dummy.value).toString();
                }
            })
            .start();

        // @en [Juice] Play pop animation on score increment @kr 점수 상승 시 팝 연출 @jp スコア上昇時のポップ演出
        this.playScorePopAnimation();
    }

    /** @en Momentary pulse animation for score label upon scoring @kr 점수 획득 시 라벨 팝 연출 @jp スコア獲得時のラベルポップ演出 */
    private playScorePopAnimation() {
        if (!this._realtimeScoreDisplay) return;

        if (this._scorePopTween) {
            this._scorePopTween.stop();
        }

        this._realtimeScoreDisplay.node.setScale(1, 1, 1);

        // @en Quick scale up and down with OutBack easing @kr OutBack 이징을 사용한 탄성 연출 @jp OutBackイージングを使用した弾性演出
        this._scorePopTween = tween(this._realtimeScoreDisplay.node)
            .to(0.05, { scale: new Vec3(1.2, 1.2, 1.2) }, { easing: 'quadOut' })
            .to(0.1, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'quadIn' })
            .call(() => { this._scorePopTween = null; })
            .start();
    }

    /** @en Check and save high score updates @kr 최고 기록 갱신 여부 판단 및 저장 @jp 最高記録の更新判定と保存 */
    private evaluateNewBestRecord() {
        if (this._activeSessionScore > this._persistedBestRecord) {
            this._persistedBestRecord = this._activeSessionScore;
            this.persistBestRecordToStorage();
        }
    }

    /** 
     * @en Bulk control for UI element visibility based on game state
     * @kr 상황에 맞게 UI 요소들의 활성화 상태를 제어합니다.
     * @jp ゲームの状態に応じてUI要素の表示・非表示を一括制御します。
     * @param isPreparing 
     * @en Preparing state? (Tap to Start) @kr 준비 상태 여부 @jp 準備状態かどうか
     * @param isTerminated 
     * @en Terminated state? (Try Again/HighScore) @kr 종료 상태 여부 @jp 終了状態かどうか
     */
    private refreshUIVisibility(isPreparing: boolean = false, isTerminated: boolean = false) {
        // 1. @en High score and restart guidance (only on Game Over) @kr 하이스코어 및 재시작 안내 @jp ハイスコアと再開案内
        if (this._bestRecordDisplay) {
            this._bestRecordDisplay.string = `High Score : ${this._persistedBestRecord}`;
            this._bestRecordDisplay.node.active = isTerminated;
        }

        if (this._restartGuidanceDisplay) {
            this._restartGuidanceDisplay.node.active = isTerminated;
        }

        // 2. @en Preparation guidance (only in preparing state) @kr 준비 안내 @jp 準備案内
        if (this._preparingGuidanceDisplay) {
            this._preparingGuidanceDisplay.node.active = isPreparing;

            if (isPreparing) {
                this.playGuidancePulseAnimation();
            } else {
                this.stopGuidancePulseAnimation();
            }
        }
    }

    /** @en Starts loop pulse animation for "Tap to Start" text @kr "Tap to Start" 문구 펄스 연출 시작 @jp 「Tap to Start」テキストのパルス演出を開始 */
    private playGuidancePulseAnimation() {
        if (!this._preparingGuidanceDisplay || this._guidancePulseTween) return;

        this._preparingGuidanceDisplay.node.setScale(1, 1, 1);

        // @en Infinite loop between 1.0 and 1.1 scale @kr 1.0 <-> 1.1 스케일 무한 반복 @jp 1.0から1.1までのスケールループ
        this._guidancePulseTween = tween(this._preparingGuidanceDisplay.node)
            .repeatForever(
                tween()
                    .to(0.6, { scale: new Vec3(1.1, 1.1, 1.1) }, { easing: 'sineInOut' })
                    .to(0.6, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'sineInOut' })
            )
            .start();
    }

    /** @en Safely stops pulse animation and resets state @kr 펄스 연출 정지 및 상태 초기화 @jp パルス演出を停止し状態を初期化 */
    private stopGuidancePulseAnimation() {
        if (this._guidancePulseTween) {
            this._guidancePulseTween.stop();
            this._guidancePulseTween = null;
        }

        if (this._preparingGuidanceDisplay) {
            this._preparingGuidanceDisplay.node.setScale(1, 1, 1);
        }
    }
}
