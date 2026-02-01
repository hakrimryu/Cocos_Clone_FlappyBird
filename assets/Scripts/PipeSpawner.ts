import { _decorator, Component, Node, Prefab, NodePool, instantiate, Vec3 } from 'cc';
import { Pipes } from './Pipes';
import { GameManager, GameEventSymbols } from './GameManager';
import { GameConfig } from './GameConfig';

const { ccclass, property } = _decorator;

/**
 * @en
 * Component that periodically spawns and pools obstacles (pipes).
 * Similar to a Prefab spawner using Object Pooling in Unity.
 * 
 * @kr
 * 장애물을 주기적으로 생성하고 풀링(Pooling)하는 컴포넌트입니다.
 * 런타임 성능을 위해 노드(GameObject)를 새로 생성하는 대신 미리 준비된 풀에서 꺼내 쓰는 Object Pooling 기법이 적용되었습니다.
 * 
 * @jp
 * 障害物を定期的に生成し、プーリング（Pooling）するコンポーネントです。
 * 実行時のパフォーマンス向上のため、ノード（GameObject）を新しく生成する代わりに、あらかじめ用意されたプールから取り出して使用するオブジェクトプーリング手法が適用されています。
 */
@ccclass('PipeSpawner')
export class PipeSpawner extends Component {
    //--------------------------------------------------------------------------
    // Serialized Configuration
    //--------------------------------------------------------------------------

    /** 
     * @en Obstacle prefab to be spawned (equivalent to Unity's Prefabs)
     * @kr 화면에 생성할 장애물 프리팹
     * @jp 画面に生成する障害物のプレハブ
     */
    @property({ type: Prefab, visible: true, tooltip: "Pipe prefab to be reused" })
    private _obstacleBlueprint: Prefab = null;

    //--------------------------------------------------------------------------
    // Internal Runtime Buffers
    //--------------------------------------------------------------------------

    /** 
     * @en Object pool for managing obstacles 
     * @kr 장애물을 관리하는 오브젝트 풀
     * @jp 障害物を管理するオブジェクトプール
     */
    private _obstacleNodePool: NodePool = null;

    /** 
     * @en Timer measuring time remaining until next spawn 
     * @kr 다음 스폰까지 남은 시간을 측정하는 타이머
     * @jp 次の生成までの残り時間を計測するタイマー
     */
    private _cycleStopwatch: number = 0;

    /** 
     * @en Whether obstacle generation is currently active 
     * @kr 장애물 생성이 활성화된 상태인가?
     * @jp 障害物の生成が有効な状態かどうか
     */
    private _isGenerationActive: boolean = false;

    /** 
     * @en Cached origin point (right edge) where obstacles are first placed 
     * @kr 생성된 장애물이 처음 배치될 우측 끝 원점 좌표
     * @jp 生成された障害物が最初に配置される右端の原点座標
     */
    private _originPointCache: Vec3 = new Vec3(GameConfig.SPAWN_ORIGIN_X, 0, 0);

    //--------------------------------------------------------------------------
    // Life Cycle Methods
    //--------------------------------------------------------------------------

    onLoad() {
        this.initializeLifecycleEngine();
        this.subscribeToMessagingBus();
    }

    /** 
     * @en Cleanup memory when the script is destroyed 
     * @kr 스크립트가 파괴될 때 메모리 정리
     * @jp スクリプトが破棄される際のメモリクリーンアップ
     */
    onDestroy() {
        this.unsubscribeFromMessagingBus();
        this.purgeActiveObstacles();

        if (this._obstacleNodePool) {
            this._obstacleNodePool.clear();
        }
    }

    /** 
     * @en Update spawn timer every frame 
     * @kr 매 프레임 스폰 타이머를 업데이트
     * @jp 毎フレーム生成タイマーを更新
     */
    update(dt: number) {
        if (!this._isGenerationActive) return;

        this._cycleStopwatch += dt;

        // @en Check spawn interval dynamically provided by GameManager @kr GameManager에서 제공하는 가변 스폰 간격 체크 @jp GameManagerから提供される可変生成間隔をチェック
        if (this._cycleStopwatch >= GameManager.instance.currentSpawnInterval) {
            this._cycleStopwatch = 0;
            this.executeAtomicGeneration();
        }
    }

    //--------------------------------------------------------------------------
    // Initialization & Event Binding
    //--------------------------------------------------------------------------

