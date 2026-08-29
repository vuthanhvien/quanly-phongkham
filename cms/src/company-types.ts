import { entityLabels, screenLabels } from "./models"
import { companyTypeOptions, type AppUiSettings } from "./app-ui"

export type CompanyType = AppUiSettings["companyType"]
export type AppModuleKey = string

export type AppModuleGroup = {
  key: string
  label: string
  companyTypes?: CompanyType[]
  modules: AppModuleKey[]
}

// Global monitor pages are the first operational entry points in the default
// sidebar, immediately after Feed.
export const appStandaloneModules: AppModuleKey[] = ["dashboard", "business-monitor", "hr-monitor", "project-monitor", "inventory-monitor", "calendar"]

export const companyTypeLabels = Object.fromEntries(
  companyTypeOptions.map((item) => [item.value, item.label]),
) as Record<CompanyType, string>

export const appModuleGroups: AppModuleGroup[] = [
  {
    key: "front-office",
    label: "Lễ tân & CRM",
    modules: ["appointments", "customers", "zalo-inbox", "leads", "lead-activities"],
  },
  {
    key: "clinical",
    label: "Chuyên môn điều trị",
    companyTypes: ["clinic"],
    modules: ["consultations", "medical-episodes", "service-orders", "treatments", "customer-images", "rooms", "equipments"],
  },
  {
    key: "inventory",
    label: "Kho & mua hàng",
    modules: ["products", "stock-batches", "warehouses", "suppliers", "product-categories", "units"],
  },
  {
    key: "assets",
    label: "Tài sản",
    modules: ["assets", "asset-categories", "asset-movements", "asset-maintenances"],
  },
  {
    key: "documents",
    label: "Tài liệu & file",
    modules: ["file-folders", "files"],
  },
  {
    key: "hr",
    label: "Nhân sự",
    modules: [
      "staff",
      "departments",
      "attendances",
      "leave-requests",
      "attendance-adjustment-requests",
      "work-schedules",
      "business-trip-requests",
      "work-contracts",
      "staff-insurances",
      "leave-allocations",
      "leave-types",
      "staff-rewards",
      "staff-trainings",
      "software-licenses",
      "software-license-assignments",
      "performance-reviews",
      "kpi",
      "position-histories",
    ],
  },
  {
    key: "recruitment",
    label: "Tuyển dụng",
    modules: [
      "recruitment",
      "recruitment-positions",
      "candidates",
      "candidate-applications",
      "recruitment-interviews",
      "recruitment-scorecards",
      "recruitment-offers",
    ],
  },
  {
    key: "finance",
    label: "Tài chính & lương",
    modules: [
      "invoices",
      "expenses",
      "payment-requests",
      "payrolls",
      "commissions",
      "accounting-vouchers",
      "accounting-reports",
      "accounting-voucher-lines",
      "accounting-periods",
      "accounting-chart-accounts",
      "accounting-fiscal-settings",
      "accounting-cash-flow-mappings",
    ],
  },
  {
    key: "projects",
    label: "Dự án & công việc",
    modules: ["projects", "tasks"],
  },
  {
    key: "workflow",
    label: "Workflow duyệt",
    modules: ["workflow-tasks", "workflow-instances", "workflow-definitions", "workflow-steps", "workflow-actions"],
  },
  {
    key: "landing",
    label: "Nội dung",
    modules: ["landing-pages", "landing-forms", "posts", "news", "services", "doctors", "videos", "landing-config", "landing-domains", "customer-app"],
  },
  {
    key: "admin",
    label: "Quản trị",
    modules: ["user-accounts", "branches"],
  },
]

