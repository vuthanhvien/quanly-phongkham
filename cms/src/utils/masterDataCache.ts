/**
 * Small persistent cache for form master data. It deliberately does not cache
 * transactional lists; only data used to render field options is stored.
 */
const CACHE_PREFIX = "clinic-master-data:v1"
const CACHE_TTL_MS = 5 * 60 * 1000

type CacheEntry<T> = { expiresAt: number; value: T }

function scope() {
  try {
    const user = JSON.parse(localStorage.getItem("clinic-user") || "{}") as { id?: string }
    return `${user.id || "anonymous"}:${localStorage.getItem("clinic-branch-filter") || "all"}`
  } catch {
    return "anonymous:all"
  }
}

function storageKey(key: string) {
  return `${CACHE_PREFIX}:${scope()}:${key}`
}

export async function getCachedMasterData<T>(key: string, load: () => Promise<T>, ttlMs = CACHE_TTL_MS): Promise<T> {
  const keyWithScope = storageKey(key)
  try {
    const cached = JSON.parse(localStorage.getItem(keyWithScope) || "null") as CacheEntry<T> | null
    if (cached && cached.expiresAt > Date.now()) return cached.value
  } catch {
    // Corrupt or quota-limited storage must never block a form from opening.
  }

  const value = await load()
  try {
    localStorage.setItem(keyWithScope, JSON.stringify({ value, expiresAt: Date.now() + ttlMs } satisfies CacheEntry<T>))
  } catch {
    // Ignore storage quota/privacy failures and keep the network result.
  }
  return value
}

export function invalidateMasterDataCache(prefix = "") {
  try {
    const scopedPrefix = `${CACHE_PREFIX}:${scope()}:${prefix}`
    Object.keys(localStorage).filter((key) => key.startsWith(scopedPrefix)).forEach((key) => localStorage.removeItem(key))
  } catch {
    // no-op
  }
}
