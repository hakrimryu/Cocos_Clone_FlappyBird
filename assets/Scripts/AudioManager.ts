import { _decorator, Component, AudioSource, AudioClip } from 'cc';

const { ccclass, property, requireComponent } = _decorator;

/**
 * @en
 * Singleton manager that oversees sound effects (SFX) playback throughout the game.
 * 
 * @kr
 * 게임 전역의 사운드 이펙트(SFX) 재생을 총괄하는 싱글톤 매니저입니다.
 * 
 * @jp
 * ゲーム全体の効果音（SFX）再生を管理するシングルトンマネージャーです。
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
    // Serialized Audio Assets
    //--------------------------------------------------------------------------

    /**
     * @en Flapping sound (Jump)
     * @kr 날갯짓 소리 (Jump)
     * @jp 羽ばたき音 (Jump)
     */
    @property({ type: AudioClip, tooltip: "Wing Flap Sound" })
    private wingClip: AudioClip = null;

    /**
     * @en Collision sound (Hit)
     * @kr 장애물 충돌 소리 (Hit)
     * @jp 障害物衝突音 (Hit)
     */
    @property({ type: AudioClip, tooltip: "Hit Sound" })
    private hitClip: AudioClip = null;

    /**
     * @en Game over/Falling sound (Die)
     * @kr 게임 오버/추락 소리 (Die)
     * @jp ゲームオーバー/落下音 (Die)
     */
    @property({ type: AudioClip, tooltip: "Die Sound" })
    private dieClip: AudioClip = null;

    /**
     * @en Point scoring sound (Point)
     * @kr 점수 획득 소리 (Point)
     * @jp ポイント獲得音 (Point)
     */
    @property({ type: AudioClip, tooltip: "Point Sound" })
    private pointClip: AudioClip = null;

    /**
     * @en Screen transition/Start sound (Swoosh)
     * @kr 화면 전환/시작 소리 (Swoosh)
     * @jp 画面切り替え/開始音 (Swoosh)
     */
    @property({ type: AudioClip, tooltip: "Swoosh Sound" })
    private swooshClip: AudioClip = null;

    //--------------------------------------------------------------------------
    // Private State
    //--------------------------------------------------------------------------

    /** 
     * @en Cocos engine AudioSource component for actual playback 
     * @kr 실제 재생을 담당할 코코스 엔진의 오디오 소스 컴포넌트
     * @jp 実際の再生を担当するCocosエンジンのAudioSourceコンポーネント
     */
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

    /** 
     * @en Singleton relationship setup and duplicate destruction handling 
     * @kr 싱글톤 관계 설정 및 중복 파괴 처리
     * @jp シングルトン関係の設定と重複破棄の処理
     */
    private initializeSingleton() {
        if (AudioManager._instance) {
            this.node.destroy();
            return;
        }
        AudioManager._instance = this;
    }

    //--------------------------------------------------------------------------
    // Public Playback API
    //--------------------------------------------------------------------------

    /** 
     * @en Play wing flap sound when the player jumps 
     * @kr 플레이어가 점프할 때 (날갯짓 효과음)
     * @jp プレイヤーがジャンプしたとき（羽ばたき音）
     */
    public playWing() {
        this.emitOneShot(this.wingClip);
    }

    /** 
     * @en Play collision sound when hitting a pipe or the ground 
     * @kr 파이프나 바닥에 충돌했을 때
     * @jp パイプや地面に衝突したとき
     */
    public playHit() {
        this.emitOneShot(this.hitClip);
    }

    /** 
     * @en Play die sound when the game ends after a collision 
     * @kr 충돌 후 실질적으로 게임이 종료될 때
     * @jp 衝突後、実質的にゲームが終了したとき
     */
    public playDie() {
        this.emitOneShot(this.dieClip);
    }

    /** 
     * @en Play point sound when passing between pipes 
     * @kr 파이프 사이를 통과하여 득점했을 때
     * @jp パイプの間を通過して得点したとき
     */
    public playPoint() {
        this.emitOneShot(this.pointClip);
    }

    /** 
     * @en Play swoosh sound during game start or UI transition 
     * @kr 게임 시작이나 UI 전환 시
     * @jp ゲーム開始やUIの切り替え時
     */
    public playSwoosh() {
        this.emitOneShot(this.swooshClip);
    }

    //--------------------------------------------------------------------------
    // Internal Logic
    //--------------------------------------------------------------------------

    /**
     * @en Outputs AudioClip in OneShot mode for overlapping playback.
     * @kr AudioClip을 중첩 재생 가능한 OneShot 방식으로 출력합니다.
     * @jp AudioClipを重複再生可能なOneShot方式で出力します。
     * @param clip 
     * @en Audio resource to play
     * @kr 재생할 오디오 리소스
     * @jp 再生するオーディオリソース
     */
    private emitOneShot(clip: AudioClip) {
        if (clip && this._audioSource) {
            // [Cocos Creator 3.x] playOneShot supports immediate overlapping playback.
            this._audioSource.playOneShot(clip, 1.0);
        }
    }
}
