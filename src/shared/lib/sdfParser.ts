import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  Color,
  DirectionalLight,
  PointLight,
  SpotLight,
  AmbientLight,
  type BufferGeometry,
} from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader.js'
import type { FileMap, URDFRobot, MeshReference } from '@shared/types'
import { resolveMeshUrl } from './urdfParser'

/** SDF 메시와 호환되는 기본 재질 */
const DEFAULT_MATERIAL = new MeshStandardMaterial({
  color: 0x808080,
  metalness: 0.2,
  roughness: 0.8,
})

/**
 * SDF Pose 문자열 "x y z r p y"를 파싱한다.
 */
function parsePose(poseStr: string | null) {
  if (!poseStr) return { pos: [0, 0, 0], rot: [0, 0, 0] }
  const vals = poseStr.trim().split(/\s+/).map(Number)
  return {
    pos: [vals[0] || 0, vals[1] || 0, vals[2] || 0],
    rot: [vals[3] || 0, vals[4] || 0, vals[5] || 0],
  }
}

/**
 * SDF Color 문자열 "r g b a"를 파싱한다.
 */
function parseColor(colorStr: string | null) {
  if (!colorStr) return null
  const vals = colorStr.trim().split(/\s+/).map(Number)
  return new Color(vals[0] || 0, vals[1] || 0, vals[2] || 0)
}

/**
 * Three.js Object3D에 SDF Pose를 적용한다.
 */
function applyPose(obj: Object3D, poseStr: string | null) {
  const { pos, rot } = parsePose(poseStr)
  obj.position.set(pos[0], pos[1], pos[2])
  // SDF Euler angles are typically in radians, XYZ order
  obj.rotation.set(rot[0], rot[1], rot[2])
}

/**
 * SDF XML을 파싱하여 Three.js Object3D(URDFRobot 타입으로 캐스팅)를 생성한다.
 */
export async function parseSDF(
  sdfContent: string,
  fileMap: FileMap,
): Promise<URDFRobot> {
  console.log('parseSDF start')
  const parser = new DOMParser()
  const doc = parser.parseFromString(sdfContent, 'text/xml')
  const worldEl = doc.querySelector('world')
  const worldName = worldEl?.getAttribute('name') || 'SDF World'

  const root = new Group() as unknown as URDFRobot
  root.name = worldName
  // @ts-ignore - Adding URDFRobot specific properties
  root.robotName = worldName
  // @ts-ignore - Adding URDFRobot specific properties
  root.urdfName = worldName
  // @ts-ignore - Adding URDFRobot specific properties
  root.joints = {}
  // @ts-ignore - Adding URDFRobot specific properties
  root.links = {}
  // @ts-ignore - Adding URDFRobot specific properties
  root.setJointValue = () => {}
  // @ts-ignore - Adding URDFRobot specific properties
  root.isURDFRobot = true
  // @ts-ignore - Adding URDFRobot specific properties
  root.isURDFLink = true

  console.log('SDF World name:', worldName)

  // 1. Scene settings (Ambient, Background)
  const sceneEl = doc.querySelector('scene')
  if (sceneEl) {
    const ambient = parseColor(sceneEl.querySelector('ambient')?.textContent || null)
    if (ambient) {
      console.log('SDF Scene ambient light added')
      const ambientLight = new AmbientLight(ambient, 1.0)
      root.add(ambientLight)
    }
  }

  // 2. Lights
  const lights = doc.querySelectorAll('world > light, sdf > light')
  console.log('SDF Lights found:', lights.length)
  for (const lightEl of Array.from(lights)) {
    parseLight(lightEl, root)
  }

  // 3. Models and Includes
  const models = doc.querySelectorAll('world > model, sdf > model')
  const includes = doc.querySelectorAll('world > include, sdf > include')
  console.log('SDF Models found:', models.length, 'Includes found:', includes.length)

  const modelPromises: Promise<void>[] = []

  for (const modelEl of Array.from(models)) {
    modelPromises.push(parseModel(modelEl, root, fileMap))
  }

  for (const includeEl of Array.from(includes)) {
    modelPromises.push(handleInclude(includeEl, root, fileMap))
  }

  await Promise.all(modelPromises)
  console.log('parseSDF complete')

  return root
}

function parseLight(lightEl: Element, parent: Object3D) {
  const type = lightEl.getAttribute('type') || 'point'
  const diffuse = parseColor(lightEl.querySelector('diffuse')?.textContent || '1 1 1 1')
  const poseStr = lightEl.querySelector('pose')?.textContent || null

  let light: Object3D | null = null

  if (type === 'directional') {
    light = new DirectionalLight(diffuse || 0xffffff, 1.0)
    const directionStr = lightEl.querySelector('direction')?.textContent || '0 0 -1'
    const dir = directionStr.trim().split(/\s+/).map(Number)
    // Three.js DirectionalLight points from position to target (0,0,0 by default)
    // SDF direction is where it points to.
    light.position.set(-dir[0] || 0, -dir[1] || 0, -dir[2] || 1)
  } else if (type === 'point') {
    light = new PointLight(diffuse || 0xffffff, 1.0)
  } else if (type === 'spot') {
    light = new SpotLight(diffuse || 0xffffff, 1.0)
  }

  if (light) {
    light.name = lightEl.getAttribute('name') || 'light'
    applyPose(light, poseStr)
    const castShadows = lightEl.querySelector('cast_shadows')?.textContent === 'true'
    light.castShadow = castShadows
    parent.add(light)
  }
}

