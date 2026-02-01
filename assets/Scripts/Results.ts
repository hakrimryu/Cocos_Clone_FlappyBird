import { _decorator, Component, Label, sys, tween, Vec3 } from 'cc';
import { GameConfig } from './GameConfig';
import { GameManager, GameEventSymbols } from './GameManager';

const { ccclass, property } = _decorator;

/**
 * Results
 * 게임 화면에 표시되는 점수와 UI 가시성을 관리하는 프리젠테이션 레이어입니다.
 * 
 * [Unity Perspective]
 * 유니티의 UI Manager 또는 HUD 스크립트와 같습니다.
 * 로직(GameManager)에서 보낸 이벤트를 받아 텍스트 라벨을 업데이트하거나 안내 문구를 표시/숨김 처리합니다.
 */
@ccclass('Results')
export class Results extends Component {
    //--------------------------------------------------------------------------
    // Inspector UI Bindings (인스펙터 노출 라벨 변수)
    //--------------------------------------------------------------------------

    @property({ type: Label, visible: true, tooltip: "실시간 세션 점수 라벨" })
    private _realtimeScoreDisplay: Label = null;

    @property({ type: Label, visible: true, tooltip: "결과 화면에 표시될 하이스코어 라벨" })
    private _bestRecordDisplay: Label = null;

    @property({ type: Label, visible: true, tooltip: "게임 오버 후 재시작 안내 문구" })
    private _restartGuidanceDisplay: Label = null;

    @property({ type: Label, visible: true, tooltip: "게임 시작 전 준비 안내 문구" })
    private _preparingGuidanceDisplay: Label = null;

    //--------------------------------------------------------------------------
    // Animation Controllers (연출 제어)
    //--------------------------------------------------------------------------

    /** 준비 안내 문구의 펄스 애니메이션 트윈 객체 */
    private _guidancePulseTween: any = null;

    /** 실시간 점수 라벨의 팝 애니메이션 트윈 객체 */
    private _scorePopTween: any = null;

    //--------------------------------------------------------------------------
    // Private Domain State (내부 데이터)
    //--------------------------------------------------------------------------

    /** 저장소(LocalStorage)에서 불러온 역대 하이스코어 */
    private _persistedBestRecord: number = 0;

    /** 현재 플레이 중인 세션의 실시간 점수 */
    private _activeSessionScore: number = 0;

    /** 
     * 데이터 저장을 위한 고유 키값
     * [Unity Perspective] PlayerPrefs.SetInt("KYE", value)의 Key와 같습니다.
     */
    private readonly STORAGE_SCOPE_KEY = GameConfig.STORAGE_KEY_BEST_RECORD;

    //--------------------------------------------------------------------------
    // Life Cycle Methods
    //--------------------------------------------------------------------------

    onLoad() {
        this.loadBestRecordFromStorage();
        this.synchronizeSessionScoreDisplay();
        this.refreshUIVisibility(true); // 처음엔 준비 화면 표시
    }

    onEnable() {
        this.subscribeToMessagingBus();
    }

    onDisable() {
        this.unsubscribeFromMessagingBus();
    }

    //--------------------------------------------------------------------------
    // Messaging & Persistence (메시지 및 데이터 저장)
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

    /** 로컬 저장소에서 점수 로드 (유니티의 PlayerPrefs.GetInt와 유사) */
    private loadBestRecordFromStorage() {
        const rawData = sys.localStorage.getItem(this.STORAGE_SCOPE_KEY);
        this._persistedBestRecord = rawData ? parseInt(rawData) : 0;
    }

    /** 로컬 저장소에 현재 하이스코어 저장 (유니티의 PlayerPrefs.SetInt와 유사) */
    private persistBestRecordToStorage() {
        sys.localStorage.setItem(this.STORAGE_SCOPE_KEY, this._persistedBestRecord.toString());
    }

    //--------------------------------------------------------------------------
    // Message Handlers (이벤트 처리 루틴)
    //--------------------------------------------------------------------------

    private onSessionStarted() {
        // 게임 시작 시 모든 안내 문구 숨김
        this.refreshUIVisibility(false);
    }

    private onSessionEnded() {
        // 게임 종료 시 신기록 갱신 여부 판단 및 결과 UI 표시
        this.evaluateNewBestRecord();
        this.refreshUIVisibility(false, true);
    }

