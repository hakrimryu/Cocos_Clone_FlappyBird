/**
 * @en
 * Interface abstraction for the player character.
 * Enables loose coupling by allowing GameManager to reference this interface instead of a specific class.
 * 
 * @kr
 * 인터페이스(Interface)를 활용한 추상화 구조입니다.
 * 플레이어 캐릭터가 바뀌더라도 매니저 코드를 수정할 필요가 없도록 설계되었습니다 (Loose Coupling).
 * 
 * @jp
 * プレイヤーキャラクターの抽象化インターフェースです。
 * GameManagerが具体的なクラスの代わりにこのインターフェースを参照することで、
 * キャラクターが変更されてもマネージャーのコードを修正する必要がない疎結合な構造を実現します。
 */
export interface INavigator {
    /** 
     * @en Commands the entity to fly/jump (e.g., called on touch or spacebar input)
     * @kr 기체에 비행(상승) 명령을 내립니다. (예: 터치나 스페이스바 입력 시 호출)
     * @jp 機体に飛行（上昇）コマンドを送信します（例：タッチやスペースキー入力時に呼び出し）。
     */
    fly(): void;

    /** 
     * @en Resets the navigator's position and physical state to their initial values
     * @kr 플레이어 상태를 초기 초기 위치 및 물리 상태로 리셋합니다. 
     * @jp ナビゲーターの位置と物理状態を初期値にリセットします。
     */
    resetNavigatorState(): void;

    /**
     * @en Whether the player has hit an obstacle or the ground causing game over
     * @kr 플레이어가 장애물이나 땅에 부딪혀 게임오버 판단이 내려졌는지 여부
     * @jp プレイヤーが障害物や地面に衝突し、ゲームオーバーと判定されたかどうか
     */
    isTerminationTriggered: boolean;
}
