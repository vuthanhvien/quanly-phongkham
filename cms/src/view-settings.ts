import { baseFields, CustomField, FieldSpec, getResourceActionOptions, systemRoleOptions } from './models'

export const DEFAULT_ROLE_SCOPE = 'ALL'
export const DEFAULT_ROLE_GROUPS = [DEFAULT_ROLE_SCOPE, ...systemRoleOptions]
export const VIEW_TYPES = ['TABLE', 'FORM', 'DETAIL'] as const

export type ViewType = (typeof VIEW_TYPES)[number]

export interface ViewSettingRecord {
  id?: string
  entityType: string
  viewType: string
  role?: string
  config?: Record<string, unknown>
}

export function resolveAllowedActions(
  views: ViewSettingRecord[],
  resource: string,
  role?: string,
) {
  const normalizedRole = normalizeRole(role)
  const exactViews = views.filter((view) => normalizeRole(view.role) === normalizedRole)
  const exactAllowedActions = exactViews
    .map((view) => view.config?.allowedActions)
    .find((value) => Array.isArray(value))

  if (Array.isArray(exactAllowedActions)) return exactAllowedActions.map(String)

  const defaultViews = views.filter(
    (view) => normalizeRole(view.role) === DEFAULT_ROLE_SCOPE,
  )
  const defaultAllowedActions = defaultViews
    .map((view) => view.config?.allowedActions)
    .find((value) => Array.isArray(value))

  if (Array.isArray(defaultAllowedActions)) return defaultAllowedActions.map(String)
  return getResourceActionOptions(resource).map((item) => item.key)
}

function getModuleEnabledValue(view: ViewSettingRecord | undefined) {
  if (typeof view?.config?.moduleEnabled === 'boolean') {
    return view.config.moduleEnabled
  }
  return undefined
}

export interface FieldLayoutConfig extends FieldSpec {
  visible: boolean
  disabled?: boolean
  description?: string
  placeholder?: string
  defaultValue?: unknown
  width?: '25' | '33' | '50' | '66' | '100'
  tableWidth?: number
}

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('clinic-user') || 'null')
  } catch {
    return null
  }
}

export function getStoredUserRole() {
  const user = readStoredUser()
  return normalizeRole(user?.activeRole || user?.role)
}

export function normalizeRole(role?: string) {
  return role?.trim().toUpperCase() || DEFAULT_ROLE_SCOPE
}

export function getRoleOptions(views: ViewSettingRecord[], extraRoles: string[] = []) {
  return Array.from(
    new Set(
      [...DEFAULT_ROLE_GROUPS, ...views.map((view) => normalizeRole(view.role)), ...extraRoles]
        .filter(Boolean)
        .map((role) => normalizeRole(role)),
    ),
  )
}

export function getFieldCatalog(resource: string, customFields: CustomField[]) {
  return [
    ...(baseFields[resource] || []),
    ...customFields
      .filter((field) => field.isActive)
      .map(
        (field): FieldSpec => ({
          key: field.key,
          label: field.label,
          type: field.dataType as FieldSpec['type'],
          required: field.required,
          options: field.options,
          relation: field.dataType === 'relative' && field.relationResource
            ? { resource: field.relationResource, labelFields: ['code', 'name', 'fullName', 'title'] }
            : undefined,
        }),
      ),
  ]
}

function getConfigEntries(view: ViewSettingRecord | undefined, viewType: ViewType) {
  const configKey = viewType === 'TABLE' ? 'columns' : 'fields'
  const value = view?.config?.[configKey]
  return Array.isArray(value) ? value : []
}

function fallbackField(key: string, catalog: FieldSpec[]) {
  return catalog.find((field) => field.key === key) || { key, label: key }
}

export function resolveViewSetting(
  views: ViewSettingRecord[],
  viewType: ViewType,
  role?: string,
) {
  const normalizedRole = normalizeRole(role)
  return (
    views.find(
      (view) =>
        view.viewType === viewType && normalizeRole(view.role) === normalizedRole,
    ) ||
    views.find(
      (view) =>
        view.viewType === viewType &&
        normalizeRole(view.role) === DEFAULT_ROLE_SCOPE,
    )
  )
}

export function hasExactRoleSetting(
  views: ViewSettingRecord[],
  viewType: ViewType,
  role?: string,
) {
  const normalizedRole = normalizeRole(role)
  return views.some(
    (view) =>
      view.viewType === viewType && normalizeRole(view.role) === normalizedRole,
  )
}

