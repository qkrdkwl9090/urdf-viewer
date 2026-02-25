import { XacroParser } from 'xacro-parser'
import type { FileMap, XacroIncludeReference } from '@shared/types'

/**
 * 경로에서 중복 세그먼트를 제거한다.
 * "./urdf/./urdf/file.xacro" → "urdf/file.xacro"
 * 선행 "./"와 중간의 "./" 세그먼트, 빈 세그먼트를 모두 정리한다.
 */
function normalizePath(path: string): string {
  return path
    .split('/')
    .filter((seg) => seg !== '' && seg !== '.')
    .join('/')
}

/**
 * FileMap에서 주어진 경로에 매칭되는 Blob URL을 찾는다.
 * urdfParser의 resolveMeshUrl과 유사한 4단계 매칭 전략을 사용한다.
 */
export function resolveFileUrl(path: string, fileMap: FileMap): string | null {
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

  // 경로 정규화: "./" 세그먼트, 빈 세그먼트 제거 ("./urdf/./urdf/file" → "urdf/file")
  normalized = normalizePath(normalized)

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
 * XACRO 표현식 내의 Python `**` 거듭제곱 연산자를 `pow()` 함수로 변환한다.
 * xacro-parser의 expr-eval이 `**`를 지원하지 않으므로 전처리가 필요하다.
 * "${(scaling_factor**3)*0.4}" → "${pow(scaling_factor,3)*0.4}"
 */
function rewriteExponentiation(content: string): string {
  // ${...} 표현식 블록을 찾아 내부의 ** 연산자를 pow()로 변환
  return content.replace(/\$\{([^}]+)\}/g, (_match, expr: string) => {
    const rewritten = rewriteExponentiationExpr(expr)
    return `\${${rewritten}}`
  })
}

/**
 * 단일 표현식 문자열에서 `a**b` 패턴을 `pow(a,b)`로 변환한다.
 * 괄호로 감싸인 피연산자도 처리한다.
 */
function rewriteExponentiationExpr(expr: string): string {
  // a**b 패턴을 반복 치환 (중첩 가능)
  // 좌변: 괄호 그룹 또는 식별자/숫자
  // 우변: 괄호 그룹 또는 식별자/숫자
  const pattern = /(\([^()]*\)|[\w.]+)\s*\*\*\s*(\([^()]*\)|[\w.]+)/
  let result = expr
  while (pattern.test(result)) {
    result = result.replace(pattern, 'pow($1,$2)')
  }
  return result
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
  // include된 파일의 property를 전역으로 접근 가능하게 설정 (ROS xacro 표준 동작)
  parser.localProperties = false
  // 접두사 없는 레거시 XACRO 요소도 인식 (<property>, <arg>, <macro> 등)
  parser.requirePrefix = false
  // 순서대로 처리 (xacro:arg 기본값 처리에 필요)
  parser.inOrder = true
  // $(find pkg) 명령 대응 — 브라우저에서는 패키지 시스템이 없으므로 빈 문자열로 대체
  // '.'을 반환하면 xacro-parser의 workingPath prepend와 결합 시 경로가 중복된다
  // 예: workingPath="./urdf/" + "./urdf/file" → "./urdf/./urdf/file"
  parser.rospackCommands = { find: () => '' }

  // xacro:include 파일을 FileMap에서 가져오는 커스텀 구현
  // xacro-parser가 workingPath를 prepend하므로 경로가 중복될 수 있다 (예: "./urdf/./urdf/file")
  parser.getFileContents = async (path: string): Promise<string> => {
    const cleanPath = normalizePath(path)
    const resolvedUrl = resolveFileUrl(cleanPath, fileMap)

    if (!resolvedUrl) {
      throw new Error(
        `XACRO include file not found: "${path}" (normalized: "${cleanPath}"). ` +
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
    const text = await response.text()
    // include된 파일에도 ** 연산자가 있을 수 있으므로 전처리
    return rewriteExponentiation(text)
  }

  // Python ** 연산자를 pow()로 전처리 (xacro-parser가 **를 지원하지 않음)
  const preprocessed = rewriteExponentiation(xacroContent)
  const result = await parser.parse(preprocessed)

  // XMLDocument를 string으로 직렬화
  const serializer = new XMLSerializer()
  return serializer.serializeToString(result)
}

/**
 * XACRO XML에서 xacro:include 참조를 추출하고 FileMap에서 해석 상태를 확인한다.
 * 확장 전 프리스캔용으로, 누락된 include 파일을 사전에 파악한다.
 */
export function extractXacroIncludes(
  xacroContent: string,
  fileMap: FileMap,
): XacroIncludeReference[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xacroContent, 'text/xml')

  // xacro:include 요소 검색 (네임스페이스 포함/미포함 모두)
  const includes = new Set<string>()

  const allElements = doc.getElementsByTagName('*')
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i]
    const localName = el.localName || el.nodeName.split(':').pop()
    if (localName === 'include' && el.nodeName.includes('xacro')) {
      const filename = el.getAttribute('filename')
      if (filename) {
        includes.add(filename)
      }
    }
  }

  return Array.from(includes).map((path) => ({
    path,
    resolved: resolveFileUrl(path, fileMap) !== null,
  }))
}