export const appModuleLabels: Record<AppModuleKey, string> = {
  ...entityLabels,
  ...screenLabels,
  dashboard: "Feed",
  "company-feed": "Feed nội bộ",
  calendar: "Lịch tổng",
  "landing-pages": "Trang đích",
  "landing-forms": "Biểu mẫu",
  "landing-domains": "Tên miền",
  "landing-config": "Cài đặt site",
  "customer-app": "App khách hàng",
  kpi: "KPI & Hiệu suất",
  "business-monitor": "Monitor kinh doanh",
  "hr-monitor": "Monitor nhân sự",
  "project-monitor": "Monitor dự án",
  "inventory-monitor": "Monitor kho – hàng hoá",
  recruitment: "Tuyển dụng",
  services: "Dịch vụ",
  doctors: "Bác sĩ",
  videos: "Video ngắn",
}

export const allAppModuleKeys = Array.from(
  new Set([...appStandaloneModules, ...appModuleGroups.flatMap((group) => group.modules)]),
)

export function buildGroupedModuleOptions(labels: Record<string, string>, keys = Object.keys(labels)) {
  const included = new Set(keys)
  const grouped = new Set<string>()
  const options = appModuleGroups
    .map((group) => {
      const children = group.modules
        .filter((key) => included.has(key) && Boolean(labels[key]))
        .map((key) => ({ value: key, label: labels[key] }))
      children.forEach((item) => grouped.add(item.value))
      return children.length ? { label: group.label, options: children } : null
    })
    .filter(Boolean) as Array<{ label: string; options: Array<{ value: string; label: string }> }>
  const remaining = keys.filter((key) => !grouped.has(key) && Boolean(labels[key])).map((key) => ({ value: key, label: labels[key] }))
  if (remaining.length) options.push({ label: "Khác", options: remaining })
  return options
}

export const companyTypeDashboardCopy: Record<
  CompanyType,
  {
    title: string
    description: string
    operationsTitle: string
    quickStatsTitle: string
  }
> = {
  clinic: {
    title: "Tổng quan vận hành phòng khám",
    description: "Theo dõi khách hàng, lịch hẹn, điều trị, doanh thu và nhịp vận hành y tế trong ngày.",
    operationsTitle: "Nhịp vận hành trong ngày",
    quickStatsTitle: "Chỉ số cần chú ý",
  },
  retail: {
    title: "Tổng quan kinh doanh bán hàng",
    description: "Tập trung vào khách hàng, đơn bán, tồn kho, doanh thu và chi phí để điều hành cửa hàng hiệu quả.",
    operationsTitle: "Nhịp bán hàng trong ngày",
    quickStatsTitle: "Chỉ số thương mại cần chú ý",
  },
  cafe: {
    title: "Tổng quan vận hành quán cafe",
    description: "Theo dõi lượt khách, bán hàng, nguyên liệu, ca làm và dòng tiền trong ngày cho mô hình F&B nhỏ.",
    operationsTitle: "Nhịp vận hành quán trong ngày",
    quickStatsTitle: "Chỉ số quầy cần chú ý",
  },
  agriculture: {
    title: "Tổng quan vận hành nông nghiệp",
    description: "Theo dõi vật tư, hàng hóa, chi phí, nhân sự và dòng tiền để quản lý trang trại hoặc doanh nghiệp nông nghiệp.",
    operationsTitle: "Nhịp vận hành trong ngày",
    quickStatsTitle: "Chỉ số sản xuất cần chú ý",
  },
  general: {
    title: "Tổng quan doanh nghiệp",
    description: "Xem nhanh tình hình khách hàng, hàng hóa, tài chính và vận hành chung của doanh nghiệp.",
    operationsTitle: "Nhịp vận hành trong ngày",
    quickStatsTitle: "Chỉ số cần chú ý",
  },
}

export const menuGroupLabelsByCompanyType: Partial<
  Record<CompanyType, Partial<Record<string, string>>>
> = {
  retail: {
    "front-office": "Khách hàng & bán hàng",
    inventory: "Kho & hàng hóa",
    finance: "Doanh thu & chi phí",
  },
  cafe: {
    "front-office": "Khách hàng & phục vụ",
    inventory: "Kho & nguyên liệu",
    finance: "Thu chi & ca bán",
  },
  agriculture: {
    inventory: "Kho & vật tư",
    finance: "Chi phí & dòng tiền",
  },
  general: {
    "front-office": "Khách hàng & cơ hội",
    finance: "Tài chính vận hành",
  },
}

