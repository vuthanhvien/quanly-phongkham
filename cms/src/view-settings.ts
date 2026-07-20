import { baseFields, CustomField, DynamicRole, FieldSpec, getResourceActionOptions, isFieldHiddenForResource, normalizeSelectOption, systemRoleOptions } from './models'

export const DEFAULT_ROLE_SCOPE = 'ALL'
export const DEFAULT_ROLE_GROUPS = [DEFAULT_ROLE_SCOPE, ...systemRoleOptions]
export const VIEW_TYPES = ['TABLE', 'FORM', 'DETAIL'] as const

export type ViewType = (typeof VIEW_TYPES)[number]
type FieldOption = NonNullable<FieldSpec['options']>[number]

export interface ViewSettingRecord {
  id?: string
  entityType: string
  viewType: string
  role?: string
  config?: Record<string, unknown>
}

export function getRoleInheritanceChain(role?: string, dynamicRoles: DynamicRole[] = []) {
  const normalizedRole = normalizeRole(role)
  if (normalizedRole === DEFAULT_ROLE_SCOPE) return [DEFAULT_ROLE_SCOPE]

  const user = readStoredUser()
  const matchedRole = dynamicRoles.find((item) => normalizeRole(item.key) === normalizedRole)
  const mainRole = normalizeRole(
    matchedRole?.roleMain ||
      (normalizeRole(user?.activeRole || user?.role) === normalizedRole
        ? user?.roleMain || user?.role
        : undefined),
  )

  return Array.from(
    new Set([
      normalizedRole,
      ...(mainRole !== normalizedRole ? [mainRole] : []),
      DEFAULT_ROLE_SCOPE,
    ]),
  )
}

function resolveViewFromChain(
  views: ViewSettingRecord[],
  predicate: (view: ViewSettingRecord) => boolean,
  role?: string,
  dynamicRoles: DynamicRole[] = [],
) {
  const chain = getRoleInheritanceChain(role, dynamicRoles)
  for (const inheritedRole of chain) {
    const matched = views.find(
      (view) => predicate(view) && normalizeRole(view.role) === inheritedRole,
    )
    if (matched) return matched
  }
  return undefined
}

export function resolveAllowedActions(
  views: ViewSettingRecord[],
  resource: string,
  role?: string,
  dynamicRoles: DynamicRole[] = [],
) {
  const matched = resolveViewFromChain(
    views,
    (view) => Array.isArray(view.config?.allowedActions),
    role,
    dynamicRoles,
  )
  const allowedActions = matched?.config?.allowedActions
  if (Array.isArray(allowedActions)) return allowedActions.map(String)
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

function resolveDefaultFieldWidth(field: FieldSpec): FieldLayoutConfig['width'] {
  if (field.width) return field.width

  const normalizedKey = field.key.toLowerCase()

  if (
    field.type === 'textarea' ||
    ['address', 'note', 'description', 'content', 'summary', 'diagnosis', 'chiefcomplaint', 'allergywarning', 'nextaction', 'publicurl'].includes(normalizedKey)
  ) {
    return '100'
  }

  if (field.type === 'number') return '33'

  if (
    field.type === 'date' ||
    field.type === 'datetime' ||
    field.type === 'select' ||
    field.type === 'multi-select' ||
    field.type === 'relative' ||
    field.type === 'file'
  ) {
    return '50'
  }

  if (
    ['code', 'slug', 'phone', 'email', 'status', 'type', 'method', 'gender'].includes(normalizedKey)
  ) {
    return '50'
  }

  return '50'
}

function resolveDefaultTableWidth(field: FieldSpec) {
  if (typeof field.tableWidth === 'number' && Number.isFinite(field.tableWidth) && field.tableWidth > 0) {
    return field.tableWidth
  }

  const normalizedKey = field.key.toLowerCase()

  if (
    field.type === 'textarea' ||
    ['address', 'note', 'description', 'content', 'summary', 'diagnosis', 'chiefcomplaint', 'allergywarning', 'nextaction', 'publicurl'].includes(normalizedKey)
  ) {
    return 320
  }

  if (field.type === 'number') return 140
  if (field.type === 'date') return 160
  if (field.type === 'datetime') return 190
  if (field.type === 'select' || field.type === 'multi-select') return 170
  if (field.type === 'relative' || field.type === 'file') return 220

  if (['code', 'slug', 'status', 'type', 'method', 'gender'].includes(normalizedKey)) {
    return 150
  }

  if (['phone', 'email'].includes(normalizedKey)) return 180

  return 200
}

function resolveDefaultDisplayFormat(field: FieldSpec): FieldLayoutConfig['displayFormat'] {
  if (field.displayFormat) return field.displayFormat

  const normalizedKey = field.key.toLowerCase()
  const currencyKeys = new Set([
    'totalspent',
    'sellingprice',
    'totalamount',
    'paidamount',
    'amount',
    'unitprice',
    'debtlimit',
    'basesalary',
    'salarybase',
    'netsalary',
    'bonus',
    'deduction',
  ])
  const percentKeys = new Set(['employeerate', 'employerrate'])

  if (currencyKeys.has(normalizedKey)) return 'currency'
  if (percentKeys.has(normalizedKey)) return 'percent'
  if (field.type === 'number') return 'number'
  return undefined
}

export function applyDefaultFieldLayout<T extends FieldSpec>(field: T): T {
  return {
    ...field,
    displayFormat: resolveDefaultDisplayFormat(field),
    width: field.width || resolveDefaultFieldWidth(field),
    tableWidth: resolveDefaultTableWidth(field),
  }
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
    ...(baseFields[resource] || []).filter((field) => !isFieldHiddenForResource(resource, field.key)),
    ...customFields
      .filter((field) => field.isActive)
      .filter((field) => !isFieldHiddenForResource(resource, field.key))
      .map(
        (field): FieldSpec => ({
          key: field.key,
          label: field.label,
          type: field.dataType as FieldSpec['type'],
          required: field.required,
          options: field.options,
          relation:
            field.dataType === 'file'
              ? { resource: 'files', labelFields: ['title', 'originalName'] }
              : field.dataType === 'relative' && field.relationResource
                ? { resource: field.relationResource, labelFields: ['code', 'name', 'fullName', 'title'] }
                : undefined,
        }),
      ),
  ].map((field) => applyDefaultFieldLayout(field))
}

