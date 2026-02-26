import type { FileMap } from '@shared/types'

/** GitHub 레포 URL에서 추출한 정보 */
export interface GitHubRepoInfo {
  owner: string
  repo: string
  /** 브랜치 (URL에 없으면 빈 문자열, fetchDefaultBranch로 조회 필요) */
  branch: string
  /** 서브 경로 (tree/blob 뒤의 경로, 없으면 빈 문자열) */
  path: string
}

/** GitHub Trees API에서 반환하는 파일 엔트리 */
export interface GitHubTreeEntry {
  path: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
}

/**
 * GitHub URL을 파싱하여 owner/repo/branch/path를 추출한다.
 * 지원 형식:
 *   https://github.com/owner/repo
 *   https://github.com/owner/repo/tree/branch
 *   https://github.com/owner/repo/tree/branch/path/to/dir
 *   https://github.com/owner/repo/blob/branch/path/to/file
 */
export function parseGitHubUrl(url: string): GitHubRepoInfo | null {
  try {
    const parsed = new URL(url.trim())
    if (parsed.hostname !== 'github.com') return null

    // /owner/repo[/tree|blob/branch[/path...]]
    const segments = parsed.pathname.split('/').filter(Boolean)
    if (segments.length < 2) return null

    const owner = segments[0]
    const repo = segments[1].replace(/\.git$/, '')

    // 기본: branch/path 없음
    if (segments.length === 2) {
      return { owner, repo, branch: '', path: '' }
    }

    // tree 또는 blob이 있으면 branch와 path 추출
    const action = segments[2]
    if (action === 'tree' || action === 'blob') {
      const branch = segments[3] ?? ''
      const path = segments.slice(4).join('/')
      return { owner, repo, branch, path }
    }

    // tree/blob이 아닌 다른 경로면 owner/repo만 반환
    return { owner, repo, branch: '', path: '' }
  } catch {
    return null
  }
}

/**
 * 레포의 기본 브랜치를 조회한다 (GitHub REST API).
 */
export async function fetchDefaultBranch(
  owner: string,
  repo: string,
): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  })

  if (res.status === 404) {
    throw new Error('Repository not found. Make sure it\'s a public repository.')
  }
  if (res.status === 403) {
    throw new Error('GitHub API rate limit exceeded. Try again in a few minutes.')
  }
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`)
  }

  const data: { default_branch: string } = await res.json()
  return data.default_branch
}

/**
 * 레포의 전체 파일 트리를 조회한다 (Trees API, recursive).
 * 단일 요청으로 전체 레포 구조를 가져온다.
 */
export async function fetchRepoTree(
  info: GitHubRepoInfo,
): Promise<GitHubTreeEntry[]> {
  const url = `https://api.github.com/repos/${info.owner}/${info.repo}/git/trees/${info.branch}?recursive=1`

  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github.v3+json' },
  })

  if (res.status === 404) {
    throw new Error('Repository not found. Make sure it\'s a public repository.')
  }
  if (res.status === 403) {
    throw new Error('GitHub API rate limit exceeded. Try again in a few minutes.')
  }
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`)
  }

  const data: { tree: GitHubTreeEntry[]; truncated: boolean } = await res.json()

  if (data.truncated) {
    console.warn('GitHub tree was truncated; some files may be missing for very large repositories.')
  }

  // 서브경로 필터: path가 지정된 경우 해당 디렉토리 하위만 반환
  if (info.path) {
    const prefix = info.path.endsWith('/') ? info.path : `${info.path}/`
    return data.tree.filter(
      (entry) => entry.path === info.path || entry.path.startsWith(prefix),
    )
  }

  return data.tree
}

/**
 * raw.githubusercontent.com URL을 생성한다.
 */
export function buildRawUrl(info: GitHubRepoInfo, filePath: string): string {
  return `https://raw.githubusercontent.com/${info.owner}/${info.repo}/${info.branch}/${filePath}`
}

/**
 * URL에서 텍스트를 가져온다.
 */
export async function fetchFileAsText(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch file (${res.status}): ${url}`)
  }
  return res.text()
}

/**
 * 트리 엔트리 목록에서 URDF/XACRO 파일을 찾는다.
 */
export function findUrdfFiles(entries: GitHubTreeEntry[]): GitHubTreeEntry[] {
  return entries.filter((entry) => {
    if (entry.type !== 'blob') return false
    const lower = entry.path.toLowerCase()
    return lower.endsWith('.urdf') || lower.endsWith('.xacro')
  })
}

/**
 * 트리 엔트리 목록으로 FileMap을 생성한다.
 * 각 파일 경로를 raw.githubusercontent.com URL에 매핑한다.
 * resolveMeshUrl()의 서픽스 매칭이 package:// URI를 해석할 수 있도록
 * 전체 경로를 키로 사용한다.
 */
export function buildFileMapFromTree(
  info: GitHubRepoInfo,
  entries: GitHubTreeEntry[],
): FileMap {
  const fileMap: FileMap = new Map()

  for (const entry of entries) {
    if (entry.type !== 'blob') continue
    const rawUrl = buildRawUrl(info, entry.path)
    fileMap.set(entry.path, rawUrl)
  }

  return fileMap
}