    private initializeLifecycleEngine() {
        // @en Initialize Cocos Creator specific NodePool @kr 코코스 크리에이터 전용 NodePool 초기화 @jp Cocos Creator専用のNodePoolを初期化
        this._obstacleNodePool = new NodePool();

        // @en [Prewarm] Prevent performance spikes by pre-creating nodes @kr 게임 시작 전 미리 노드를 생성해두어 스파이크 방지 @jp ゲーム開始前にノードを生成してスパイク現象を防止
        for (let i = 0; i < GameConfig.PREWARM_POOL_CAPACITY; i++) {
            if (this._obstacleBlueprint) {
                const node = instantiate(this._obstacleBlueprint);
                this._obstacleNodePool.put(node);
            }
        }
    }

    /** 
     * @en Register listeners for global game events 
     * @kr 게임 내부의 전역 이벤트를 수신하기 위한 리스너 등록
     * @jp ゲーム内のグローバルイベントを受信するためのリスナー登録
     */
    private subscribeToMessagingBus() {
        GameManager.messageBus.on(GameEventSymbols.SESSION_START, this.activateGenerationSequence, this);
        GameManager.messageBus.on(GameEventSymbols.SESSION_END, this.deactivateGenerationSequence, this);
        GameManager.messageBus.on(GameEventSymbols.SYSTEM_RESET, this.purgeActiveObstacles, this);
    }

    private unsubscribeFromMessagingBus() {
        GameManager.messageBus.off(GameEventSymbols.SESSION_START, this.activateGenerationSequence, this);
        GameManager.messageBus.off(GameEventSymbols.SESSION_END, this.deactivateGenerationSequence, this);
        GameManager.messageBus.off(GameEventSymbols.SYSTEM_RESET, this.purgeActiveObstacles, this);
    }

    //--------------------------------------------------------------------------
    // Internal Sequence Handlers
    //--------------------------------------------------------------------------

    private activateGenerationSequence() {
        this._isGenerationActive = true;
        // @en Set stopwatch to interval to spawn first obstacle immediately @kr 첫 장애물이 즉시 나오도록 간격값으로 설정 @jp 最初の障害物がすぐに出るように間隔値を設定
        this._cycleStopwatch = GameManager.instance.currentSpawnInterval;
    }

    private deactivateGenerationSequence() {
        this._isGenerationActive = false;
    }

    /** 
     * @en Forcefully return all active obstacles to the pool 
     * @kr 현재 월드에 배치된 모든 장애물을 풀(Pool)로 강제 회수합니다.
     * @jp 現在ワールドに配置されている全ての障害物をプールに強制回収します。
     */
    private purgeActiveObstacles() {
        this.deactivateGenerationSequence();
        this._cycleStopwatch = 0;

        const activeChildren = this.node.children;
        // @en Iterate and return from end of array for safety @kr 배열을 뒤에서부터 순회하며 회수 (안정성) @jp 安全のため配列を後ろから巡回して回収
        for (let i = activeChildren.length - 1; i >= 0; i--) {
            this._obstacleNodePool.put(activeChildren[i]);
        }
    }

    /** 
     * @en Core function to spawn or retrieve obstacles from the pool and place them 
     * @kr 실제로 장애물을 생성하거나 풀에서 꺼내어 배치하는 핵심 함수
     * @jp 実際に障害物を生成するか、プールから取り出して配置する主要関数
     */
    private executeAtomicGeneration() {
        if (!this._obstacleBlueprint) return;

        // @en [Safety Guard] Limit maximum obstacles in the world @kr 월드 내 최대 장애물 개수 제한 @jp ワールド内の最大障害物数を制限
        if (this.node.children.length >= GameConfig.MAX_ACTIVE_OBSTACLES) {
            return;
        }

        let node: Node = null;
        if (this._obstacleNodePool.size() > 0) {
            // @en Reuse if pool has available nodes @kr 풀에 여유가 있다면 재사용 @jp プールに空きがあれば再利用
            node = this._obstacleNodePool.get();
        } else {
            // @en Instantiate if pool is empty @kr 여유가 없다면 새로 생성 @jp 空きがなければ新規生成
            node = instantiate(this._obstacleBlueprint);
        }

        // [Atomic Initialization Sequence]
        node.active = false;
        node.setPosition(this._originPointCache);

        // @en Get Pipes component and execute internal randomization @kr Pipes 컴포넌트를 가져와서 내부 랜덤화 실행 @jp Pipesコンポーネントを取得して内部ランダム化を実行
        const pipesComponent = node.getComponent(Pipes);
        if (pipesComponent) {
            pipesComponent.initialize((target) => {
                // @en Callback to return to pool when off-screen @kr 화면 밖으로 나갔을 때 호출될 콜백 지정 @jp 画面外に出た時に呼び出されるコールバックを指定
                this._obstacleNodePool.put(target);
            });
        }

        // @en Add node as child if not already parented @kr 부모 노드에 연결되어 있지 않다면 추가 @jp 親ノードに接続されていない場合は追加
        if (!node.parent) {
            this.node.addChild(node);
        }
        node.active = true;
    }
}
