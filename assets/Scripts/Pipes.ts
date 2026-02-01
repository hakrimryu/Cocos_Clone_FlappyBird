import { _decorator, Component, Node, Vec3, math, UITransform } from 'cc';
import { GameManager, GameState, GameEventSymbols } from './GameManager';
import { GameConfig } from './GameConfig';

const { ccclass, property } = _decorator;

/**
 * @en
 * Component that manages the movement and randomization of a pair of pipes (top and bottom).
 * Individual obstacle entity managed as a prefab.
 * 
 * @kr
 * 상단과 하단 파이프 한 쌍의 움직임과 각개 랜덤화를 처리하는 컴포넌트입니다.
 * 생성 시점에 통로의 폭과 수평/수직 위치를 랜덤하게 결정합니다.
 * 
 * @jp
 * 上下パイプのペアの移動とランダム化を管理するコンポーネントです。
 * プレハブとして管理される個別の障害物エンティティです。
 * 生成時に通路の幅と水平・垂直位置をランダムに決定します。
 */
@ccclass('Pipes')
export class Pipes extends Component {
    //--------------------------------------------------------------------------
    // Serialized Dynamics
    //--------------------------------------------------------------------------

    /** @en Superior (Top) pipe node @kr 상단 장애물 노드 @jp 上部の障害物ノード */
    @property({ type: Node, visible: true, tooltip: "Superior pipe node" })
    private _superiorPipe: Node = null;

    /** @en Inferior (Bottom) pipe node @kr 하단 장애물 노드 @jp 下部の障害物ノード */
    @property({ type: Node, visible: true, tooltip: "Inferior pipe node" })
    private _inferiorPipe: Node = null;

    //--------------------------------------------------------------------------
    // Private State & Runtime Caches
    //--------------------------------------------------------------------------

    /** @en Flag to prevent duplicate scoring @kr 점수 중복 획득 방지 플래그 @jp スコアの重複獲得防止フラグ */
    private _isScoringRegistered: boolean = false;

    /** @en Callback to return to pool when lifecycle ends @kr 수명을 다했을 때 스포너로 돌아가기 위한 콜백 @jp 寿命が尽きた時にスポナーに戻るためのコールバック */
    private _onLifecycleEndCallback: (node: Node) => void = null;

    /** @en Vector cache for position calculations (Zero-GC) @kr 위치 계산용 벡터 캐시 @jp 位置計算用ベクトルキャッシュ */
    private _localTranslationCache: Vec3 = new Vec3();

    //--------------------------------------------------------------------------
    // Internal API
    //--------------------------------------------------------------------------

    /**
     * @en Called by the spawner when the obstacle is placed in the world.
     * @kr 장애물이 월드에 배치될 때 스포너에 의해 호출됩니다.
     * @jp 障害物がワールドに配置される際、スポナーによって呼び出されます。
     * @param onLifecycleEnd 
     * @en Callback for recycling back to pool @kr 풀로 회수하기 위한 콜백 @jp プール回収用コールバック
     */
    public initialize(onLifecycleEnd: (node: Node) => void) {
        this._isScoringRegistered = false;
        this._onLifecycleEndCallback = onLifecycleEnd;

        // @en Randomize pipe gap and position immediately after creation @kr 생성 직후 파이프 간격 및 위치 랜덤화 수행 @jp 生成直後にパイプの間隔と位置をランダム化
        this.executePassageRandomization();
    }

