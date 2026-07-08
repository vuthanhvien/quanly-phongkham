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

export const companyTypeLabels = Object.fromEntries(
  companyTypeOptions.map((item) => [item.value, item.label]),
) as Record<CompanyType, string>

export const appModuleGroups: AppModuleGroup[] = [
  {
    key: "front-office",
    label: "Lễ tân & CRM",
    modules: ["leads", "lead-activities", "customers", "appointments", "zalo-inbox"],
  },
  {
    key: "clinical",
    label: "Chuyên môn điều trị",
    companyTypes: ["clinic"],
    modules: ["medical-episodes", "consultations", "service-orders", "customer-images", "treatments", "rooms", "equipments"],
  },
  {
    key: "inventory",
    label: "Kho & mua hàng",
    modules: ["suppliers", "products", "product-categories", "stock-batches"],
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
      "work-contracts",
      "staff-insurances",
      "attendances",
      "leave-requests",
      "work-schedules",
      "staff-rewards",
      "staff-trainings",
      "performance-reviews",
      "position-histories",
      "staff",
      "departments",
    ],
  },
  {
    key: "finance",
    label: "Tài chính & lương",
    modules: [
      "invoices",
      "expenses",
      "commissions",
      "payrolls",
      "accounting-periods",
      "accounting-chart-accounts",
      "accounting-fiscal-settings",
      "accounting-cash-flow-mappings",
      "accounting-vouchers",
      "accounting-voucher-lines",
      "accounting-reports",
    ],
  },
  {
    key: "admin",
    label: "Quản trị",
    modules: ["branches", "user-accounts", "calendar"],
  },
]

export const appModuleLabels: Record<AppModuleKey, string> = {
  ...entityLabels,
  ...screenLabels,
  calendar: "Lịch tổng",
}

export const allAppModuleKeys = Array.from(
  new Set(appModuleGroups.flatMap((group) => group.modules)),
)

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
    "calendar",
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
    "stock-batches",
    "file-folders",
    "files",
    "work-contracts",
    "staff-insurances",
    "attendances",
    "leave-requests",
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
    "accounting-periods",
    "accounting-chart-accounts",
    "accounting-fiscal-settings",
    "accounting-cash-flow-mappings",
    "accounting-vouchers",
    "accounting-voucher-lines",
    "accounting-reports",
    "branches",
    "user-accounts",
  ],
  retail: [
    "calendar",
    "leads",
    "lead-activities",
    "customers",
    "suppliers",
    "products",
    "product-categories",
    "stock-batches",
    "file-folders",
    "files",
    "work-contracts",
    "staff-insurances",
    "attendances",
    "leave-requests",
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
    "accounting-periods",
    "accounting-chart-accounts",
    "accounting-fiscal-settings",
    "accounting-cash-flow-mappings",
    "accounting-vouchers",
    "accounting-voucher-lines",
    "accounting-reports",
    "branches",
    "user-accounts",
  ],
  cafe: [
    "calendar",
    "leads",
    "lead-activities",
    "customers",
    "zalo-inbox",
    "suppliers",
    "products",
    "product-categories",
    "stock-batches",
    "file-folders",
    "files",
    "work-contracts",
    "staff-insurances",
    "attendances",
    "leave-requests",
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
    "accounting-periods",
    "accounting-chart-accounts",
    "accounting-fiscal-settings",
    "accounting-cash-flow-mappings",
    "accounting-vouchers",
    "accounting-voucher-lines",
    "accounting-reports",
    "branches",
    "user-accounts",
  ],
  agriculture: [
    "calendar",
    "suppliers",
    "products",
    "product-categories",
    "stock-batches",
    "file-folders",
    "files",
    "work-contracts",
    "staff-insurances",
    "attendances",
    "leave-requests",
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
    "accounting-periods",
    "accounting-chart-accounts",
    "accounting-fiscal-settings",
    "accounting-cash-flow-mappings",
    "accounting-vouchers",
    "accounting-voucher-lines",
    "accounting-reports",
    "branches",
    "user-accounts",
  ],
  general: [
    "calendar",
    "leads",
    "lead-activities",
    "customers",
    "suppliers",
    "products",
    "product-categories",
    "stock-batches",
    "file-folders",
    "files",
    "work-contracts",
    "staff-insurances",
    "attendances",
    "leave-requests",
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
    "accounting-periods",
    "accounting-chart-accounts",
    "accounting-fiscal-settings",
    "accounting-cash-flow-mappings",
    "accounting-vouchers",
    "accounting-voucher-lines",
    "accounting-reports",
    "branches",
    "user-accounts",
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
) {
  const normalized = normalizeEnabledModules(enabledModules)
  if (normalized.length > 0) return normalized
  return companyTypeModulePresets[companyType]
}

export function isModuleEnabled(moduleKey: string, enabledModules: unknown, companyType: CompanyType) {
  return resolveEnabledModules(enabledModules, companyType).includes(moduleKey)
}

export function resolveMenuGroupLabel(groupKey: string, fallbackLabel: string, companyType: CompanyType) {
  return menuGroupLabelsByCompanyType[companyType]?.[groupKey] || fallbackLabel
}
