export interface DashboardMetric {
  title: string
  value: number
  suffix: string
  icon: React.ReactNode
  tone: string
  trend: string
}

export interface DashboardPipeline {
  label: string
  value: number
  color: string
  count: number
}

export interface DashboardEvent {
  id: string
  type: "appointment" | "schedule"
  title: string
  start: string
  end?: string
  tone: string
  meta: string
}

export interface QuickStat {
  label: string
  value: string
  hint: string
}

export interface ActivityItem {
  id: string
  title: string
  meta: string
  tone: string
}

export type CalendarMode = "day" | "week" | "month"

export interface ListPayload<T> {
  data: T[]
  total: number
}
