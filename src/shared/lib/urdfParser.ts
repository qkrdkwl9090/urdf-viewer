import {
  LoadingManager,
  MeshStandardMaterial,
  Object3D,
  type BufferGeometry,
} from 'three'
import URDFLoader from 'urdf-loader'
import type { URDFRobot } from 'urdf-loader'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import { Mesh } from 'three'
import type { FileMap } from '@shared/types'

/** STL 메시에 적용할 기본 재질 */
const DEFAULT_STL_MATERIAL = new MeshStandardMaterial({
  color: 0xb0b0b0,
  metalness: 0.4,
  roughness: 0.6,
})

/**
 * fileMap의 키들 중에서 주어진 meshUrl에 매칭되는 Blob URL을 찾는다.
 * 여러 전략을 순차적으로 시도한다.
 */
function resolveMeshUrl(meshUrl: string, fileMap: FileMap): string | null {
  // 1. 정확히 일치
  if (fileMap.has(meshUrl)) return fileMap.get(meshUrl)!

  // package:// 프리토콜 제거 후 다양한 경로 조합 시도
  let normalizedUrl = meshUrl

  // "package://패키지명/경로" -> "경로" (패키지명까지 제거)
  if (normalizedUrl.startsWith('package://')) {
    normalizedUrl = normalizedUrl.replace(/^package:\/\//, '')
    // 첫 번째 '/' 이후가 실제 경로 (패키지 이름 제거)
    const slashIdx = normalizedUrl.indexOf('/')
    if (slashIdx !== -1) {
      normalizedUrl = normalizedUrl.substring(slashIdx + 1)
    }
  }

  // "./" 접두사 제거
  normalizedUrl = normalizedUrl.replace(/^\.\//, '')

  // 2. 정규화된 경로로 정확히 일치
  if (fileMap.has(normalizedUrl)) return fileMap.get(normalizedUrl)!

  // 3. fileMap 키들의 접미사(suffix) 매칭
  //    예: fileMap 키가 "my_robot/meshes/link.stl"이고 normalizedUrl이 "meshes/link.stl"
  for (const [key, value] of fileMap) {
    if (key.endsWith(normalizedUrl) || key.endsWith(`/${normalizedUrl}`)) {
      return value
    }
  }

  // 4. 파일명만으로 매칭 (최후의 수단)
  const fileName = normalizedUrl.split('/').pop()
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
 * URDF XML 문자열과 FileMap을 받아 URDFRobot 객체를 생성한다.
 * 메시 로딩은 FileMap의 Blob URL을 통해 수행된다.
 */
export function parseURDF(urdfContent: string, fileMap: FileMap): URDFRobot {
  const manager = new LoadingManager()
  const loader = new URDFLoader(manager)

  // 경로 해석을 직접 처리하므로 빈 문자열로 설정
  loader.packages = ''
  loader.workingPath = ''
  loader.parseVisual = true
  loader.parseCollision = false

  // 커스텀 메시 로딩 콜백
  loader.loadMeshCb = (url, _manager, onLoad) => {
    const resolvedUrl = resolveMeshUrl(url, fileMap)

    if (!resolvedUrl) {
      // 메시를 찾지 못해도 빈 Object3D로 대체하여 로봇 스켈레톤은 유지
      console.warn(`Mesh not found: ${url}`)
      onLoad(new Object3D())
      return
    }

    const lowerUrl = url.toLowerCase()

    if (lowerUrl.endsWith('.stl')) {
      const stlLoader = new STLLoader()
      stlLoader.load(
        resolvedUrl,
        (geometry: BufferGeometry) => {
          const mesh = new Mesh(geometry, DEFAULT_STL_MATERIAL.clone())
          mesh.castShadow = true
          mesh.receiveShadow = true
          onLoad(mesh)
        },
        undefined,
        (err) => {
          console.warn(`Failed to load STL: ${url}`, err)
          onLoad(new Object3D())
        },
      )
    } else if (lowerUrl.endsWith('.dae')) {
      const colladaLoader = new ColladaLoader()
      colladaLoader.load(
        resolvedUrl,
        (collada) => {
          if (!collada) {
            console.warn(`ColladaLoader returned null for: ${url}`)
            onLoad(new Object3D())
            return
          }
          // Collada 파일은 자체 재질을 가지고 있으므로 그대로 사용
          onLoad(collada.scene)
        },
        undefined,
        (err) => {
          console.warn(`Failed to load DAE: ${url}`, err)
          onLoad(new Object3D())
        },
      )
    } else {
      // 지원하지 않는 메시 형식
      console.warn(`Unsupported mesh format: ${url}`)
      onLoad(new Object3D())
    }
  }

  try {
    return loader.parse(urdfContent)
  } catch (err: unknown) {
    // urdf-loader의 파싱 에러를 사용자 친화적 메시지로 래핑
    const detail =
      err instanceof Error ? err.message : 'Unknown parsing failure'
    throw new Error(`URDF parse error: ${detail}`)
  }
}
