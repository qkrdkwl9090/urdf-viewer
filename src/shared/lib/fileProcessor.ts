import type { FileMap } from '@shared/types'

/** URDF/XACRO 확장자 판별용 */
const URDF_EXTENSIONS = ['.urdf', '.xacro'] as const

interface ProcessedFiles {
  fileMap: FileMap
  /** 감지된 URDF/XACRO 파일의 키 (fileMap 내 경로) */
  urdfFile: string | null
  /** URDF/XACRO에 해당하는 원본 File 객체 */
  urdfFileObject: File | null
}

/**
 * 업로드된 파일들을 FileMap(경로 -> Blob URL)으로 변환하고
 * URDF/XACRO 파일을 자동 감지한다.
 */
export async function processFiles(
  files: FileList | File[],
): Promise<ProcessedFiles> {
  const fileMap: FileMap = new Map()
  let urdfFile: string | null = null
  let urdfFileObject: File | null = null

  const fileArray = Array.from(files)

  for (const file of fileArray) {
    // 폴더 업로드 시 webkitRelativePath에 디렉토리 구조가 포함됨
    const path = file.webkitRelativePath || file.name
    const blobUrl = URL.createObjectURL(file)
    fileMap.set(path, blobUrl)

    // URDF/XACRO 파일 자동 감지
    const lowerPath = path.toLowerCase()
    if (URDF_EXTENSIONS.some((ext) => lowerPath.endsWith(ext))) {
      // 여러 URDF 파일이 있으면 첫 번째 것을 사용
      if (!urdfFile) {
        urdfFile = path
        urdfFileObject = file
      }
    }
  }

  return { fileMap, urdfFile, urdfFileObject }
}

/**
 * File 객체의 내용을 텍스트로 읽는다.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to read file as text'))
      }
    }
    reader.onerror = () => reject(new Error('File read error'))
    reader.readAsText(file)
  })
}

/**
 * 드래그 앤 드롭 시 DataTransferItemList에서 파일 목록을 추출한다.
 * webkitGetAsEntry()를 사용해 폴더 구조까지 재귀적으로 탐색한다.
 */
export async function processDataTransferItems(
  items: DataTransferItemList,
): Promise<ProcessedFiles> {
  const files: File[] = []

  // FileSystemEntry 기반 재귀 디렉토리 탐색
  const readEntry = (entry: FileSystemEntry, basePath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (entry.isFile) {
        const fileEntry = entry as FileSystemFileEntry
        fileEntry.file(
          (file) => {
            // webkitRelativePath가 빈 문자열이므로 직접 경로를 구성
            const fullPath = basePath ? `${basePath}/${entry.name}` : entry.name
            const fileWithPath = new File([file], file.name, { type: file.type })
            // webkitRelativePath는 읽기 전용이므로 경로 정보를 별도로 보존
            Object.defineProperty(fileWithPath, 'webkitRelativePath', {
              value: fullPath,
              writable: false,
            })
            files.push(fileWithPath)
            resolve()
          },
          reject,
        )
      } else if (entry.isDirectory) {
        const dirEntry = entry as FileSystemDirectoryEntry
        const dirReader = dirEntry.createReader()
        const dirPath = basePath ? `${basePath}/${entry.name}` : entry.name

        // readEntries는 배치 단위로 반환할 수 있으므로 반복 호출 필요
        const readAllEntries = (): Promise<FileSystemEntry[]> => {
          return new Promise((resolveEntries, rejectEntries) => {
            const allEntries: FileSystemEntry[] = []
            const readBatch = (): void => {
              dirReader.readEntries(
                (entries) => {
                  if (entries.length === 0) {
                    resolveEntries(allEntries)
                  } else {
                    allEntries.push(...entries)
                    readBatch()
                  }
                },
                rejectEntries,
              )
            }
            readBatch()
          })
        }

        readAllEntries()
          .then((entries) =>
            Promise.all(entries.map((e) => readEntry(e, dirPath))),
          )
          .then(() => resolve())
          .catch(reject)
      } else {
        resolve()
      }
    })
  }

  const entries: FileSystemEntry[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry?.()
      if (entry) {
        entries.push(entry)
      }
    }
  }

  await Promise.all(entries.map((entry) => readEntry(entry, '')))

  // 드래그된 파일이 비어있을 경우 일반 파일 추출 시도
  if (files.length === 0) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.kind === 'file') {
        const file = item.getAsFile()
        if (file) files.push(file)
      }
    }
  }

  return processFiles(files)
}
