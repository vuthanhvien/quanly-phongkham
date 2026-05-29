export interface FileFolderRow {
  id: string
  name: string
  parentId?: string | null
}

export interface FolderTreeNode {
  title: string
  value: string
  key: string
  children?: FolderTreeNode[]
}

export function normalizeFileFolderRows(rows: Array<Record<string, unknown>>): FileFolderRow[] {
  return rows.map((row) => ({
    id: String(row.id),
    name: String(row.name || row.id),
    parentId: row.parentId ? String(row.parentId) : null,
  }))
}

export function buildFolderTree(rows: FileFolderRow[]): FolderTreeNode[] {
  const byParent = new Map<string | null, FileFolderRow[]>()
  rows.forEach((row) => {
    const key = row.parentId || null
    const siblings = byParent.get(key) || []
    siblings.push(row)
    byParent.set(key, siblings)
  })

  const createNodes = (parentId: string | null): FolderTreeNode[] =>
    (byParent.get(parentId) || [])
      .sort((left, right) => left.name.localeCompare(right.name, 'vi'))
      .map((row) => ({
        title: row.name,
        value: row.id,
        key: row.id,
        children: createNodes(row.id),
      }))

  return createNodes(null)
}

export function buildFolderPathMap(rows: FileFolderRow[]) {
  const byId = new Map(rows.map((row) => [row.id, row]))
  const cache = new Map<string, string>()

  const resolvePath = (id: string, visited = new Set<string>()): string => {
    if (cache.has(id)) return cache.get(id) as string
    const row = byId.get(id)
    if (!row) return id
    if (visited.has(id)) return row.name
    visited.add(id)

    const path = row.parentId && byId.has(row.parentId)
      ? `${resolvePath(row.parentId, visited)} / ${row.name}`
      : row.name
    cache.set(id, path)
    return path
  }

  return Object.fromEntries(rows.map((row) => [row.id, resolvePath(row.id)]))
}