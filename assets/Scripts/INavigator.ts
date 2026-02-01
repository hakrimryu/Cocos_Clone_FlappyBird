/**
 * INavigator
 * 
 * [Unity Perspective]
 * 인터페이스(Interface)를 활용한 추상화 구조입니다.
 * GameManager가 구체적인 'Player' 클래스 대신 이 인터페이스를 참조함으로써, 
 * 플레이어 캐릭터가 바뀌더라도 매니저 코드를 수정할 필요가 없는 구조(Loose Coupling)를 만듭니다.
 */
export interface INavigator {
    /** 
     * 기체에 비행(상승) 명령을 내립니다. (예: 터치나 스페이스바 입력 시 호출)
     */
    fly(): void;

    /** 
     * 플레이어 상태를 초기 초기 위치 및 물리 상태로 리셋합니다. 
     */
    resetNavigatorState(): void;

    /**
     * 플레이어가 장애물이나 땅에 부딪혀 게임오버 판단이 내려졌는지 여부
     */
    isTerminationTriggered: boolean;
}
