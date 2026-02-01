import { _decorator, Component, AudioSource, AudioClip } from 'cc';

const { ccclass, property, requireComponent } = _decorator;

/**
 * AudioManager
 * 게임 전역의 사운드 이펙트(SFX) 재생을 총괄하는 싱글톤 매니저입니다.
 * 
 * [Unity Perspective]
 * 유니티의 전역 오디오 매니저 또는 AudioSource를 래핑한 싱글톤과 유사합니다.
 * 각 상황에 맞는 AudioClip을 인스펙터에서 등록하고, 코드 어디서든 play*() 메소드로 호출합니다.
 */
@ccclass('AudioManager')
@requireComponent(AudioSource)
export class AudioManager extends Component {
    //--------------------------------------------------------------------------
    // Public Static Accessor (Singleton)
    //--------------------------------------------------------------------------
    private static _instance: AudioManager = null;
    public static get instance(): AudioManager { return this._instance; }

    //--------------------------------------------------------------------------
    // Serialized Audio Assets (인스펙터 노출 오디오 클립)
    //--------------------------------------------------------------------------

    @property({ type: AudioClip, tooltip: "날갯짓 소리 (Jump)" })
    private wingClip: AudioClip = null;

    @property({ type: AudioClip, tooltip: "장애물 충돌 소리 (Hit)" })
    private hitClip: AudioClip = null;

    @property({ type: AudioClip, tooltip: "게임 오버/추락 소리 (Die)" })
    private dieClip: AudioClip = null;

    @property({ type: AudioClip, tooltip: "점수 획득 소리 (Point)" })
    private pointClip: AudioClip = null;

    @property({ type: AudioClip, tooltip: "화면 전환/시작 소리 (Swoosh)" })
    private swooshClip: AudioClip = null;

    //--------------------------------------------------------------------------
    // Private State
    //--------------------------------------------------------------------------

    /** 실제 재생을 담당할 코코스 엔진의 오디오 소스 컴포넌트 */
    private _audioSource: AudioSource = null;

    //--------------------------------------------------------------------------
    // Life Cycle Methods
    //--------------------------------------------------------------------------

    onLoad() {
        this.initializeSingleton();
        this._audioSource = this.getComponent(AudioSource);
    }

    onDestroy() {
        if (AudioManager._instance === this) {
            AudioManager._instance = null;
        }
    }

    /** 싱글톤 관계 설정 및 중복 파괴 처리 */
    private initializeSingleton() {
        if (AudioManager._instance) {
            this.node.destroy();
            return;
        }
        AudioManager._instance = this;
    }

    //--------------------------------------------------------------------------
    // Public Playback API (외부 호출용 인터페이스)
    //--------------------------------------------------------------------------

    /** 플레이어가 점프할 때 (날갯짓 효과음) */
    public playWing() {
        this.emitOneShot(this.wingClip);
    }

    /** 파이프나 바닥에 충돌했을 때 */
    public playHit() {
        this.emitOneShot(this.hitClip);
    }

    /** 충돌 후 실질적으로 게임이 종료될 때 */
    public playDie() {
        this.emitOneShot(this.dieClip);
    }

    /** 파이프 사이를 통과하여 득점했을 때 */
    public playPoint() {
        this.emitOneShot(this.pointClip);
    }

    /** 게임 시작이나 UI 전환 시 */
    public playSwoosh() {
        this.emitOneShot(this.swooshClip);
    }

    //--------------------------------------------------------------------------
    // Internal Logic
    //--------------------------------------------------------------------------

    /**
     * AudioClip을 중첩 재생 가능한 OneShot 방식으로 출력합니다.
     * @param clip 재생할 오디오 리소스
     */
    private emitOneShot(clip: AudioClip) {
        if (clip && this._audioSource) {
            // [Cocos Creator 3.x] playOneShot은 별도의 AudioSource 상태와 무관하게 즉시 중첩 재생을 지원합니다.
            this._audioSource.playOneShot(clip, 1.0);
        }
    }
}