function getConfigEntries(view: ViewSettingRecord | undefined, viewType: ViewType) {
  const configKey = viewType === 'TABLE' ? 'columns' : 'fields'
  const value = view?.config?.[configKey]
  return Array.isArray(value) ? value : []
}

function fallbackField(key: string, catalog: FieldSpec[]) {
  return applyDefaultFieldLayout(
    catalog.find((field) => field.key === key) || { key, label: key },
  )
}

export function resolveViewSetting(
  views: ViewSettingRecord[],
  viewType: ViewType,
  role?: string,
  dynamicRoles: DynamicRole[] = [],
) {
  return resolveViewFromChain(
    views,
    (view) => view.viewType === viewType,
    role,
    dynamicRoles,
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
  dynamicRoles: DynamicRole[] = [],
) {
  const chain = getRoleInheritanceChain(role, dynamicRoles)
  for (const inheritedRole of chain) {
    const inheritedViews = views.filter(
      (view) => normalizeRole(view.role) === inheritedRole,
    )
    const moduleEnabled = inheritedViews
      .map((view) => getModuleEnabledValue(view))
      .find((value) => typeof value === 'boolean')

    if (typeof moduleEnabled === 'boolean') return moduleEnabled
    if (inheritedViews.length > 0) return true
  }
  return true
}

export function buildFieldLayoutConfigs(
  catalog: FieldSpec[],
  view: ViewSettingRecord | undefined,
  viewType: ViewType,
) {
  const resource = view?.entityType
  const entries = getConfigEntries(view, viewType)

  if (!entries.length) {
    return catalog.map(
      (field): FieldLayoutConfig => ({
        ...applyDefaultFieldLayout(field),
        visible: true,
        disabled: field.disabled ?? false,
      }),
    )
  }

  const seen = new Set<string>()
  const configs: FieldLayoutConfig[] = []

  entries.forEach((entry) => {
    if (typeof entry === 'string') {
      if (resource && isFieldHiddenForResource(resource, entry)) return
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

    if (resource && isFieldHiddenForResource(resource, entry.key)) {
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
          ? entry.options
              .map((value: unknown) => {
                if (typeof value === 'string') return value
                if (value && typeof value === 'object' && 'value' in value) {
                  return normalizeSelectOption(value as FieldOption)
                }
                return String(value)
              })
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
      displayFormat:
        ['currency', 'number', 'percent'].includes(String(entry.displayFormat))
          ? String(entry.displayFormat) as FieldLayoutConfig['displayFormat']
          : base.displayFormat,
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
    if (field.displayFormat) next.displayFormat = field.displayFormat
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
