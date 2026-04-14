"use client"

import { useState, useEffect, useCallback } from "react"
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
} from "date-fns"
import { vi } from "date-fns/locale"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

type Appointment = {
  id: string
  startTime: string
  endTime: string
  type: string
  status: string
  customer: { fullName: string; phone: string | null }
  branch: { name: string }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const APPT_TYPE_LABELS: Record<string, string> = {
  CONSULTATION: "Tư vấn",
  SURGERY:      "Phẫu thuật",
  FOLLOWUP:     "Tái khám",
  TREATMENT:    "Điều trị",
}

const APPT_STATUS_LABELS: Record<string, string> = {
  SCHEDULED:            "Lên lịch",
  CONFIRMED:            "Xác nhận",
  IN_PROGRESS:          "Đang thực hiện",
  DONE:                 "Hoàn thành",
  NO_SHOW:              "Không đến",
  CANCELLED:            "Huỷ",
  PENDING_CONFIRMATION: "Chờ xác nhận",
}

const STATUS_DOT: Record<string, string> = {
  SCHEDULED:            "bg-blue-400",
  CONFIRMED:            "bg-green-500",
  IN_PROGRESS:          "bg-yellow-400",
  DONE:                 "bg-gray-400",
  NO_SHOW:              "bg-red-400",
  CANCELLED:            "bg-red-300",
  PENDING_CONFIRMATION: "bg-orange-400",
}

const TYPE_COLOR: Record<string, string> = {
  CONSULTATION: "border-l-blue-400",
  SURGERY:      "border-l-red-400",
  FOLLOWUP:     "border-l-green-400",
  TREATMENT:    "border-l-purple-400",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(d: string) {
  return format(new Date(d), "HH:mm")
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StaffCalendar({
  role,
  branchId,
}: {
  role: string
  branchId: string | null
}) {
  const [weekBase, setWeekBase] = useState(() => new Date())
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const weekStart = startOfWeek(weekBase, { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(weekBase,   { weekStartsOn: 1 })
  const days      = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const from = format(weekStart, "yyyy-MM-dd")
      const to   = format(weekEnd,   "yyyy-MM-dd")
      const res  = await fetch(
        `/api/appointments?dateFrom=${from}&dateTo=${to}&pageSize=200`,
      )
      const json = await res.json()
      setAppointments(json.data ?? [])
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekBase])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const apptsByDay = (day: Date) =>
    appointments.filter((a) => isSameDay(new Date(a.startTime), day))

  const totalThisWeek = appointments.filter(
    (a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW",
  ).length

  const roleLabel: Record<string, string> = {
    DOCTOR:       "Bác sĩ",
    NURSE:        "Điều dưỡng",
    RECEPTIONIST: "Lễ tân",
    SALE:         "Tư vấn",
    WAREHOUSE:    "Kho",
    ACCOUNTANT:   "Kế toán",
  }

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Lịch tuần — {roleLabel[role] ?? role}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(weekStart, "dd/MM", { locale: vi })} –{" "}
            {format(weekEnd, "dd/MM/yyyy", { locale: vi })}
            &nbsp;·&nbsp;
            {totalThisWeek} lịch hẹn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekBase((w) => subWeeks(w, 1))}
            className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => setWeekBase(new Date())}
            className="h-8 px-3 rounded-md border text-xs font-medium hover:bg-muted transition-colors"
          >
            Tuần này
          </button>
          <button
            onClick={() => setWeekBase((w) => addWeeks(w, 1))}
            className="h-8 w-8 rounded-md border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-3">
        {days.map((day) => {
          const dayAppts = apptsByDay(day)
          const isCurrentDay = isToday(day)

          return (
            <div
              key={day.toISOString()}
              className={`rounded-xl border bg-white flex flex-col min-h-[200px] ${
                isCurrentDay ? "border-blue-400 shadow-sm" : "border-border"
              }`}
            >
              {/* Day header */}
              <div
                className={`px-3 py-2 rounded-t-xl text-center ${
                  isCurrentDay
                    ? "bg-blue-50 border-b border-blue-200"
                    : "bg-muted/40 border-b border-border"
                }`}
              >
                <div
                  className={`text-xs font-medium ${
                    isCurrentDay ? "text-blue-700" : "text-muted-foreground"
                  }`}
                >
                  {format(day, "EEE", { locale: vi }).toUpperCase()}
                </div>
                <div
                  className={`text-lg font-bold leading-tight ${
                    isCurrentDay ? "text-blue-600" : "text-foreground"
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>

              {/* Appointments */}
              <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
                {loading ? (
                  <div className="text-xs text-muted-foreground text-center pt-4">
                    ...
                  </div>
                ) : dayAppts.length === 0 ? (
                  <div className="text-xs text-muted-foreground/50 text-center pt-6">
                    –
                  </div>
                ) : (
                  dayAppts.map((a) => (
                    <div
                      key={a.id}
                      className={`border-l-2 pl-2 pr-1 py-1 rounded-r bg-muted/30 hover:bg-muted/60 transition-colors cursor-default ${
                        TYPE_COLOR[a.type] ?? "border-l-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            STATUS_DOT[a.status] ?? "bg-gray-400"
                          }`}
                        />
                        <span className="text-[11px] font-mono text-muted-foreground leading-none">
                          {fmtTime(a.startTime)}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-foreground truncate leading-tight">
                        {a.customer.fullName}
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-tight">
                        {APPT_TYPE_LABELS[a.type] ?? a.type}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
        <span className="text-xs text-muted-foreground font-medium">
          Trạng thái:
        </span>
        {Object.entries(APPT_STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${STATUS_DOT[key] ?? "bg-gray-400"}`}
            />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {!loading && appointments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <CalendarDays size={40} className="opacity-30" />
          <p className="text-sm">Không có lịch hẹn nào trong tuần này.</p>
        </div>
      )}
    </div>
  )
}