async function parseModel(
  modelEl: Element,
  parent: Object3D,
  fileMap: FileMap,
  nameOverride?: string,
): Promise<void> {
  const modelGroup = new Group()
  modelGroup.name = nameOverride || modelEl.getAttribute('name') || 'model'
  applyPose(modelGroup, modelEl.querySelector(':scope > pose')?.textContent || null)
  parent.add(modelGroup)

  const links = modelEl.querySelectorAll(':scope > link')
  for (const linkEl of Array.from(links)) {
    const linkGroup = new Group()
    linkGroup.name = linkEl.getAttribute('name') || 'link'
    // @ts-ignore - compatibility with URDF viewer features
    linkGroup.isURDFLink = true
    // @ts-ignore - compatibility with URDF viewer features
    linkGroup.urdfName = linkGroup.name
    applyPose(linkGroup, linkEl.querySelector(':scope > pose')?.textContent || null)
    modelGroup.add(linkGroup)

    // urdf-loader compatible link registry
    const root = getRoot(parent)
    if (root && 'links' in root) {
      // @ts-ignore - internal registry
      root.links[linkGroup.name] = linkGroup
    }

    const visuals = linkEl.querySelectorAll(':scope > visual')
    for (const visualEl of Array.from(visuals)) {
      const visualGroup = new Group()
      visualGroup.name = visualEl.getAttribute('name') || 'visual'
      applyPose(visualGroup, visualEl.querySelector(':scope > pose')?.textContent || null)
      linkGroup.add(visualGroup)

      const geometryEl = visualEl.querySelector('geometry')
      if (geometryEl) {
        await parseGeometry(geometryEl, visualGroup, visualEl, fileMap)
      }
    }
  }
}

