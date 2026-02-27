/** 샘플 로봇 타입 분류 */
export type SampleRobotType = 'arm' | 'mobile' | 'quadruped' | 'rover' | 'educational'

/** 샘플 로봇 정의 */
export interface SampleRobot {
  /** 고유 식별자 */
  id: string
  /** 표시 이름 */
  name: string
  /** 칩에 표시할 짧은 이름 (없으면 name 사용) */
  chipLabel: string
  /** 로봇 유형 (컬러 도트 결정) */
  type: SampleRobotType
  /** SPDX 라이선스 식별자 */
  license: string
  /** GitHub repo URL (fetchRepo에 전달) */
  repoUrl: string
}

/**
 * 라이선스가 검증된 샘플 로봇 목록.
 * 모두 BSD-3-Clause 또는 Apache-2.0 라이선스.
 * repoUrl은 서브디렉토리까지 지정하여 Trees API 응답 크기를 최소화한다.
 */
export const SAMPLE_ROBOTS: readonly SampleRobot[] = [
  {
    id: 'nasa-t12',
    name: 'NASA T12',
    chipLabel: 'T12',
    type: 'rover',
    license: 'Apache-2.0',
    repoUrl: 'https://github.com/gkjohnson/nasa-urdf-robots',
  },
  {
    id: 'ur5e',
    name: 'UR5e',
    chipLabel: 'UR5e',
    type: 'arm',
    license: 'BSD-3-Clause',
    repoUrl: 'https://github.com/ros-industrial/universal_robot/tree/melodic-devel/ur_description',
  },
  {
    id: 'unitree-go2',
    name: 'Unitree Go2',
    chipLabel: 'Go2',
    type: 'quadruped',
    license: 'BSD-3-Clause',
    repoUrl: 'https://github.com/unitreerobotics/unitree_ros/tree/master/robots/go2_description',
  },
]
