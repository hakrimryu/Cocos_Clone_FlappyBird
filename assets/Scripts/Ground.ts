import { _decorator, Component, Node, UITransform, Vec3 } from 'cc';
import { GameManager, GameState, GameEventSymbols } from './GameManager';
import { GameConfig } from './GameConfig';

const { ccclass, property } = _decorator;

/**
 * @en
 * Component that creates an infinite scrolling background (ground) loop.
 * 
 * @kr
 * 배경(땅)을 무한히 순환하며 스크롤 시키는 컴포넌트입니다.
 * 유니티의 무한 루프 배경 기법(배경을 여러 개 두고 화면 밖으로 나가면 재배치)이 적용되어 있습니다.
 * 
 * @jp
 * 背景（地面）を無限にループさせながらスクロールさせるコンポーネントです。
 * 背景オブジェクトを複数配置し、画面外に出た瞬間に再配置する「無限ループ背景」の手法が適用されています。
 */
@ccclass('Ground')
export class Ground extends Component {
    //--------------------------------------------------------------------------
    // Serialized Scenery
    //--------------------------------------------------------------------------

    /** 
     * @en Array of background nodes for repetitive placement
     * @kr 순환 배치될 배경 노드 배열
     * @jp 繰り返し配置される背景ノードの配列
     */
    @property({ type: [Node], visible: true, tooltip: "Environment nodes for repetitive loop" })
    private _repetitiveSceneryNodes: Node[] = [];

    //--------------------------------------------------------------------------
    // Internal Topology & Caches
    //--------------------------------------------------------------------------

    /** 
     * @en Combined width of all background nodes for looping boundary
     * @kr 모든 배경 노드의 전체 가로 합
     * @jp 全ての背景ノードの合計横幅
     */
    private _loopingBoundaryWidth: number = 0;

    /** 
     * @en Cache for individual background node widths
     * @kr 각 배경 노드의 너비(Width)를 캐싱
     * @jp 各背景ノードの幅をキャッシュ
     */
    private _nodeExtentCache: number[] = [];

    /** 
     * @en Vector cache for position calculations (Zero-GC)
     * @kr 연산 속도와 메모리 절약을 위한 위치 연산용 벡터 캐시
     * @jp 演算速度とメモリ節約のための位置演算用ベクトルキャッシュ
     */
    private _localTranslationCache: Vec3 = new Vec3();

    //--------------------------------------------------------------------------
    // Life Cycle Methods
    //--------------------------------------------------------------------------

    onLoad() {
        this.constructParallaxLayer();
        this.subscribeToMessagingBus();
    }

    onDestroy() {
        this.unsubscribeFromMessagingBus();
    }

    update(dt: number) {
        // @en Stop scrolling on Game Over @kr 게임오버 상태에서는 스크롤 중단 @jp ゲームオーバー状態ではスクロールを停止
        if (!GameManager.instance || GameManager.instance.currentGameState === GameState.TERMINATED) return;

        this.executeParallaxTranslation(dt);
    }

    //--------------------------------------------------------------------------
    // Layer Configuration
    //--------------------------------------------------------------------------

    /** 
     * @en Reads node widths and aligns them in a sequence
     * @kr 배경 노드들의 너비를 읽어 일렬로 정렬 배치합니다.
     * @jp 背景ノードの幅を読み取り、一列に整列配置します。
     */
    private constructParallaxLayer() {
        if (!this._repetitiveSceneryNodes || this._repetitiveSceneryNodes.length === 0) return;

        this._loopingBoundaryWidth = 0;
        this._nodeExtentCache = [];

        for (let i = 0; i < this._repetitiveSceneryNodes.length; i++) {
            const node = this._repetitiveSceneryNodes[i];
            const ui = node.getComponent(UITransform); // Similar to Unity's RectTransform access

            if (ui) {
                const width = ui.width;
                this._nodeExtentCache[i] = width;

                // @en Align nodes consecutively at runtime @kr 런타임에 빈틈없이 기차처럼 일렬 정렬 @jp 実行時に隙間なく一列に整列
                node.setPosition(this._loopingBoundaryWidth, 0, 0);
                this._loopingBoundaryWidth += width;
            }
        }
    }

    private subscribeToMessagingBus() {
        GameManager.messageBus.on(GameEventSymbols.SYSTEM_RESET, this.synchronizeInitialPlacement, this);
    }

    private unsubscribeFromMessagingBus() {
        GameManager.messageBus.off(GameEventSymbols.SYSTEM_RESET, this.synchronizeInitialPlacement, this);
    }

    //--------------------------------------------------------------------------
    // Translation Logic
    //--------------------------------------------------------------------------

    /** 
     * @en Translates background every frame and snaps off-screen nodes to the other side
     * @kr 프레임마다 배경을 이동시키고, 화면 밖으로 나간 배경을 반대편으로 옮깁니다.
     * @jp フレームごとに背景を移動させ、画面外に出た背景を反対側に移動させます。
     */
    private executeParallaxTranslation(dt: number) {
        // @en Get dynamic speed based on current score from GameManager @kr GameManager에서 난이도 반영 동적 스피드 획득 @jp GameManagerから難易度反映の動的速度を取得
        const lateralStep = GameManager.instance.currentWorldSpeed * dt;

        for (let i = 0; i < this._repetitiveSceneryNodes.length; i++) {
            const node = this._repetitiveSceneryNodes[i];
            node.getPosition(this._localTranslationCache);

            // 1. @en Move left @kr 왼쪽 방향 이동 @jp 左方向に移動
            this._localTranslationCache.x -= lateralStep;

            // 2. @en Check visibility and snap back if out of bounds @kr 가시 영역 이탈 검사 및 재배치 @jp 可視領域脱出の検査と再配置
            const extent = this._nodeExtentCache[i];
            if (this._localTranslationCache.x + extent <= 0) {
                // @en Compensate for frame-time variance @kr 프레임 드랍 시에도 오차 방지 @jp フレームドロップ時の誤差を防ぐため
                this._localTranslationCache.x += this._loopingBoundaryWidth;
            }

            node.setPosition(this._localTranslationCache);
        }
    }

    /** 
     * @en Reset and align backgrounds to the origin during session reset
     * @kr 세션 리셋(Restart) 시 모든 배경을 다시 원점으로 정렬합니다.
     * @jp セッション再開時、全ての背景を再び原点に整列させます。
     */
    private synchronizeInitialPlacement() {
        this.constructParallaxLayer();
    }
}