    /** 
     * @en Geometrically recalculates pipe gaps, center heights, and horizontal staggering. 
     * @kr 상/하 파이프의 간격과 중심 높이, 그리고 수평 어긋남을 재계산합니다.
     * @jp 上下パイプの間隔、中心の高さ、および水平方向のずれを幾何学的に再計算します。
     */
    private executePassageRandomization() {
        if (!this._superiorPipe || this._inferiorPipe === null) return;

        // 1. @en Calculate vertical passage data (based on config constants) @kr 수직 통로 데이터 산출 @jp 垂直通路データの算出
        const centerVerticalOffset = math.randomRange(GameConfig.PIPE_OFFSET_MIN, GameConfig.PIPE_OFFSET_MAX);
        const currentPassageGap = math.randomRange(GameConfig.PIPE_GAP_MIN, GameConfig.PIPE_GAP_MAX);
        const halfGapHeight = currentPassageGap * 0.5;

        // 2. @en Calculate horizontal dynamics (bias + stagger between top/bottom) @kr 수평 데이터 산출 @jp 水平データの算出
        const baseHorizontalOffset = math.randomRange(-GameConfig.PIPE_HORIZONTAL_VARIATION_MAX, GameConfig.PIPE_HORIZONTAL_VARIATION_MAX);
        const staggerOffset = math.randomRange(-GameConfig.PIPE_HORIZONTAL_STAGGER_MAX, GameConfig.PIPE_HORIZONTAL_STAGGER_MAX);

        const superiorBoundaryY = centerVerticalOffset + halfGapHeight;
        const inferiorBoundaryY = centerVerticalOffset - halfGapHeight;

        // 3. @en Align superior pipe (including X-position correction for anchor points) @kr 상단 파이프 정렬 @jp 上部パイプの整列
        const superiorUI = this._superiorPipe.getComponent(UITransform);
        if (superiorUI) {
            const anchorCorrectedX = (0.5 - superiorUI.anchorX) * superiorUI.width * this._superiorPipe.scale.x;
            const finalX = anchorCorrectedX + baseHorizontalOffset + (staggerOffset * 0.5);
            this._superiorPipe.setPosition(finalX, superiorBoundaryY, 0);
        }

        // 4. @en Align inferior pipe @kr 하단 파이프 정렬 @jp 下部パイプの整列
        const inferiorUI = this._inferiorPipe.getComponent(UITransform);
        if (inferiorUI) {
            const anchorCorrectedX = (0.5 - inferiorUI.anchorX) * inferiorUI.width * this._inferiorPipe.scale.x;
            const absolutePipeHeight = inferiorUI.height * this._inferiorPipe.scale.y;
            const finalX = anchorCorrectedX + baseHorizontalOffset - (staggerOffset * 0.5);

            // @en Adjust vertical position by full height so top of pipe matches gap boundary @kr 파이프 상단이 통로 높이에 맞춰지도록 조절 @jp パイプの上端が通路の境界に合うように垂直位置を調整
            this._inferiorPipe.setPosition(finalX, inferiorBoundaryY - absolutePipeHeight, 0);
        }
    }

    /** @en Frame-based translation and visibility checks @kr 매 프레임 이동 및 가시거리 체크 @jp 毎フレームの移動と可視判定チェック */
    update(dt: number) {
        // @en Move only when the game is active @kr 게임 진행 중일 때만 이동 @jp ゲーム進行中のみ移動
        if (!GameManager.instance || GameManager.instance.currentGameState !== GameState.ACTIVE) return;

        // 1. @en Horizontal translation (using dynamic speed from GameManager) @kr 수평 이동 처리 @jp 水平移動処理
        this.node.getPosition(this._localTranslationCache);
        this._localTranslationCache.x -= GameManager.instance.currentObstacleSpeed * dt;
        this.node.setPosition(this._localTranslationCache);

        // 2. @en Scoring trigger check (crossing the center line) @kr 득점 트리거 체크 @jp スコア獲得トリガーのチェック
        if (!this._isScoringRegistered && this._localTranslationCache.x < 0) {
            this._isScoringRegistered = true;
            GameManager.instance.registerScoreIncrement(1);
        }

        // 3. @en Out-of-bounds check (recycle if far enough) @kr 가시 영역 이탈 판단 @jp 画面外脱出判定
        if (this._localTranslationCache.x < -1200) {
            this.dispatchRecycleSequence();
        }
    }

    private dispatchRecycleSequence() {
        if (this._onLifecycleEndCallback) {
            this._onLifecycleEndCallback(this.node);
        }
    }
}
