import { useEffect } from 'react'
import { useViewerStore, useUIStore, useRobotStore } from '@entities/robot'

/**
 * 전역 키보드 단축키를 등록한다.
 * `?` 키로 단축키 모달을 열고, Esc로 닫는다.
 *
 * G — 그리드 토글        H — 카메라 리셋
 * A — 축 토글            R — 조인트 리셋
 * D — rad/deg 토글       L — Joint Limit 무시
 * P — 패널 토글          1/2/3 — 탭 전환
 * ? — 단축키 도움말
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent): void {
      // Esc → 모달 닫기
      if (e.key === 'Escape') {
        useUIStore.getState().closeShortcuts()
        useUIStore.getState().closeEditor()
        return
      }

      // input, textarea, contenteditable 요소에서는 무시
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      // 수정키가 눌린 경우 무시 (Ctrl/Cmd/Alt 조합은 브라우저 단축키)
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.key) {
        case '?':
          useUIStore.getState().toggleShortcuts()
          break
        case '1':
          useUIStore.getState().setActiveTab('joints')
          break
        case '2':
          useUIStore.getState().setActiveTab('model')
          break
        case '3':
          useUIStore.getState().setActiveTab('settings')
          break
        default:
          switch (e.key.toLowerCase()) {
            case 'g':
              useViewerStore.getState().toggleGrid()
              break
            case 'a':
              useViewerStore.getState().toggleAxes()
              break
            case 'h':
              useViewerStore.getState().requestCameraReset()
              break
            case 'r':
              useRobotStore.getState().resetJoints()
              break
            case 'd':
              useUIStore.getState().toggleAngleUnit()
              break
            case 'l':
              useUIStore.getState().toggleIgnoreLimits()
              break
            case 'p':
              useUIStore.getState().togglePanel()
              break
            case 'e':
              if (useRobotStore.getState().robotName !== null) {
                const { isEditorOpen, openEditor, closeEditor } = useUIStore.getState()
                isEditorOpen ? closeEditor() : openEditor()
              }
              break
          }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
