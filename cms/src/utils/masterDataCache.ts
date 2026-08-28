/**
 * Small persistent cache for form master data. It deliberately does not cache
 * transactional lists; only data used to render field options is stored.
 */
const CACHE_PREFIX = "clinic-master-data:v1"
const CACHE_TTL_MS = 5 * 60 * 1000
const memoryCache = new Map<string, CacheEntry<unknown>>()
const pendingLoads = new Map<string, Promise<unknown>>()

type CacheEntry<T> = { expiresAt: number; value: T }

function scope() {
  try {
    const user = JSON.parse(localStorage.getItem("clinic-user") || "{}") as { id?: string }
    return `${user.id || "anonymous"}:${localStorage.getItem("clinic-global-branch-ids") || "all"}`
  } catch {
    return "anonymous:all"
  }
}

function storageKey(key: string) {
  return `${CACHE_PREFIX}:${scope()}:${key}`
}

export async function getCachedMasterData<T>(key: string, load: () => Promise<T>, ttlMs = CACHE_TTL_MS): Promise<T> {
  const keyWithScope = storageKey(key)
  const inMemory = memoryCache.get(keyWithScope) as CacheEntry<T> | undefined
  if (inMemory && inMemory.expiresAt > Date.now()) return inMemory.value
  const pending = pendingLoads.get(keyWithScope) as Promise<T> | undefined
  if (pending) return pending
  try {
    const cached = JSON.parse(localStorage.getItem(keyWithScope) || "null") as CacheEntry<T> | null
    if (cached && cached.expiresAt > Date.now()) {
      memoryCache.set(keyWithScope, cached)
      return cached.value
    }
  } catch {
    // Corrupt or quota-limited storage must never block a form from opening.
  }

  const request = load().then((value) => {
    const entry = { value, expiresAt: Date.now() + ttlMs } satisfies CacheEntry<T>
    memoryCache.set(keyWithScope, entry)
    try { localStorage.setItem(keyWithScope, JSON.stringify(entry)) } catch { /* quota/privacy fallback uses memory */ }
    return value
  }).finally(() => pendingLoads.delete(keyWithScope))
  pendingLoads.set(keyWithScope, request)
  return request
}

export function invalidateMasterDataCache(prefix = "") {
  try {
    const scopedPrefix = `${CACHE_PREFIX}:${scope()}:${prefix}`
    Object.keys(localStorage).filter((key) => key.startsWith(scopedPrefix)).forEach((key) => localStorage.removeItem(key))
    Array.from(memoryCache.keys()).filter((key) => key.startsWith(scopedPrefix)).forEach((key) => memoryCache.delete(key))
  } catch {
    // no-op
  }
}