export const companyTypeModulePresets: Record<CompanyType, AppModuleKey[]> = {
  clinic: [
    "dashboard",
    "calendar",
    "landing-pages",
    "landing-forms",
    "posts",
    "news",
    "landing-domains",
    "landing-config",
    "projects",
    "tasks",
    "leads",
    "lead-activities",
    "customers",
    "appointments",
    "zalo-inbox",
    "medical-episodes",
    "consultations",
    "service-orders",
    "customer-images",
    "treatments",
    "rooms",
    "equipments",
    "suppliers",
    "products",
    "product-categories",
    "units",
    "stock-batches",
    "warehouses",
    "file-folders",
    "files",
    "work-contracts",
    "staff-insurances",
    "attendances",
    "leave-requests",
    "leave-types",
    "leave-allocations",
    "attendance-adjustment-requests",
    "business-trip-requests",
    "work-schedules",
    "staff-rewards",
    "staff-trainings",
    "performance-reviews",
    "position-histories",
    "staff",
    "departments",
    "invoices",
    "expenses",
    "commissions",
    "payrolls",
    "payment-requests",
    "accounting-periods",
    "accounting-chart-accounts",
    "accounting-fiscal-settings",
    "accounting-cash-flow-mappings",
    "accounting-vouchers",
    "accounting-voucher-lines",
    "accounting-reports",
    "branches",
    "user-accounts",
    "workflow-definitions",
    "workflow-steps",
    "workflow-instances",
    "workflow-tasks",
    "workflow-actions",
  ],
  retail: [
    "dashboard",
    "calendar",
    "landing-pages",
    "landing-forms",
    "posts",
    "news",
    "landing-domains",
    "landing-config",
    "projects",
    "tasks",
    "leads",
    "lead-activities",
    "customers",
    "suppliers",
    "products",
    "product-categories",
    "units",
    "stock-batches",
    "warehouses",
    "file-folders",
    "files",
    "work-contracts",
    "staff-insurances",
    "attendances",
    "leave-requests",
    "leave-types",
    "leave-allocations",
    "attendance-adjustment-requests",
    "business-trip-requests",
    "work-schedules",
    "staff-rewards",
    "staff-trainings",
    "performance-reviews",
    "position-histories",
    "staff",
    "departments",
    "invoices",
    "expenses",
    "commissions",
    "payrolls",
    "payment-requests",
    "accounting-periods",
    "accounting-chart-accounts",
    "accounting-fiscal-settings",
    "accounting-cash-flow-mappings",
    "accounting-vouchers",
    "accounting-voucher-lines",
    "accounting-reports",
    "branches",
    "user-accounts",
    "workflow-definitions",
    "workflow-steps",
    "workflow-instances",
    "workflow-tasks",
    "workflow-actions",
  ],
  cafe: [
    "dashboard",
    "calendar",
    "landing-pages",
    "landing-forms",
    "posts",
    "news",
    "landing-domains",
    "landing-config",
    "projects",
    "tasks",
    "leads",
    "lead-activities",
    "customers",
    "zalo-inbox",
    "suppliers",
    "products",
    "product-categories",
    "units",
    "stock-batches",
    "warehouses",
    "file-folders",
    "files",
    "work-contracts",
    "staff-insurances",
    "attendances",
    "leave-requests",
    "leave-types",
    "leave-allocations",
    "attendance-adjustment-requests",
    "business-trip-requests",
    "work-schedules",
    "staff-rewards",
    "staff-trainings",
    "performance-reviews",
    "position-histories",
    "staff",
    "departments",
    "invoices",
    "expenses",
    "commissions",
    "payrolls",
    "payment-requests",
    "accounting-periods",
    "accounting-chart-accounts",
    "accounting-fiscal-settings",
    "accounting-cash-flow-mappings",
    "accounting-vouchers",
    "accounting-voucher-lines",
    "accounting-reports",
    "branches",
    "user-accounts",
    "workflow-definitions",
    "workflow-steps",
    "workflow-instances",
    "workflow-tasks",
    "workflow-actions",
  ],
  agriculture: [
    "dashboard",
    "calendar",
    "landing-pages",
    "landing-forms",
    "posts",
    "news",
    "landing-domains",
    "landing-config",
    "projects",
    "tasks",
    "suppliers",
    "products",
    "product-categories",
    "units",
    "stock-batches",
    "warehouses",
    "file-folders",
    "files",
    "work-contracts",
    "staff-insurances",
    "attendances",
    "leave-requests",
    "leave-types",
    "leave-allocations",
    "attendance-adjustment-requests",
    "business-trip-requests",
    "work-schedules",
    "staff-rewards",
    "staff-trainings",
    "performance-reviews",
    "position-histories",
    "staff",
    "departments",
    "invoices",
    "expenses",
    "commissions",
    "payrolls",
    "payment-requests",
    "accounting-periods",
    "accounting-chart-accounts",
    "accounting-fiscal-settings",
    "accounting-cash-flow-mappings",
    "accounting-vouchers",
    "accounting-voucher-lines",
    "accounting-reports",
    "branches",
    "user-accounts",
    "workflow-definitions",
    "workflow-steps",
    "workflow-instances",
    "workflow-tasks",
    "workflow-actions",
  ],
  general: [
    "dashboard",
    "calendar",
    "landing-pages",
    "landing-forms",
    "posts",
    "news",
    "landing-domains",
    "landing-config",
    "projects",
    "tasks",
    "leads",
    "lead-activities",
    "customers",
    "suppliers",
    "products",
    "product-categories",
    "units",
    "stock-batches",
    "warehouses",
    "file-folders",
    "files",
    "work-contracts",
    "staff-insurances",
    "attendances",
    "leave-requests",
    "leave-types",
    "leave-allocations",
    "attendance-adjustment-requests",
    "business-trip-requests",
    "work-schedules",
    "staff-rewards",
    "staff-trainings",
    "performance-reviews",
    "position-histories",
    "staff",
    "departments",
    "invoices",
    "expenses",
    "commissions",
    "payrolls",
    "payment-requests",
    "accounting-periods",
    "accounting-chart-accounts",
    "accounting-fiscal-settings",
    "accounting-cash-flow-mappings",
    "accounting-vouchers",
    "accounting-voucher-lines",
    "accounting-reports",
    "branches",
    "user-accounts",
    "workflow-definitions",
    "workflow-steps",
    "workflow-instances",
    "workflow-tasks",
    "workflow-actions",
  ],
}

