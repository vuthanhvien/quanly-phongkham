import { companyTypeOptions, type AppUiSettings } from "./app-ui"

export type CompanyType = AppUiSettings["companyType"]

export const companyTypeLabels = Object.fromEntries(
  companyTypeOptions.map((item) => [item.value, item.label]),
) as Record<CompanyType, string>

const resourceCompanyTypes: Partial<Record<string, ReadonlyArray<CompanyType>>> = {
  appointments: ["clinic"],
  "medical-episodes": ["clinic"],
  consultations: ["clinic"],
  "service-orders": ["clinic"],
  "customer-images": ["clinic"],
  treatments: ["clinic"],
  rooms: ["clinic"],
  equipments: ["clinic"],
  leads: ["clinic", "retail", "cafe", "general"],
  "lead-activities": ["clinic", "retail", "cafe", "general"],
  customers: ["clinic", "retail", "cafe", "general"],
  suppliers: ["clinic", "retail", "cafe", "agriculture", "general"],
  products: ["clinic", "retail", "cafe", "agriculture", "general"],
  "product-categories": ["clinic", "retail", "cafe", "agriculture", "general"],
  "stock-batches": ["clinic", "retail", "cafe", "agriculture", "general"],
  invoices: ["clinic", "retail", "cafe", "agriculture", "general"],
  expenses: ["clinic", "retail", "cafe", "agriculture", "general"],
  commissions: ["clinic", "retail", "cafe", "agriculture", "general"],
  payrolls: ["clinic", "retail", "cafe", "agriculture", "general"],
}

export function isResourceEnabledForCompanyType(resource: string, companyType: CompanyType) {
  const allowedTypes = resourceCompanyTypes[resource]
  if (!allowedTypes) return true
  return allowedTypes.includes(companyType)
}