async function handleInclude(
  includeEl: Element,
  parent: Object3D,
  fileMap: FileMap,
): Promise<void> {
  const uri = includeEl.querySelector('uri')?.textContent
  const name = includeEl.querySelector('name')?.textContent || undefined
  const poseStr = includeEl.querySelector('pose')?.textContent || null

  if (!uri) return

  // Resolve model:// URI
  let modelPath = uri
  if (modelPath.startsWith('model://')) {
    modelPath = modelPath.replace(/^model:\/\//, '')
  }

  // Look for model.sdf in the model directory
  const possiblePaths = [
    `${modelPath}/model.sdf`,
    `${modelPath}.sdf`,
    `models/${modelPath}/model.sdf`
  ]

  let resolvedUrl: string | null = null
  for (const p of possiblePaths) {
    resolvedUrl = resolveMeshUrl(p, fileMap)
    if (resolvedUrl) break
  }

  if (!resolvedUrl) {
    console.warn(`SDF include not found: ${uri}`)
    return
  }

  try {
    const response = await fetch(resolvedUrl)
    const content = await response.text()
    const parser = new DOMParser()
    const doc = parser.parseFromString(content, 'text/xml')
    const modelEl = doc.querySelector('model')
    if (modelEl) {
      const includeGroup = new Group()
      applyPose(includeGroup, poseStr)
      parent.add(includeGroup)
      await parseModel(modelEl, includeGroup, fileMap, name)
    }
  } catch (err) {
    console.error(`Failed to load included SDF: ${uri}`, err)
  }
}

async function parseGeometry(
  geometryEl: Element,
  parent: Object3D,
  visualEl: Element,
  fileMap: FileMap,
): Promise<void> {
  const box = geometryEl.querySelector('box')
  const cylinder = geometryEl.querySelector('cylinder')
  const sphere = geometryEl.querySelector('sphere')
  const plane = geometryEl.querySelector('plane')
  const mesh = geometryEl.querySelector('mesh')

  let geometry: BufferGeometry | null = null
  let meshObj: Mesh | null = null

  const materialEl = visualEl.querySelector('material')
  const material = DEFAULT_MATERIAL.clone()
  if (materialEl) {
    const ambient = parseColor(materialEl.querySelector('ambient')?.textContent || null)
    const diffuse = parseColor(materialEl.querySelector('diffuse')?.textContent || null)
    if (diffuse) material.color.copy(diffuse)
    else if (ambient) material.color.copy(ambient)
  }

  if (box) {
    const sizeStr = box.querySelector('size')?.textContent || '1 1 1'
    const s = sizeStr.trim().split(/\s+/).map(Number)
    geometry = new BoxGeometry(s[0] || 1, s[1] || 1, s[2] || 1)
  } else if (cylinder) {
    const radius = Number(cylinder.querySelector('radius')?.textContent || 0.5)
    const length = Number(cylinder.querySelector('length')?.textContent || 1)
    geometry = new CylinderGeometry(radius, radius, length, 32)
    // Three.js Cylinder is Y-up, SDF/URDF is Z-up (usually requires rotation if not handled)
    geometry.rotateX(Math.PI / 2)
  } else if (sphere) {
    const radius = Number(sphere.querySelector('radius')?.textContent || 0.5)
    geometry = new SphereGeometry(radius, 32, 32)
  } else if (plane) {
    const sizeStr = plane.querySelector('size')?.textContent || '1 1'
    const s = sizeStr.trim().split(/\s+/).map(Number)
    geometry = new PlaneGeometry(s[0] || 1, s[1] || 1)
  } else if (mesh) {
    const uri = mesh.querySelector('uri')?.textContent
    const scaleStr = mesh.querySelector('scale')?.textContent || '1 1 1'
    const s = scaleStr.trim().split(/\s+/).map(Number)

    if (uri) {
      await loadSdfMesh(uri, s, parent, material, fileMap)
    }
    return
  }

  if (geometry) {
    meshObj = new Mesh(geometry, material)
    meshObj.castShadow = true
    meshObj.receiveShadow = true
    parent.add(meshObj)
  }
}

async function loadSdfMesh(
  uri: string,
  scale: number[],
  parent: Object3D,
  material: MeshStandardMaterial,
  fileMap: FileMap,
): Promise<void> {
  let modelPath = uri
  if (modelPath.startsWith('model://')) {
    modelPath = modelPath.replace(/^model:\/\//, '')
  }

  const resolvedUrl = resolveMeshUrl(modelPath, fileMap)
  if (!resolvedUrl) {
    console.warn(`Mesh not found: ${uri}`)
    return
  }

  const lowerUrl = uri.toLowerCase()
  return new Promise((resolve) => {
    if (lowerUrl.endsWith('.stl')) {
      const loader = new STLLoader()
      loader.load(resolvedUrl, (geometry) => {
        const mesh = new Mesh(geometry, material)
        mesh.scale.set(scale[0] || 1, scale[1] || 1, scale[2] || 1)
        mesh.castShadow = true
        mesh.receiveShadow = true
        parent.add(mesh)
        resolve()
      }, undefined, () => resolve())
    } else if (lowerUrl.endsWith('.dae')) {
      const loader = new ColladaLoader()
      loader.load(resolvedUrl, (collada) => {
        if (!collada) {
          resolve()
          return
        }
        const scene = collada.scene
        scene.scale.set(scale[0] || 1, scale[1] || 1, scale[2] || 1)
        parent.add(scene)
        resolve()
      }, undefined, () => resolve())
    } else {
      resolve()
    }
  })
}

function getRoot(obj: Object3D): Object3D | null {
  let curr = obj
  while (curr.parent) curr = curr.parent
  return curr
}

/**
 * SDF XML에서 참조하는 모든 메시 경로를 추출한다. (재귀)
 */
export async function extractSdfMeshReferences(
  sdfContent: string,
  fileMap: FileMap,
  seenPaths = new Set<string>(),
): Promise<MeshReference[]> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(sdfContent, 'text/xml')
  const meshElements = doc.querySelectorAll('geometry > mesh')
  const includeElements = doc.querySelectorAll('include')

  const refs: MeshReference[] = []

  for (const mesh of Array.from(meshElements)) {
    const uri = mesh.querySelector('uri')?.textContent
    if (!uri || seenPaths.has(uri)) continue
    seenPaths.add(uri)

    let modelPath = uri
    if (modelPath.startsWith('model://')) {
      modelPath = modelPath.replace(/^model:\/\//, '')
    }

    const extension = uri.split('.').pop()?.toLowerCase() ?? ''
    const resolved = resolveMeshUrl(modelPath, fileMap) !== null
    refs.push({ urdfPath: uri, resolved, extension })
  }

  for (const include of Array.from(includeElements)) {
    const uri = include.querySelector('uri')?.textContent
    if (!uri) continue

    let modelPath = uri
    if (modelPath.startsWith('model://')) {
      modelPath = modelPath.replace(/^model:\/\//, '')
    }

    const possiblePaths = [
      `${modelPath}/model.sdf`,
      `${modelPath}.sdf`,
      `models/${modelPath}/model.sdf`
    ]

    let resolvedUrl: string | null = null
    for (const p of possiblePaths) {
      resolvedUrl = resolveMeshUrl(p, fileMap)
      if (resolvedUrl) break
    }

    if (resolvedUrl) {
      try {
        const response = await fetch(resolvedUrl)
        const content = await response.text()
        const nestedRefs = await extractSdfMeshReferences(content, fileMap, seenPaths)
        refs.push(...nestedRefs)
      } catch (e) {
        // ignore errors during extraction
      }
    }
  }

  return refs
}
