/**
 * @en
 * Manages game design constants as static values to prevent misconfiguration.
 * Acts as a centralized configuration class similar to ScriptableObject or a Static Class in Unity.
 * 
 * @kr
 * 인스펙터에서의 수치 조작 실수를 방지하기 위해 모든 기획 수치를 정적(Static) 상수로 관리합니다.
 * 유니티의 ScriptableObject 또는 Static Class와 유사한 역할을 합니다.
 * 
 * @jp
 * インスペクターでの数値操作ミスを防ぐため、すべての企画数値を静的（Static）定数として管理します。
 * UnityのScriptableObjectやStatic Classと同様の役割を果たします。
 */
export class GameConfig {
    //--------------------------------------------------------------------------
    // World & Physics Constants
    //--------------------------------------------------------------------------

    /** 
     * @en Base velocity for background and ground scrolling to the left
     * @kr 배경 및 바닥이 좌측으로 이동하는 기본 속도
     * @jp 背景と地面が左に移動する基本速度
     */
    public static readonly WORLD_SCROLL_VELOCITY: number = 300;

    /** 
     * @en Base velocity for obstacles (pipes) moving to the left
     * @kr 장애물(파이프)이 좌측으로 이동하는 기본 속도
     * @jp 障害物（パイプ）が左に移動する基本速度
     */
    public static readonly OBSTACLE_LATERAL_SPEED: number = 200;

    //--------------------------------------------------------------------------
    // Navigator (Player) Constants
    //--------------------------------------------------------------------------

    /** 
     * @en Magnitude of the instantaneous force applied during a jump
     * @kr 점프 시 적용되는 즉각적인 힘의 크기
     * @jp ジャンプ時に適用される即座の力の大きさ
     */
    public static readonly LEAP_IMPULSE_MAGNITUDE: number = 8;

    /** 
     * @en Interpolation weight for smooth rotation based on velocity changes
     * @kr 플레이어의 속도 변화에 따른 회전 부드러움 정도 (Lerp 가중치)
     * @jp プレイヤーの速度変化に伴う回転の滑らかさ（Lerpの重み）
     */
    public static readonly ROTATION_INTERPOLATION_WEIGHT: number = 5;

    /** 
     * @en Maximum upward tilt angle during ascent
     * @kr 상승 중일 때 머리가 들리는 최대 각도
     * @jp 上昇中の頭の最大傾斜角度
     */
    public static readonly MAX_ASCENT_DEGREES: number = 25;

    /** 
     * @en Maximum downward tilt angle during descent
     * @kr 하강 중일 때 머리가 숙여지는 최대 각도
     * @jp 下落中の頭の最大傾斜角度
     */
    public static readonly MAX_DESCENT_DEGREES: number = -60;

    //--------------------------------------------------------------------------
    // Obstacle (Pipes) Constants
    //--------------------------------------------------------------------------

    /** 
     * @en Interval between obstacle spawning in seconds
     * @kr 장애물이 생성되는 시간 간격(초)
     * @jp 障害物が生成される時間間隔（秒）
     */
    public static readonly PIPE_SPAWN_INTERVAL: number = 1.6;

    /** 
     * @en Minimum height clearance between upper and lower pipes
     * @kr 상하 파이프 사이의 통로 높이 최소값
     * @jp 上下パイプ間の通路の高さの最小値
     */
    public static readonly PIPE_GAP_MIN: number = 200;

    /** 
     * @en Maximum height clearance between upper and lower pipes
     * @kr 상하 파이프 사이의 통로 높이 최대값
     * @jp 上下パイプ間の通路の高さの最大値
     */
    public static readonly PIPE_GAP_MAX: number = 280;

    /** 
     * @en Minimum vertical offset for the pipe gap
     * @kr 파이프 통로가 상하로 흔들리는 범위 (최소 오프셋)
     * @jp パイプ通路が上下に揺れる範囲（最小オフセット）
     */
    public static readonly PIPE_OFFSET_MIN: number = -120;

    /** 
     * @en Maximum vertical offset for the pipe gap
     * @kr 파이프 통로가 상하로 흔들리는 범위 (최대 오프셋)
     * @jp パイプ通路が上下に揺れる範囲（最大オフセット）
     */
    public static readonly PIPE_OFFSET_MAX: number = 120;

    /** 
     * @en Maximum horizontal variation for the overall pipe pair position
     * @kr 파이프 쌍 자체가 좌우로 배치될 수 있는 무작위 편차
     * @jp パイプペア自体が左右に配置されるランダムな偏差の最大値
     */
    public static readonly PIPE_HORIZONTAL_VARIATION_MAX: number = 40;

    /** 
     * @en Maximum horizontal misalignment between top and bottom pipes
     * @kr 위 파이프와 아래 파이프가 서로 좌우로 어긋나 있는 정도 (지그재그 난이도)
     * @jp 上下のパイプが左右にずれる程度の最大値
     */
    public static readonly PIPE_HORIZONTAL_STAGGER_MAX: number = 25;

    /** 
     * @en Right-hand X coordinate where obstacles initially spawn
     * @kr 장애물이 최초 생성되어 대기하는 우측 끝 X 좌표
     * @jp 障害物が最初に生成される右端のX座標
     */
    public static readonly SPAWN_ORIGIN_X: number = 600;

    /** 
     * @en Initial capacity for pre-warming the object pool
     * @kr 오브젝트 풀링(Object Pooling)을 위해 초기 생성해둘 노드 개수
     * @jp オブジェクトプーリングのために初期生成するノード数
     */
    public static readonly PREWARM_POOL_CAPACITY: number = 5;

    /** 
     * @en Maximum number of obstacles allowed to exist in the world simultaneously
     * @kr 메모리 안전을 위해 월드에 동시에 존재할 수 있는 최대 장애물 개수
     * @jp メモリ安全のため、ワールドに同時に存在できる最大障害物数
     */
    public static readonly MAX_ACTIVE_OBSTACLES: number = 10;

    //--------------------------------------------------------------------------
    // System & Persistence Constants
    //--------------------------------------------------------------------------

    /** 
     * @en Local storage key for persisting the high score
     * @kr 하이스코어 저장을 위한 로컬 스토리지 키
     * @jp ハイスコア保存用のローカルストレージキー
     */
    public static readonly STORAGE_KEY_BEST_RECORD: string = 'PJ_FLAPPY_BIRD_BEST_RECORD';

    //--------------------------------------------------------------------------
    // Difficulty Scaling
    //--------------------------------------------------------------------------

    /** 
     * @en Maximum speed multiplier as score increases
     * @kr 점수가 높을수록 증가할 수 있는 최대 속도 배율 (1.8배)
     * @jp スコアが高くなるほど増加する最大速度倍率（1.8倍）
     */
    public static readonly MAX_SPEED_MULTIPLIER: number = 1.8;

    /** 
     * @en Score threshold where the speed reaches its maximum multiplier
     * @kr 난이도가 최대치(MAX_SPEED_MULTIPLIER)에 도달하는 점수 기준
     * @jp 難易度が最大値に達するスコア基準
     */
    public static readonly DIFFICULTY_SCORE_CAP: number = 100;
}
