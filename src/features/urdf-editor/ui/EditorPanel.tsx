import { useCallback, useRef, useEffect, useState, type ReactNode } from 'react'
import { Download, Play } from 'lucide-react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { xml } from '@codemirror/lang-xml'
import { oneDark } from '@codemirror/theme-one-dark'
import { useRobotStore } from '@entities/robot'
import { parseURDF } from '@shared/lib'
import { Button } from '@shared/ui'
import type { JointState, JointType, LinkState, URDFRobot } from '@shared/types'
import styles from './EditorPanel.module.css'

/** URDFRobot에서 조인트 상태 추출 (fixed 제외) */
function extractJoints(robot: URDFRobot): Map<string, JointState> {
  const joints = new Map<string, JointState>()
  for (const [name, joint] of Object.entries(robot.joints)) {
    if (joint.jointType === 'fixed') continue
    joints.set(name, {
      name,
      type: joint.jointType as JointType,
      value: joint.jointValue[0] ?? 0,
      min: joint.limit.lower,
      max: joint.limit.upper,
      axis: [joint.axis.x, joint.axis.y, joint.axis.z],
    })
  }
  return joints
}

/** URDFRobot에서 링크 상태 추출 */
function extractLinks(robot: URDFRobot): Map<string, LinkState> {
  const links = new Map<string, LinkState>()
  for (const name of Object.keys(robot.links)) {
    links.set(name, { name, visible: true })
  }
  return links
}

/** 에디터 내용을 .urdf 파일로 다운로드 */
function downloadUrdf(content: string, robotName: string | null): void {
  const filename = robotName ? `${robotName}.urdf` : 'robot.urdf'
  const blob = new Blob([content], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * URDF XML 코드 에디터 패널.
 * CodeMirror 6으로 URDF 소스를 편집하고 Apply로 3D에 반영,
 * Download로 파일 저장.
 */
export function EditorPanel(): ReactNode {
  const urdfContent = useRobotStore((s) => s.urdfContent)
  const robotName = useRobotStore((s) => s.robotName)
  const setUrdfContent = useRobotStore((s) => s.setUrdfContent)
  const setRobot = useRobotStore((s) => s.setRobot)
  const setLoading = useRobotStore((s) => s.setLoading)
  const setError = useRobotStore((s) => s.setError)

  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  // CodeMirror 에디터 마운트
  useEffect(() => {
    if (!editorRef.current || !urdfContent) return

    const state = EditorState.create({
      doc: urdfContent,
      extensions: [
        basicSetup,
        xml(),
        oneDark,
        EditorView.theme({
          '&': { height: '100%' },
        }),
      ],
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  // urdfContent가 바뀔 때 에디터 재생성 (로봇 교체 시)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urdfContent])

  // Apply: 에디터 내용으로 로봇 재빌드
  const handleApply = useCallback(() => {
    if (!viewRef.current) return

    const text = viewRef.current.state.doc.toString()
    const { fileMap } = useRobotStore.getState()

    setParseError(null)
    setLoading(true)
    setError(null)

    try {
      const robot = parseURDF(text, fileMap)
      const joints = extractJoints(robot)
      const links = extractLinks(robot)
      setUrdfContent(text)
      setRobot(robot.robotName || 'Unnamed Robot', robot, joints, links)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to parse URDF'
      setParseError(message)
      setError(message)
      setLoading(false)
    }
  }, [setUrdfContent, setRobot, setLoading, setError])

  // Download: 에디터 내용을 파일로 저장
  const handleDownload = useCallback(() => {
    if (!viewRef.current) return
    const text = viewRef.current.state.doc.toString()
    downloadUrdf(text, robotName)
  }, [robotName])

  if (!urdfContent) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyMessage}>
          Load a URDF file to edit its source
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Button variant="primary" size="sm" onClick={handleApply}>
          <Play size={14} />
          Apply
        </Button>
        <div className={styles.toolbarSpacer} />
        <Button variant="secondary" size="sm" onClick={handleDownload}>
          <Download size={14} />
          Download
        </Button>
      </div>

      {parseError && (
        <div style={{ color: 'var(--color-error)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
          {parseError}
        </div>
      )}

      <div ref={editorRef} className={styles.editorWrapper} />
    </div>
  )
}