    /** 점수 획득 이벤트 수신 시 UI 반영 */
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
    // UI Synchronizers (화면 갱신)
    //--------------------------------------------------------------------------

    /** 현재 점수를 화면 라벨에 표기 */
    private synchronizeSessionScoreDisplay() {
        if (!this._realtimeScoreDisplay) return;

        // [UX Improvement] 숫자가 즉시 바뀌는 대신 부드럽게 카운트업 되는 연출 추가
        const dummy = { value: parseInt(this._realtimeScoreDisplay.string) || 0 };
        tween(dummy)
            .to(0.15, { value: this._activeSessionScore }, {
                onUpdate: () => {
                    this._realtimeScoreDisplay.string = Math.floor(dummy.value).toString();
                }
            })
            .start();

        // [Juice] 점수 상승 시 팝(Pop) 연출 추가
        this.playScorePopAnimation();
    }

    /** 득점 시 점수 라벨이 순간적으로 펄떡이는 연출을 수행합니다. */
    private playScorePopAnimation() {
        if (!this._realtimeScoreDisplay) return;

        // 기존 진행 중인 팝 애니메이션이 있다면 즉시 중단
        if (this._scorePopTween) {
            this._scorePopTween.stop();
        }

        this._realtimeScoreDisplay.node.setScale(1, 1, 1);

        // 0.1초 동안 1.2배 커졌다가 다시 돌아옴 (OutBack 이징으로 탄성 부여)
        this._scorePopTween = tween(this._realtimeScoreDisplay.node)
            .to(0.05, { scale: new Vec3(1.2, 1.2, 1.2) }, { easing: 'quadOut' })
            .to(0.1, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'quadIn' })
            .call(() => { this._scorePopTween = null; })
            .start();
    }

    /** 최고 기록 도전 및 갱신 시 저장 실행 */
    private evaluateNewBestRecord() {
        if (this._activeSessionScore > this._persistedBestRecord) {
            this._persistedBestRecord = this._activeSessionScore;
            this.persistBestRecordToStorage();
        }
    }

    /** 
     * 상황에 맞게 UI 요소들의 활성화(Active) 상태를 일괄 제어합니다.
     * @param isPreparing 준비 상태인가? (Tap to Start 표시)
     * @param isTerminated 종료 상태인가? (Try Again 및 HighScore 표시)
     */
    private refreshUIVisibility(isPreparing: boolean = false, isTerminated: boolean = false) {
        // 1. 하이스코어 및 재시작 안내 (종료 시에만 표시)
        if (this._bestRecordDisplay) {
            this._bestRecordDisplay.string = `High Score : ${this._persistedBestRecord}`;
            this._bestRecordDisplay.node.active = isTerminated;
        }

        if (this._restartGuidanceDisplay) {
            this._restartGuidanceDisplay.node.active = isTerminated;
        }

        // 2. 준비 안내 (준비 시에만 표시)
        if (this._preparingGuidanceDisplay) {
            this._preparingGuidanceDisplay.node.active = isPreparing;

            if (isPreparing) {
                this.playGuidancePulseAnimation();
            } else {
                this.stopGuidancePulseAnimation();
            }
        }
    }

    /** "Tap to Start" 문구를 부드럽게 강조하는 펄스 연출을 시작합니다. */
    private playGuidancePulseAnimation() {
        if (!this._preparingGuidanceDisplay || this._guidancePulseTween) return;

        // 초기 스케일 리셋
        this._preparingGuidanceDisplay.node.setScale(1, 1, 1);

        // 1.0 -> 1.1 -> 1.0 순서로 1.2초 동안 무한 반복 (Scale)
        this._guidancePulseTween = tween(this._preparingGuidanceDisplay.node)
            .repeatForever(
                tween()
                    .to(0.6, { scale: new Vec3(1.1, 1.1, 1.1) }, { easing: 'sineInOut' })
                    .to(0.6, { scale: new Vec3(1.0, 1.0, 1.0) }, { easing: 'sineInOut' })
            )
            .start();
    }

    /** 현재 진행 중인 펄스 연출을 안전하게 정지하고 상태를 초기화합니다. */
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
