import {
  useState,
  useCallback,
  type ReactNode,
  type DragEvent,
} from 'react'
import { useRobotStore } from '@entities/robot'
import { useURDFLoader } from '../lib/useURDFLoader'
import { WizardStepUrdf } from './WizardStepUrdf'
import { WizardStepMeshes } from './WizardStepMeshes'
import styles from './UploadWizard.module.css'

type WizardStep = 1 | 2

/**
 * 2단계 업로드 위자드.
 * Step 1: URDF/XACRO 파일 업로드
 * Step 2: 메시 파일 추가 및 로봇 로드
 *
 * 폴더를 업로드하면 URDF + 메시를 자동 감지하여
 * 모든 메시가 해석되면 바로 로봇을 로드한다.
 */
export function UploadWizard(): ReactNode {
  const [step, setStep] = useState<WizardStep>(1)
  const [isDragging, setIsDragging] = useState(false)

  const isLoading = useRobotStore((s) => s.isLoading)
  const error = useRobotStore((s) => s.error)
  const meshReferences = useRobotStore((s) => s.meshReferences)
  const xacroIncludes = useRobotStore((s) => s.xacroIncludes)

  const {
    parseUrdfFile,
    parseUrdfFromDrop,
    addMeshFiles,
    addMeshFilesFromDrop,
    buildRobot,
    clearRobot,
  } = useURDFLoader()

  /**
   * Step 1에서 URDF 파일을 선택했을 때.
   * 모든 메시가 해석되면 바로 로봇을 로드한다.
   */
  const handleUrdfFileSelect = useCallback(
    async (files: FileList) => {
      const allResolved = await parseUrdfFile(files)
      if (allResolved) {
        buildRobot()
      } else {
        setStep(2)
      }
    },
    [parseUrdfFile, buildRobot],
  )

  /**
   * Step 1에서 폴더를 선택했을 때.
   * 폴더 안의 URDF + 메시를 자동 감지한다.
   */
  const handleFolderSelect = useCallback(
    async (files: FileList) => {
      const allResolved = await parseUrdfFile(files)
      if (allResolved) {
        buildRobot()
      } else {
        setStep(2)
      }
    },
    [parseUrdfFile, buildRobot],
  )

  /**
   * Step 2에서 메시 파일을 추가했을 때.
   */
  const handleAddMeshFiles = useCallback(
    async (files: FileList) => {
      await addMeshFiles(files)
    },
    [addMeshFiles],
  )

  /**
   * Step 2에서 메시 폴더를 추가했을 때.
   */
  const handleAddMeshFolder = useCallback(
    async (files: FileList) => {
      await addMeshFiles(files)
    },
    [addMeshFiles],
  )

  /**
   * Step 2에서 "Back" 버튼 — 전체 초기화 후 Step 1로 돌아간다.
   */
  const handleBack = useCallback(() => {
    clearRobot()
    setStep(1)
  }, [clearRobot])

  // -- 드래그 앤 드롭 핸들러 --

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const target = e.currentTarget
    const related = e.relatedTarget as Node | null
    if (!related || !target.contains(related)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const { items, files } = e.dataTransfer

      if (step === 1) {
        // Step 1: 드롭된 파일에서 URDF를 찾아 파싱
        const firstEntry =
          items.length > 0 ? items[0].webkitGetAsEntry?.() : null
        if (firstEntry) {
          const allResolved = await parseUrdfFromDrop(items)
          if (allResolved) {
            buildRobot()
          } else {
            setStep(2)
          }
          return
        }

        // 일반 파일 드롭 폴백
        if (files.length > 0) {
          const allResolved = await parseUrdfFile(files)
          if (allResolved) {
            buildRobot()
          } else {
            setStep(2)
          }
        }
      } else {
        // Step 2: 드롭된 파일을 메시로 추가
        const firstEntry =
          items.length > 0 ? items[0].webkitGetAsEntry?.() : null
        if (firstEntry) {
          // 폴더 드롭 — 재귀 탐색하여 메시 파일 수집
          await addMeshFilesFromDrop(items)
        } else if (files.length > 0) {
          await addMeshFiles(files)
        }
      }
    },
    [step, parseUrdfFromDrop, parseUrdfFile, addMeshFiles, addMeshFilesFromDrop, buildRobot],
  )

  const wizardClass = [
    styles.wizard,
    isDragging ? styles.wizardDragging : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={styles.overlay}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={wizardClass}>
        {isLoading ? (
          <LoadingIndicator />
        ) : (
          <>
            {/* 스텝 인디케이터 */}
            <StepIndicator currentStep={step} />

            {/* 스텝 컨텐츠 */}
            {step === 1 && (
              <WizardStepUrdf
                onFileSelect={handleUrdfFileSelect}
                onFolderSelect={handleFolderSelect}
              />
            )}
            {step === 2 && (
              <WizardStepMeshes
                meshReferences={meshReferences}
                xacroIncludes={xacroIncludes}
                onAddFiles={handleAddMeshFiles}
                onAddFolder={handleAddMeshFolder}
                onBuildRobot={buildRobot}
                onBack={handleBack}
              />
            )}

            {/* 에러 메시지 */}
            {error && <p className={styles.error}>{error}</p>}
          </>
        )}
      </div>
    </div>
  )
}

/** 로딩 중 표시 */
function LoadingIndicator(): ReactNode {
  return (
    <div className={styles.loadingContainer}>
      <div className={styles.spinner} />
      <p className={styles.loadingText}>Processing files...</p>
    </div>
  )
}

/** 2단계 스텝 인디케이터 */
function StepIndicator({
  currentStep,
}: {
  currentStep: WizardStep
}): ReactNode {
  const dot1Class = [
    styles.stepDot,
    currentStep === 1
      ? styles.stepDotActive
      : styles.stepDotCompleted,
  ].join(' ')

  const dot2Class = [
    styles.stepDot,
    currentStep === 2 ? styles.stepDotActive : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.stepIndicator}>
      <span className={dot1Class} />
      <span className={styles.stepConnector} />
      <span className={dot2Class} />
    </div>
  )
}
