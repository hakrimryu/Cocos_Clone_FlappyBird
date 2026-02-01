/**
 * GameConfig
 * 
 * [Unity Perspective]
 * 유니티의 ScriptableObject 또는 Static Class와 유사한 역할을 합니다.
 * 인스펙터에서의 수치 조작 실수를 방지하기 위해 모든 기획 수치를 정적(Static) 상수로 관리합니다.
 */
export class GameConfig {
    //--------------------------------------------------------------------------
    // World & Physics Constants (월드 및 물리 설정)
    //--------------------------------------------------------------------------

    /** 배경 및 바닥이 좌측으로 이동하는 기본 속도 */
    public static readonly WORLD_SCROLL_VELOCITY: number = 300;

    /** 장애물(파이프)이 좌측으로 이동하는 기본 속도 */
    public static readonly OBSTACLE_LATERAL_SPEED: number = 200;

    //--------------------------------------------------------------------------
    // Navigator (Player) Constants (플레이어 설정)
    //--------------------------------------------------------------------------

    /** 점프 시 적용되는 즉각적인 힘의 크기 (유니티의 Rigidbody2D.AddForce(Impulse)와 유사) */
    public static readonly LEAP_IMPULSE_MAGNITUDE: number = 8;

    /** 플레이어의 속도 변화에 따른 회전 부드러움 정도 (Lerp 가중치) */
    public static readonly ROTATION_INTERPOLATION_WEIGHT: number = 5;

    /** 상승 중일 때 머리가 들리는 최대 각도 */
    public static readonly MAX_ASCENT_DEGREES: number = 25;

    /** 하강 중일 때 머리가 숙여지는 최대 각도 */
    public static readonly MAX_DESCENT_DEGREES: number = -60;

    //--------------------------------------------------------------------------
    // Obstacle (Pipes) Constants (장애물 설정)
    //--------------------------------------------------------------------------

    /** 장애물이 생성되는 시간 간격(초) */
    public static readonly PIPE_SPAWN_INTERVAL: number = 1.6;

    /** 상하 파이프 사이의 통로 높이 최소값 */
    public static readonly PIPE_GAP_MIN: number = 200;

    /** 상하 파이프 사이의 통로 높이 최대값 */
    public static readonly PIPE_GAP_MAX: number = 280;

    /** 파이프 통로가 상하로 흔들리는 범위 (최소 오프셋) */
    public static readonly PIPE_OFFSET_MIN: number = -120;

    /** 파이프 통로가 상하로 흔들리는 범위 (최대 오프셋) */
    public static readonly PIPE_OFFSET_MAX: number = 120;

    /** 파이프 쌍 자체가 좌우로 배치될 수 있는 무작위 편차 */
    public static readonly PIPE_HORIZONTAL_VARIATION_MAX: number = 40;

    /** 위 파이프와 아래 파이프가 서로 좌우로 어긋나 있는 정도 (지그재그 난이도) */
    public static readonly PIPE_HORIZONTAL_STAGGER_MAX: number = 25;

    /** 장애물이 최초 생성되어 대기하는 우측 끝 X 좌표 */
    public static readonly SPAWN_ORIGIN_X: number = 600;

    /** 오브젝트 풀링(Object Pooling)을 위해 초기 생성해둘 노드 개수 */
    public static readonly PREWARM_POOL_CAPACITY: number = 5;

    /** 메모리 안전을 위해 월드에 동시에 존재할 수 있는 최대 장애물 개수 */
    public static readonly MAX_ACTIVE_OBSTACLES: number = 10;

    //--------------------------------------------------------------------------
    // System & Persistence Constants (시스템 및 저장 설정)
    //--------------------------------------------------------------------------

    /** 하이스코어 저장을 위한 로컬 스토리지 키 */
    public static readonly STORAGE_KEY_BEST_RECORD: string = 'PJ_FLAPPY_BIRD_BEST_RECORD';

    //--------------------------------------------------------------------------
    // Difficulty Scaling (Progressive Challenge) (난이도 자동 상승 설정)
    //--------------------------------------------------------------------------

    /** 점수가 높을수록 증가할 수 있는 최대 속도 배율 (1.8배) */
    public static readonly MAX_SPEED_MULTIPLIER: number = 1.8;

    /** 난이도가 최대치(MAX_SPEED_MULTIPLIER)에 도달하는 점수 기준 */
    public static readonly DIFFICULTY_SCORE_CAP: number = 100;
}
