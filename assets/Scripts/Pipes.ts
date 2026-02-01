import { _decorator, Component, Node, Vec3, math, UITransform } from 'cc';
import { GameManager, GameState, GameEventSymbols } from './GameManager';
import { GameConfig } from './GameConfig';

const { ccclass, property } = _decorator;

/**
 * Pipes
 * 상단과 하단 파이프 한 쌍의 움직임과 각개 랜덤화를 처리하는 컴포넌트입니다.
 * 
 * [Unity Perspective]
 * 프리팹으로 관리되는 장애물 개별 개체입니다.
 * 내부에 상/하 파이프 노드를 자식으로 두고 있으며, 생성 시점에 통로의 폭과 수평/수직 위치를 랜덤하게 결정합니다.
 */
@ccclass('Pipes')
export class Pipes extends Component {
    //--------------------------------------------------------------------------
    // Serialized Dynamics (인스펙터 노출 변수)
    //--------------------------------------------------------------------------

    @property({ type: Node, visible: true, tooltip: "상단 장애물 노드" })
    private _superiorPipe: Node = null;

    @property({ type: Node, visible: true, tooltip: "하단 장애물 노드" })
    private _inferiorPipe: Node = null;

    //--------------------------------------------------------------------------
    // Private State & Runtime Caches
    //--------------------------------------------------------------------------

    /** 점수 중복 획득 방지 플래그 */
    private _isScoringRegistered: boolean = false;

    /** 수명을 다했을 때 스포너로 돌아가기 위한 콜백 */
    private _onLifecycleEndCallback: (node: Node) => void = null;

    /** [Zero-GC] 위치 계산을 위해 미리 생성해둔 벡터 캐시 (매 프레임 new Vec3() 호출 방지) */
    private _localTranslationCache: Vec3 = new Vec3();

    //--------------------------------------------------------------------------
    // Internal API (스포너가 호출하는 초기화)
    //--------------------------------------------------------------------------

    /**
     * 장애물이 월드에 배치될 때 스포너에 의해 호출됩니다.
     * @param onLifecycleEnd 화면 이탈 시 풀(Pool)로 회수하기 위한 콜백
     */
    public initialize(onLifecycleEnd: (node: Node) => void) {
        this._isScoringRegistered = false;
        this._onLifecycleEndCallback = onLifecycleEnd;

        // 생성 직후 파이프 간격 및 위치 랜덤화 수행
        this.executePassageRandomization();
    }

    /** 상/하 파이프의 간격과 중심 높이, 그리고 수평 어긋남을 기하학적으로 재계산합니다. */
    private executePassageRandomization() {
        if (!this._superiorPipe || this._inferiorPipe === null) return;

        // 1. 수직 통로 데이터 산출 (기획 상수 기반)
        const centerVerticalOffset = math.randomRange(GameConfig.PIPE_OFFSET_MIN, GameConfig.PIPE_OFFSET_MAX);
        const currentPassageGap = math.randomRange(GameConfig.PIPE_GAP_MIN, GameConfig.PIPE_GAP_MAX);
        const halfGapHeight = currentPassageGap * 0.5;

        // 2. 수평 다이나믹스 데이터 산출 (좌우 치우침 + 상하 파이프 간 어긋남)
        const baseHorizontalOffset = math.randomRange(-GameConfig.PIPE_HORIZONTAL_VARIATION_MAX, GameConfig.PIPE_HORIZONTAL_VARIATION_MAX);
        const staggerOffset = math.randomRange(-GameConfig.PIPE_HORIZONTAL_STAGGER_MAX, GameConfig.PIPE_HORIZONTAL_STAGGER_MAX);

        const superiorBoundaryY = centerVerticalOffset + halfGapHeight;
        const inferiorBoundaryY = centerVerticalOffset - halfGapHeight;

        // 3. 상단 파이프 정렬 (앵커 포인트를 고려한 X위치 보정 포함)
        const superiorUI = this._superiorPipe.getComponent(UITransform);
        if (superiorUI) {
            const anchorCorrectedX = (0.5 - superiorUI.anchorX) * superiorUI.width * this._superiorPipe.scale.x;
            const finalX = anchorCorrectedX + baseHorizontalOffset + (staggerOffset * 0.5);
            this._superiorPipe.setPosition(finalX, superiorBoundaryY, 0);
        }

        // 4. 하단 파이프 정렬
        const inferiorUI = this._inferiorPipe.getComponent(UITransform);
        if (inferiorUI) {
            const anchorCorrectedX = (0.5 - inferiorUI.anchorX) * inferiorUI.width * this._inferiorPipe.scale.x;
            const absolutePipeHeight = inferiorUI.height * this._inferiorPipe.scale.y;
            const finalX = anchorCorrectedX + baseHorizontalOffset - (staggerOffset * 0.5);

            // 파이프 상단이 통로 높이에 맞춰지도록 전체 높이만큼 수직 위치 조절
            this._inferiorPipe.setPosition(finalX, inferiorBoundaryY - absolutePipeHeight, 0);
        }
    }

    /** 매 프레임 이동 및 가시거리 체크 */
    update(dt: number) {
        // 게임 진행 중일 때만 이동
        if (!GameManager.instance || GameManager.instance.currentGameState !== GameState.ACTIVE) return;

        // 1. 수평 이동 처리 (GameManager가 제공하는 점수 연동형 동적 속도 사용)
        this.node.getPosition(this._localTranslationCache);
        this._localTranslationCache.x -= GameManager.instance.currentObstacleSpeed * dt;
        this.node.setPosition(this._localTranslationCache);

        // 2. 득점 트리거 체크 (중앙선을 통과하는지 확인)
        if (!this._isScoringRegistered && this._localTranslationCache.x < 0) {
            this._isScoringRegistered = true;
            GameManager.instance.registerScoreIncrement(1);
        }

        // 3. 가시 영역 이탈 판단 (충분히 멀어지면 풀로 회수)
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