export function resolveModuleEnabled(
  views: ViewSettingRecord[],
  role?: string,
) {
  const normalizedRole = normalizeRole(role)
  const exactViews = views.filter(
    (view) => normalizeRole(view.role) === normalizedRole,
  )
  const exactModuleEnabled = exactViews
    .map((view) => getModuleEnabledValue(view))
    .find((value) => typeof value === 'boolean')

  if (typeof exactModuleEnabled === 'boolean') return exactModuleEnabled
  if (exactViews.length > 0) return true

  const defaultViews = views.filter(
    (view) => normalizeRole(view.role) === DEFAULT_ROLE_SCOPE,
  )
  const defaultModuleEnabled = defaultViews
    .map((view) => getModuleEnabledValue(view))
    .find((value) => typeof value === 'boolean')

  if (typeof defaultModuleEnabled === 'boolean') return defaultModuleEnabled
  return true
}

export function buildFieldLayoutConfigs(
  catalog: FieldSpec[],
  view: ViewSettingRecord | undefined,
  viewType: ViewType,
) {
  const entries = getConfigEntries(view, viewType)

  if (!entries.length) {
    return catalog.map(
      (field): FieldLayoutConfig => ({
        ...field,
        visible: true,
        disabled: field.disabled ?? false,
      }),
    )
  }

  const seen = new Set<string>()
  const configs: FieldLayoutConfig[] = []

  entries.forEach((entry) => {
    if (typeof entry === 'string') {
      const base = fallbackField(entry, catalog)
      seen.add(entry)
      configs.push({
        ...base,
        visible: true,
        disabled: base.disabled ?? false,
      })
      return
    }

    if (!entry || typeof entry !== 'object' || typeof entry.key !== 'string') {
      return
    }

    const base = fallbackField(entry.key, catalog)
    seen.add(entry.key)
    configs.push({
      ...base,
      label:
        typeof entry.label === 'string' && entry.label.trim()
          ? entry.label
          : base.label,
      required: base.required,
      options:
        Array.isArray(entry.options)
          ? entry.options.map(String)
          : base.options,
      disabled:
        typeof entry.disabled === 'boolean'
          ? entry.disabled
          : base.disabled ?? false,
      description:
        typeof entry.description === 'string' && entry.description.trim()
          ? entry.description
          : undefined,
      placeholder:
        typeof entry.placeholder === 'string' && entry.placeholder.trim()
          ? entry.placeholder
          : undefined,
      defaultValue:
        entry.defaultValue !== undefined
          ? entry.defaultValue
          : base.defaultValue,
      width:
        ['25', '33', '50', '66', '100'].includes(String(entry.width))
          ? String(entry.width) as FieldLayoutConfig['width']
          : base.width,
      tableWidth:
        typeof entry.tableWidth === 'number' && Number.isFinite(entry.tableWidth) && entry.tableWidth > 0
          ? entry.tableWidth
          : base.tableWidth,
      visible:
        typeof entry.visible === 'boolean' ? entry.visible : true,
    })
  })

  catalog.forEach((field) => {
    if (seen.has(field.key)) return
    configs.push({
      ...field,
      visible: false,
      disabled: field.disabled ?? false,
    })
  })

  return configs
}

export function getVisibleFieldConfigs(
  catalog: FieldSpec[],
  views: ViewSettingRecord[],
  viewType: ViewType,
  role?: string,
) {
  return buildFieldLayoutConfigs(
    catalog,
    resolveViewSetting(views, viewType, role),
    viewType,
  ).filter((field) => field.visible)
}

export function serializeViewConfig(
  viewType: ViewType,
  configs: FieldLayoutConfig[],
  moduleEnabled = true,
  allowedActions?: string[],
) {
  const items = configs.map((field) => {
    const next: Record<string, unknown> = {
      key: field.key,
      visible: field.visible,
    }

    if (field.label?.trim()) next.label = field.label.trim()
    if (typeof field.disabled === 'boolean') next.disabled = field.disabled
    if (Array.isArray(field.options) && field.options.length > 0) next.options = field.options
    if (field.description?.trim()) next.description = field.description.trim()
    if (field.placeholder?.trim()) next.placeholder = field.placeholder.trim()
    if (field.defaultValue !== undefined && field.defaultValue !== '') {
      next.defaultValue = field.defaultValue
    }
    if (field.width) next.width = field.width
    if (typeof field.tableWidth === 'number' && Number.isFinite(field.tableWidth) && field.tableWidth > 0) {
      next.tableWidth = field.tableWidth
    }

    return next
  })

  return viewType === 'TABLE'
    ? { columns: items, moduleEnabled, allowedActions }
    : { fields: items, moduleEnabled, allowedActions }
}
