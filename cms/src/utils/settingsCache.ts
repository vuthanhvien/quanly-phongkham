import { api } from "../api"
import { getCachedMasterData, invalidateMasterDataCache } from "./masterDataCache"

export async function getCachedPrintTemplates(entityType?: string) {
  const data = await getCachedMasterData(
    `print-templates:${entityType || "all"}`,
    () => api.get("/settings/print-templates", { params: entityType ? { entityType } : undefined }).then((response) => response.data?.data || []),
    30 * 60 * 1000,
  )
  return { data: { data } }
}

export async function getCachedViews(entityType?: string) {
  const data = await getCachedMasterData(
    `views:${entityType || "all"}`,
    () => api.get("/settings/views", { params: entityType ? { entityType } : undefined }).then((response) => response.data?.data || []),
    30 * 60 * 1000,
  )
  return { data: { data } }
}

export async function getCachedCustomFields(entityType?: string) {
  const data = await getCachedMasterData(
    `custom-fields:${entityType || "all"}`,
    () => api.get("/settings/custom-fields", { params: entityType ? { entityType } : undefined }).then((response) => response.data?.data || []),
    30 * 60 * 1000,
  )
  return { data: { data } }
}

export function invalidateSettingsCache() {
  invalidateMasterDataCache("print-templates:")
  invalidateMasterDataCache("views:")
  invalidateMasterDataCache("custom-fields:")
  // RecordFormContent uses these form-specific cache keys when it is mounted
  // inside a quick-create modal. Keep them in sync with the settings screen,
  // otherwise a newly opened popup can render an old field order/visibility.
  invalidateMasterDataCache("form-config:views:")
  invalidateMasterDataCache("form-config:custom-fields:")
}
