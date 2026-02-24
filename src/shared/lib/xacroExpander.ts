import { XacroParser } from 'xacro-parser'
import type { FileMap } from '@shared/types'

/**
 * FileMap에서 주어진 경로에 매칭되는 Blob URL을 찾는다.
 * urdfParser의 resolveMeshUrl과 유사한 4단계 매칭 전략을 사용한다.
 */
function resolveFileUrl(path: string, fileMap: FileMap): string | null {
  // 1. 정확히 일치
  if (fileMap.has(path)) return fileMap.get(path)!

  // package:// 프로토콜 제거 후 다양한 경로 조합 시도
  let normalized = path

  if (normalized.startsWith('package://')) {
    normalized = normalized.replace(/^package:\/\//, '')
    // 패키지명 제거: "패키지명/경로" -> "경로"
    const slashIdx = normalized.indexOf('/')
    if (slashIdx !== -1) {
      normalized = normalized.substring(slashIdx + 1)
    }
  }

  // "./" 접두사 제거
  normalized = normalized.replace(/^\.\//, '')

  // 2. 정규화된 경로로 정확히 일치
  if (fileMap.has(normalized)) return fileMap.get(normalized)!

  // 3. fileMap 키들의 접미사(suffix) 매칭
  for (const [key, value] of fileMap) {
    if (key.endsWith(normalized) || key.endsWith(`/${normalized}`)) {
      return value
    }
  }

  // 4. 파일명만으로 매칭 (최후의 수단)
  const fileName = normalized.split('/').pop()
  if (fileName) {
    for (const [key, value] of fileMap) {
      const keyFileName = key.split('/').pop()
      if (keyFileName === fileName) {
        return value
      }
    }
  }

  return null
}

/**
 * XACRO XML을 일반 URDF XML로 확장한다.
 * xacro:include 파일은 FileMap에서 해석한다.
 */
export async function expandXacro(
  xacroContent: string,
  fileMap: FileMap,
): Promise<string> {
  const parser = new XacroParser()
  parser.localProperties = true
  parser.requirePrefix = true
  parser.inOrder = true

  // xacro:include 파일을 FileMap에서 가져오는 커스텀 구현
  parser.getFileContents = async (path: string): Promise<string> => {
    const resolvedUrl = resolveFileUrl(path, fileMap)

    if (!resolvedUrl) {
      throw new Error(
        `XACRO include file not found: "${path}". ` +
          'Make sure all referenced files are included in the upload.',
      )
    }

    // Blob URL을 fetch하여 텍스트로 반환
    const response = await fetch(resolvedUrl)
    if (!response.ok) {
      throw new Error(
        `Failed to fetch XACRO include file: "${path}" (status ${String(response.status)})`,
      )
    }
    return response.text()
  }

  const result = await parser.parse(xacroContent)

  // XMLDocument를 string으로 직렬화
  const serializer = new XMLSerializer()
  return serializer.serializeToString(result)
}
