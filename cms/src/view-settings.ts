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
  const normalizedRole = normalizeRenderableRole(role)
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
  const matched = resolveActionSetting(views, role, dynamicRoles)
  const allowedActions = matched?.config?.allowedActions
  if (Array.isArray(allowedActions)) return allowedActions.map(String)
  return getResourceActionOptions(resource).map((item) => item.key)
}

export function resolveActionSetting(views: ViewSettingRecord[], role?: string, dynamicRoles: DynamicRole[] = []) {
  const chain = getRoleInheritanceChain(role, dynamicRoles)
  for (const inheritedRole of chain) {
    const actionSetting = views.find((view) => view.viewType === 'ACTION' && normalizeRole(view.role) === inheritedRole)
    if (Array.isArray(actionSetting?.config?.allowedActions)) return actionSetting
    const legacyTableSetting = views.find((view) => view.viewType === 'TABLE' && normalizeRole(view.role) === inheritedRole && Array.isArray(view.config?.allowedActions))
    if (legacyTableSetting) return legacyTableSetting
  }
  return undefined
}

function getModuleEnabledValue(view: ViewSettingRecord | undefined) {
  if (typeof view?.config?.moduleEnabled === 'boolean') {
    return view.config.moduleEnabled
  }
  return undefined
}

export interface FieldLayoutConfig extends FieldSpec {
  visible: boolean
  tab?: string
  disabled?: boolean
  description?: string
  placeholder?: string
  defaultValue?: unknown
  width?: '25' | '33' | '50' | '66' | '75' | '100'
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
  return normalizeRenderableRole(user?.activeRole || user?.role)
}

export function normalizeRole(role?: string) {
  return role?.trim().toUpperCase() || DEFAULT_ROLE_SCOPE
}

// "VIEW" is an old malformed view-setting role, not a user role.
function normalizeRenderableRole(role?: string) {
  const normalized = normalizeRole(role)
  return normalized === 'VIEW' ? DEFAULT_ROLE_SCOPE : normalized
}

export function getRoleOptions(views: ViewSettingRecord[], extraRoles: string[] = []) {
  void views
  return Array.from(
    new Set(
      [...DEFAULT_ROLE_GROUPS, ...extraRoles]
        .filter(Boolean)
        .map((role) => normalizeRole(role)),
    ),
  )
}

export function getFieldCatalog(resource: string, customFields: CustomField[]) {
  const builtInFields = (baseFields[resource] || [])
    .filter((field) => !isFieldHiddenForResource(resource, field.key))
  const builtInKeys = new Set(builtInFields.map((field) => field.key))

  return [
    ...builtInFields,
    ...customFields
      .filter((field) => field.isActive)
      .filter((field) => !isFieldHiddenForResource(resource, field.key))
      // A custom field must not replace or duplicate a system-owned field.
      .filter((field) => !builtInKeys.has(field.key))
      .map(
        (field): FieldSpec => ({
          key: field.key,
          label: field.label,
          type: field.dataType as FieldSpec['type'],
          required: field.required,
          options: field.options,
          customTableId: field.customTableId,
          tableColumns: field.tableColumns,
          relation:
            field.dataType === 'file'
              ? { resource: 'files', labelFields: ['title', 'originalName'] }
              : (field.dataType === 'relative' || field.dataType === 'multi-select') && field.relationResource
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
      tab:
        typeof entry.tab === 'string' && entry.tab.trim()
          ? entry.tab.trim()
          : base.tab,
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
      inputPattern:
        typeof entry.inputPattern === 'string'
          ? entry.inputPattern
          : base.inputPattern,
      requiresPasswordToReveal:
        typeof entry.requiresPasswordToReveal === 'boolean'
          ? entry.requiresPasswordToReveal
          : base.requiresPasswordToReveal,
      maskLastThreeDigits:
        typeof entry.maskLastThreeDigits === 'boolean'
          ? entry.maskLastThreeDigits
          : base.maskLastThreeDigits,
      defaultValue:
        entry.defaultValue !== undefined
          ? entry.defaultValue
          : base.defaultValue,
      displayFormat:
        ['currency', 'number', 'percent'].includes(String(entry.displayFormat))
          ? String(entry.displayFormat) as FieldLayoutConfig['displayFormat']
          : base.displayFormat,
      width:
        ['25', '33', '50', '66', '75', '100'].includes(String(entry.width))
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

  // Fields added to the catalog after this view was saved (typically new custom
  // fields) are not listed in the stored config. They default to visible so a
  // newly declared field shows up everywhere without re-editing every view.
  catalog.forEach((field) => {
    if (seen.has(field.key)) return
    configs.push({
      ...field,
      visible: true,
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
  includeModuleSettings = true,
) {
  const items = configs.map((field) => {
    const next: Record<string, unknown> = {
      key: field.key,
      visible: field.visible,
    }

    if (field.label?.trim()) next.label = field.label.trim()
    if (field.tab?.trim()) next.tab = field.tab.trim()
    if (typeof field.disabled === 'boolean') next.disabled = field.disabled
    if (Array.isArray(field.options) && field.options.length > 0) next.options = field.options
    if (field.description?.trim()) next.description = field.description.trim()
    if (field.placeholder?.trim()) next.placeholder = field.placeholder.trim()
    if (field.inputPattern !== undefined) next.inputPattern = field.inputPattern.trim()
    if (field.requiresPasswordToReveal) next.requiresPasswordToReveal = true
    if (field.maskLastThreeDigits) next.maskLastThreeDigits = true
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

  const config = viewType === 'TABLE' ? { columns: items } : { fields: items }
  return includeModuleSettings ? { ...config, moduleEnabled, allowedActions } : config
}