export function normalizeEnabledModules(value?: unknown): AppModuleKey[] {
  const raw = Array.isArray(value) ? value : []
  const normalized = raw
    .map((item) => String(item || "").trim())
    .filter((item): item is AppModuleKey => allAppModuleKeys.includes(item))
  return Array.from(new Set(normalized))
}

export function resolveEnabledModules(
  enabledModules: unknown,
  companyType: CompanyType,
  hasCustomModuleSelection = false,
) {
  const normalized = normalizeEnabledModules(enabledModules)
  // A custom selection is the tenant's source of truth. Do not append modules
  // here: doing so makes an item remain visible after an admin switches it off.
  if (hasCustomModuleSelection) return normalized
  // Customer app management is a shared User site capability for every
  // industry preset, including tenants created before this module existed.
  // A tenant starts with the complete product. Industry presets are retained
  // for reference, but no feature is hidden until an admin explicitly does so.
  return allAppModuleKeys
}

export function isModuleEnabled(moduleKey: string, enabledModules: unknown, companyType: CompanyType, hasCustomModuleSelection = false) {
  return resolveEnabledModules(enabledModules, companyType, hasCustomModuleSelection).includes(moduleKey)
}

export function resolveMenuGroupLabel(groupKey: string, fallbackLabel: string, companyType: CompanyType) {
  return menuGroupLabelsByCompanyType[companyType]?.[groupKey] || fallbackLabel
}
