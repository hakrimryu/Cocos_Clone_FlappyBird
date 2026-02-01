import { _decorator, Component, Node, Prefab, NodePool, instantiate, Vec3 } from 'cc';
import { Pipes } from './Pipes';
import { GameManager, GameEventSymbols } from './GameManager';
import { GameConfig } from './GameConfig';

const { ccclass, property } = _decorator;

/**
 * PipeSpawner
 * 장애물을 주기적으로 생성하고 풀링(Pooling)하는 컴포넌트입니다.
 * 
 * [Unity Perspective]
 * 유니티의 Object Pooling 기법이 적용된 프리팹 스포너와 같습니다.
 * 런타임 성능을 위해 노드(GameObject)를 새로 생성하는 대신 미리 준비된 풀에서 꺼내 씁니다.
 */
@ccclass('PipeSpawner')
export class PipeSpawner extends Component {
    //--------------------------------------------------------------------------
    // Serialized Configuration (인스펙터 노출 변수)
    //--------------------------------------------------------------------------

    /** 화면에 생성할 장애물 프리팹 (유니티의 Prefab과 동일) */
    @property({ type: Prefab, visible: true, tooltip: "재사용될 파이프 프리팹" })
    private _obstacleBlueprint: Prefab = null;

    //--------------------------------------------------------------------------
    // Internal Runtime Buffers
    //--------------------------------------------------------------------------

    /** 장애물을 관리하는 오브젝트 풀 */
    private _obstacleNodePool: NodePool = null;

    /** 다음 스폰까지 남은 시간을 측정하는 타이머 */
    private _cycleStopwatch: number = 0;

    /** 장애물 생성이 활성화된 상태인가? */
    private _isGenerationActive: boolean = false;

    /** 생성된 장애물이 처음 배치될 우측 끝 원점 좌표 */
    private _originPointCache: Vec3 = new Vec3(GameConfig.SPAWN_ORIGIN_X, 0, 0);

    //--------------------------------------------------------------------------
    // Life Cycle Methods
    //--------------------------------------------------------------------------

    onLoad() {
        this.initializeLifecycleEngine();
        this.subscribeToMessagingBus();
    }

    /** 스크립트가 파괴될 때 메모리 정리 */
    onDestroy() {
        this.unsubscribeFromMessagingBus();
        this.purgeActiveObstacles();

        if (this._obstacleNodePool) {
            this._obstacleNodePool.clear();
        }
    }

    /** 매 프레임 스폰 타이머를 업데이트 (유니티의 Update) */
    update(dt: number) {
        if (!this._isGenerationActive) return;

        this._cycleStopwatch += dt;

        // GameManager에서 현재 점수에 따라 가변적으로 제공하는 스폰 간격을 체크합니다.
        if (this._cycleStopwatch >= GameManager.instance.currentSpawnInterval) {
            this._cycleStopwatch = 0;
            this.executeAtomicGeneration();
        }
    }

    //--------------------------------------------------------------------------
    // Initialization & Event Binding (초기화 및 메시지 구독)
    //--------------------------------------------------------------------------

    private initializeLifecycleEngine() {
        // 코코스 크리에이터 전용 NodePool 초기화
        this._obstacleNodePool = new NodePool();

        // [Prewarm] 게임 시작 전 미리 몇 개를 생성해두어 스파이크 현상 방지
        for (let i = 0; i < GameConfig.PREWARM_POOL_CAPACITY; i++) {
            if (this._obstacleBlueprint) {
                const node = instantiate(this._obstacleBlueprint);
                this._obstacleNodePool.put(node);
            }
        }
    }

    /** 게임 내부의 전역 이벤트를 수신하기 위한 리스너 등록 */
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
    // Internal Sequence Handlers (내부 처리)
    //--------------------------------------------------------------------------

    private activateGenerationSequence() {
        this._isGenerationActive = true;
        // 즉시 첫 장애물이 나오도록 스톱워치를 주기값으로 설정
        this._cycleStopwatch = GameManager.instance.currentSpawnInterval;
    }

    private deactivateGenerationSequence() {
        this._isGenerationActive = false;
    }

    /** 현재 월드에 배치된 모든 장애물을 풀(Pool)로 강제 회수합니다. (유니티의SetActive(false)와 유사) */
    private purgeActiveObstacles() {
        this.deactivateGenerationSequence();
        this._cycleStopwatch = 0;

        const activeChildren = this.node.children;
        // 배열을 뒤에서부터 순회하며 회수 (안정성)
        for (let i = activeChildren.length - 1; i >= 0; i--) {
            this._obstacleNodePool.put(activeChildren[i]);
        }
    }

    /** 실제로 장애물을 생성하거나 풀에서 꺼내어 배치하는 핵심 함수 */
    private executeAtomicGeneration() {
        if (!this._obstacleBlueprint) return;

        // [Safety Guard] 월드에 너무 많은 장애물이 생기지 않도록 제한
        if (this.node.children.length >= GameConfig.MAX_ACTIVE_OBSTACLES) {
            return;
        }

        let node: Node = null;
        if (this._obstacleNodePool.size() > 0) {
            // 풀에 여유가 있다면 재사용
            node = this._obstacleNodePool.get();
        } else {
            // 여유가 없다면 새로 생성 (Instantiate)
            node = instantiate(this._obstacleBlueprint);
        }

        // [Atomic Initialization Sequence] (원자적 초기화 순서)
        node.active = false;
        node.setPosition(this._originPointCache);

        // 파이프 컴포넌트를 가져와서 내부 랜덤화 실행
        const pipesComponent = node.getComponent(Pipes);
        if (pipesComponent) {
            pipesComponent.initialize((target) => {
                // 화면 밖으로 나갔을 때 호출될 콜백 지정
                this._obstacleNodePool.put(target);
            });
        }

        // 노드가 아직 부모 노드에 연결되어 있지 않다면 추가
        if (!node.parent) {
            this.node.addChild(node);
        }
        node.active = true;
    }
}
