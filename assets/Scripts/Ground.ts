import { _decorator, Component, Node, UITransform, Vec3 } from 'cc';
import { GameManager, GameState, GameEventSymbols } from './GameManager';
import { GameConfig } from './GameConfig';

const { ccclass, property } = _decorator;

/**
 * Ground
 * 배경(땅)을 무한히 순환하며 스크롤 시키는 컴포넌트입니다.
 * 
 * [Unity Perspective]
 * 배경 오브젝트를 여러 개 두고, 화면 밖으로 나가는 순간 다른 배경 뒤에 붙이는 '무한 루프 배경' 기법이 적용되어 있습니다.
 */
@ccclass('Ground')
export class Ground extends Component {
    //--------------------------------------------------------------------------
    // Serialized Scenery (인스펙터 노출 변수)
    //--------------------------------------------------------------------------

    /** 순환 배치될 배경 노드 배열 (유니티에서 배열에 여러 배경 노드를 넣는 것과 같음) */
    @property({ type: [Node], visible: true, tooltip: "순환 배치될 환경 노드 배열" })
    private _repetitiveSceneryNodes: Node[] = [];

    //--------------------------------------------------------------------------
    // Internal Topology & Caches
    //--------------------------------------------------------------------------

    /** 모든 배경 노드의 전체 가로 합 */
    private _loopingBoundaryWidth: number = 0;

    /** 각 배경 노드의 너비(Width)를 캐싱 */
    private _nodeExtentCache: number[] = [];

    /** [Zero-GC] 연산 속도와 메모리 절약을 위한 위치 연산용 벡터 캐시 */
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
        // [State Guard] 게임오버 상태에서는 배경 스크롤을 멈춰 연출적 몰입도를 높입니다.
        if (!GameManager.instance || GameManager.instance.currentGameState === GameState.TERMINATED) return;

        this.executeParallaxTranslation(dt);
    }

    //--------------------------------------------------------------------------
    // Layer Configuration (레이어 배치 및 동기화)
    //--------------------------------------------------------------------------

    /** 배경 노드들의 너비를 읽어 일렬로 정렬 배치합니다. */
    private constructParallaxLayer() {
        if (!this._repetitiveSceneryNodes || this._repetitiveSceneryNodes.length === 0) return;

        this._loopingBoundaryWidth = 0;
        this._nodeExtentCache = [];

        for (let i = 0; i < this._repetitiveSceneryNodes.length; i++) {
            const node = this._repetitiveSceneryNodes[i];
            const ui = node.getComponent(UITransform); // 유니티의 RectTransform 접근과 유사

            if (ui) {
                const width = ui.width;
                this._nodeExtentCache[i] = width;

                // 런타임에 빈틈없이 기차처럼 일렬 정렬
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
    // Translation Logic (이동 로직)
    //--------------------------------------------------------------------------

    /** 프레임마다 배경을 이동시키고, 화면 밖으로 나간 배경을 반대편으로 옮깁니다. */
    private executeParallaxTranslation(dt: number) {
        // GameManager에서 현재 점수와 난이도를 반영한 동적 스피드를 가져옵니다.
        const lateralStep = GameManager.instance.currentWorldSpeed * dt;

        for (let i = 0; i < this._repetitiveSceneryNodes.length; i++) {
            const node = this._repetitiveSceneryNodes[i];
            node.getPosition(this._localTranslationCache);

            // 1. 왼쪽 방향 이동
            this._localTranslationCache.x -= lateralStep;

            // 2. 가시 영역 이탈 검사 및 반대편 끝으로 Snap 재배치
            const extent = this._nodeExtentCache[i];
            if (this._localTranslationCache.x + extent <= 0) {
                // 단순히 0으로 세팅하지 않고 너비만큼 더해줌으로써 프레임 드랍 시에도 오차를 방지합니다.
                this._localTranslationCache.x += this._loopingBoundaryWidth;
            }

            node.setPosition(this._localTranslationCache);
        }
    }

    /** 세션 리셋(Restart) 시 모든 배경을 다시 원점으로 가지런히 정렬합니다. */
    private synchronizeInitialPlacement() {
        this.constructParallaxLayer();
    }
}
