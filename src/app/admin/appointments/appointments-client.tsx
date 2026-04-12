"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import styled from "styled-components";
import { tokens as t } from "@/components/ui/tokens";
import { Button } from "@/components/ui/button";
import { Field, TextField } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, Th, Tr, Td, TableEmpty, TableContainer } from "@/components/ui/table";
import { Modal, ModalBody, ModalFooter, ConfirmModal } from "@/components/ui/dialog";
import { SectionHeader } from "@/components/ui/card";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Plus, CalendarDays, ChevronLeft, ChevronRight, AlertTriangle, Calendar, List } from "lucide-react";
import {
  format, addDays, subDays, startOfToday,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addWeeks, subWeeks, addMonths, subMonths,
  isSameDay, isSameMonth, eachDayOfInterval,
} from "date-fns";
import { vi } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

type Appointment = {
  id: string; type: string; status: string;
  startTime: string; endTime: string; note: string | null;
  customer: { id: string; code: string; fullName: string; hasAllergy: boolean; hasChronicDisease: boolean };
  createdBy?: { fullName: string } | null;
  branch?: { name: string };
};
type ViewMode = "day" | "week" | "month" | "list";

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: "CONSULTATION", label: "Tư vấn" },
  { value: "SURGERY",      label: "Phẫu thuật" },
  { value: "FOLLOWUP",     label: "Tái khám" },
  { value: "TREATMENT",    label: "Điều trị" },
];
const TYPE_LABELS: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map(o => [o.value, o.label]));
const TYPE_APPEARANCE: Record<string, "primary" | "danger" | "success" | "discovery"> = {
  CONSULTATION: "primary", SURGERY: "danger", FOLLOWUP: "success", TREATMENT: "discovery",
};
const TYPE_CAL: Record<string, { border: string; bg: string; text: string }> = {
  CONSULTATION: { border: t.colorBrandBold,    bg: t.colorBrandSubtlest,     text: t.colorTextBrand },
  SURGERY:      { border: t.colorDangerBold,   bg: t.colorDangerSubtlest,    text: t.colorTextDanger },
  FOLLOWUP:     { border: t.colorSuccessBold,  bg: t.colorSuccessSubtlest,   text: t.colorTextSuccess },
  TREATMENT:    { border: t.colorDiscoveryBold,bg: t.colorDiscoverySubtlest, text: t.colorDiscoveryBold },
};

const STATUS_OPTIONS_FILTER = [
  { value: "",                    label: "Tất cả" },
  { value: "SCHEDULED",           label: "Đã đặt" },
  { value: "CONFIRMED",           label: "Xác nhận" },
  { value: "WAITING",             label: "Đang chờ" },
  { value: "IN_PROGRESS",         label: "Đang khám" },
  { value: "COMPLETED",           label: "Hoàn thành" },
  { value: "NO_SHOW",             label: "Không đến" },
  { value: "CANCELLED",           label: "Đã hủy" },
  { value: "PENDING_CONFIRMATION",label: "Chờ xác nhận" },
];
const STATUS_UPDATE_OPTIONS = STATUS_OPTIONS_FILTER.slice(1);
const STATUS_LABELS: Record<string, string> = Object.fromEntries(STATUS_OPTIONS_FILTER.slice(1).map(o => [o.value, o.label]));
const STATUS_APPEARANCE: Record<string, "default"|"primary"|"warning"|"success"|"danger"|"neutral"|"discovery"> = {
  SCHEDULED: "primary", CONFIRMED: "discovery", WAITING: "warning",
  IN_PROGRESS: "success", COMPLETED: "neutral", NO_SHOW: "danger",
  CANCELLED: "danger", PENDING_CONFIRMATION: "warning",
};

// Calendar geometry
const CAL_START  = 7;
const CAL_END    = 21;
const CAL_HR_PX  = 64;
const CAL_TOTAL  = (CAL_END - CAL_START) * CAL_HR_PX;
const CAL_TC     = 52; // time column width
const ALL_HOURS  = Array.from({ length: CAL_END - CAL_START }, (_, i) => CAL_START + i);
const VN_DAYS    = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

// ─── Schema ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  startTime: z.string().min(1, "Vui lòng chọn giờ bắt đầu"),
  endTime:   z.string().min(1, "Vui lòng chọn giờ kết thúc"),
  note:      z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTime(d: string) {
  try { return format(new Date(d), "HH:mm"); } catch { return "–"; }
}

function genSlots(): string[] {
  const s: string[] = [];
  for (let h = CAL_START; h < CAL_END; h++)
    for (let m = 0; m < 60; m += 15)
      s.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
  return s;
}
const ALL_SLOTS = genSlots();

function addMins(slot: string, mins: number): string {
  const [h, m] = slot.split(":").map(Number);
  const t2 = h * 60 + m + mins;
  const nh = Math.floor(t2 / 60), nm = t2 % 60;
  if (nh >= CAL_END) return "";
  return `${String(nh).padStart(2,"0")}:${String(nm).padStart(2,"0")}`;
}

function slotTop(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return ((h - CAL_START) * 60 + m) / 60 * CAL_HR_PX;
}
function slotH(s: string, e: string): number {
  const [sh, sm] = s.split(":").map(Number);
  const [eh, em] = e.split(":").map(Number);
  return Math.max(((eh * 60 + em) - (sh * 60 + sm)) / 60 * CAL_HR_PX, 20);
}

function byDay(appts: Appointment[]): Record<string, Appointment[]> {
  const m: Record<string, Appointment[]> = {};
  for (const a of appts) {
    try {
      const k = format(new Date(a.startTime), "yyyy-MM-dd");
      (m[k] ??= []).push(a);
    } catch { /* skip */ }
  }
  return m;
}

const HIDDEN = ["CANCELLED", "NO_SHOW"];
const visibleForCal = (appts: Appointment[]) => appts.filter(a => !HIDDEN.includes(a.status));

// ─── Styled — Toolbar ─────────────────────────────────────────────────────────

const ToolBar = styled.div`display:flex;gap:8px;align-items:center;flex-wrap:wrap;`;
const DateNav = styled.div`
  display:flex;align-items:center;gap:4px;
  background:${t.colorBgNeutral};border:1px solid ${t.colorBorder};
  border-radius:${t.radiusMd};padding:0 4px;height:32px;
`;
const DateLabel = styled.span`
  font-family:${t.fontFamily};font-size:${t.fontSizeMd};font-weight:600;
  color:${t.colorText};padding:0 8px;white-space:nowrap;min-width:160px;text-align:center;
`;
const ViewToggle = styled.div`
  display:flex;border:1px solid ${t.colorBorder};border-radius:${t.radiusMd};overflow:hidden;
`;
const VBtn = styled.button<{ $on: boolean }>`
  padding:0 11px;height:32px;border:none;cursor:pointer;
  font-family:${t.fontFamily};font-size:${t.fontSizeSm};
  background:${p => p.$on ? t.colorBgSelected : t.colorBgNeutral};
  color:${p => p.$on ? t.colorTextBrand : t.colorTextSubtle};
  font-weight:${p => p.$on ? 600 : 400};
  display:flex;align-items:center;gap:5px;
  transition:background ${t.durationFast};
  &:hover{background:${p => p.$on ? t.colorBgSelectedHover : t.colorBgNeutralHovered};}
`;

// ─── Styled — Shared Calendar ─────────────────────────────────────────────────

const CalWrap = styled.div`
  border:1px solid ${t.colorBorder};border-radius:${t.radiusLg};
  background:${t.colorBgDefault};
`;
const CalScroll = styled.div`overflow:auto;max-height:calc(100vh - 230px);`;
const TLabel = styled.div`
  position:absolute;left:0;width:${CAL_TC}px;
  font-family:${t.fontFamily};font-size:10px;color:${t.colorTextSubtlest};
  text-align:right;padding-right:8px;user-select:none;pointer-events:none;line-height:1;
`;
const TimeSlotRow = styled.div`
  font-family:${t.fontFamily};font-size:${t.fontSizeSm};color:${t.colorText};font-weight:600;
`;
const TimeRange = styled.div`
  font-family:${t.fontFamily};font-size:${t.fontSizeXs};color:${t.colorTextSubtle};
`;
const StatusActions = styled.div`display:flex;gap:6px;flex-wrap:wrap;`;

// ─── Styled — Week View ───────────────────────────────────────────────────────

const WeekHeaderRow = styled.div`
  display:flex;border-bottom:1px solid ${t.colorBorder};
  background:${t.colorBgNeutral};min-width:520px;
  position:sticky;top:0;z-index:10;
  border-radius:${t.radiusLg} ${t.radiusLg} 0 0;
`;
const WeekCorner = styled.div`
  width:${CAL_TC}px;flex-shrink:0;border-right:1px solid ${t.colorBorder};
`;
const WeekDH = styled.div<{ $today: boolean }>`
  flex:1;padding:5px 3px;text-align:center;border-left:1px solid ${t.colorBorder};
  background:${p => p.$today ? t.colorBrandSubtlest : "transparent"};
`;
const WeekDName = styled.div<{ $today: boolean }>`
  font-family:${t.fontFamily};font-size:10px;font-weight:700;letter-spacing:.5px;
  color:${p => p.$today ? t.colorTextBrand : t.colorTextSubtle};text-transform:uppercase;
`;
const WeekDDate = styled.div<{ $today: boolean }>`
  font-family:${t.fontFamily};font-size:${t.fontSizeSm};
  font-weight:${p => p.$today ? 700 : 400};
  color:${p => p.$today ? t.colorTextBrand : t.colorText};
`;

// ─── Styled — Month View ──────────────────────────────────────────────────────

const MonthHRow = styled.div`
  display:flex;border-bottom:1px solid ${t.colorBorder};background:${t.colorBgNeutral};
  border-radius:${t.radiusLg} ${t.radiusLg} 0 0;
`;
const MonthHCell = styled.div`
  flex:1;padding:6px 8px;text-align:center;
  font-family:${t.fontFamily};font-size:${t.fontSizeXs};font-weight:700;
  color:${t.colorTextSubtle};letter-spacing:.5px;text-transform:uppercase;
  border-left:1px solid ${t.colorBorder};
  &:first-child{border-left:none;}
`;
const MonthWRow = styled.div`display:flex;`;
const MonthCell = styled.div<{ $in: boolean; $today: boolean }>`
  flex:1;min-height:100px;padding:4px;overflow:hidden;
  border-left:1px solid ${t.colorBorder};border-bottom:1px solid ${t.colorBorder};
  background:${p => p.$today ? "#EFF4FF" : p.$in ? t.colorBgDefault : t.colorBgNeutral};
  cursor:pointer;transition:background ${t.durationFast};
  &:first-child{border-left:none;}
  &:hover{background:${p => p.$today ? t.colorBgSelectedHover : t.colorBgNeutralHovered};}
`;
const MonthNum = styled.div<{ $today: boolean }>`
  font-family:${t.fontFamily};font-size:${t.fontSizeSm};
  font-weight:${p => p.$today ? 700 : 400};
  color:${p => p.$today ? t.colorTextInverse : t.colorText};
  width:22px;height:22px;border-radius:${t.radiusFull};
  background:${p => p.$today ? t.colorBrandBold : "transparent"};
  display:flex;align-items:center;justify-content:center;
  margin-left:auto;margin-bottom:3px;
`;
const MonthChip = styled.div<{ $clr: string; $bg: string }>`
  font-family:${t.fontFamily};font-size:10px;font-weight:500;
  color:${p => p.$clr};background:${p => p.$bg};
  border-radius:${t.radiusSm};padding:1px 5px;margin-bottom:2px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;
  &:hover{opacity:.8;}
`;
const MonthMore = styled.div`
  font-family:${t.fontFamily};font-size:10px;color:${t.colorTextSubtle};padding:1px 5px;font-weight:500;
`;

// ─── Styled — Slot Picker ────────────────────────────────────────────────────

const SlotGrid = styled.div`
  display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));
  gap:4px;max-height:180px;overflow-y:auto;padding:2px;
  border:1px solid ${t.colorBorder};border-radius:${t.radiusMd};background:${t.colorBgNeutral};
`;
const SlotChip = styled.button<{ $sel: boolean; $dis: boolean }>`
  font-family:${t.fontFamily};font-size:${t.fontSizeSm};font-weight:${p => p.$sel ? 600 : 400};
  padding:6px 4px;border-radius:${t.radiusMd};text-align:center;
  border:1px solid ${p => p.$sel ? t.colorBorderSelected : "transparent"};
  background:${p => p.$sel ? t.colorBgSelected : t.colorBgDefault};
  color:${p => p.$dis ? t.colorTextDisabled : p.$sel ? t.colorTextBrand : t.colorText};
  cursor:${p => p.$dis ? "not-allowed" : "pointer"};
  opacity:${p => p.$dis ? .45 : 1};
  transition:background ${t.durationFast},border-color ${t.durationFast};
  &:hover:not(:disabled){background:${p => p.$sel ? t.colorBgSelectedHover : t.colorBgNeutralHovered};}
`;

// ─── TimeSlotPicker ───────────────────────────────────────────────────────────

function TimeSlotPicker({ value, onChange, disabledBefore }: {
  value: string; onChange: (v: string) => void; disabledBefore?: string;
}) {
  return (
    <SlotGrid>
      {ALL_SLOTS.map(s => {
        const dis = disabledBefore ? s <= disabledBefore : false;
        return (
          <SlotChip key={s} type="button" $sel={value === s} $dis={dis} disabled={dis} onClick={() => onChange(s)}>
            {s}
          </SlotChip>
        );
      })}
    </SlotGrid>
  );
}

// ─── ApptBlock ───────────────────────────────────────────────────────────────

function ApptBlock({ appt, top, height }: { appt: Appointment; top: number; height: number }) {
  const clr = TYPE_CAL[appt.type] ?? { border: t.N60, bg: t.N20, text: t.colorText };
  return (
    <div style={{
      position: "absolute", top: top + 1, left: 2, right: 2, height: height - 2,
      background: clr.bg, borderLeft: `3px solid ${clr.border}`,
      borderRadius: t.radiusSm, padding: "2px 5px", overflow: "hidden", zIndex: 1,
      boxShadow: "0 1px 2px rgba(9,30,66,.10)",
    }}>
      <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeXs, fontWeight: 700, color: clr.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {appt.customer.fullName}
      </div>
      {height >= 30 && (
        <div style={{ fontFamily: t.fontFamily, fontSize: 10, color: t.colorTextSubtle }}>
          {fmtTime(appt.startTime)}–{fmtTime(appt.endTime)}
        </div>
      )}
    </div>
  );
}

// ─── TimeGridCol — reusable grid column for day/week ─────────────────────────

function TimeGridCol({ appts, date, onSlotClick }: {
  appts: Appointment[]; date: Date;
  onSlotClick: (date: Date, time: string) => void;
}) {
  return (
    <div style={{ flex: 1, position: "relative", height: CAL_TOTAL }}>
      {ALL_HOURS.map(h => (
        <div key={h} style={{
          position: "absolute", left: 0, right: 0,
          top: (h - CAL_START) * CAL_HR_PX,
          borderTop: `1px solid ${t.colorBorder}`, pointerEvents: "none",
        }} />
      ))}
      {ALL_SLOTS.filter(s => !s.endsWith(":00")).map(s => {
        const [h, m] = s.split(":").map(Number);
        return (
          <div key={s} style={{
            position: "absolute", left: 0, right: 0,
            top: ((h - CAL_START) * 60 + m) / 60 * CAL_HR_PX,
            borderTop: `1px dashed ${t.N40}`, pointerEvents: "none",
          }} />
        );
      })}
      <div style={{
        position: "absolute", left: 0, right: 0, top: CAL_TOTAL,
        borderTop: `1px solid ${t.colorBorder}`, pointerEvents: "none",
      }} />
      {ALL_SLOTS.map(s => {
        const [h, m] = s.split(":").map(Number);
        return (
          <div key={s}
            title={`Đặt lịch ${s}`}
            onClick={() => onSlotClick(date, s)}
            style={{ position: "absolute", left: 0, right: 0, top: ((h - CAL_START) * 60 + m) / 60 * CAL_HR_PX, height: CAL_HR_PX / 4, cursor: "pointer", zIndex: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = t.colorBgNeutral; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
          />
        );
      })}
      {appts.map(a => {
        const st = fmtTime(a.startTime), et = fmtTime(a.endTime);
        if (st === "–" || et === "–") return null;
        return <ApptBlock key={a.id} appt={a} top={slotTop(st)} height={slotH(st, et)} />;
      })}
    </div>
  );
}

// ─── DayCalendarView ──────────────────────────────────────────────────────────

function DayCalendarView({ appts, date, onSlotClick }: {
  appts: Appointment[]; date: Date;
  onSlotClick: (date: Date, time: string) => void;
}) {
  return (
    <CalWrap>
      <CalScroll>
        <div style={{ display: "flex", height: CAL_TOTAL, position: "relative" }}>
          <div style={{ width: CAL_TC, flexShrink: 0, position: "relative" }}>
            {ALL_HOURS.map(h => (
              <TLabel key={h} style={{ top: (h - CAL_START) * CAL_HR_PX - 7 }}>
                {String(h).padStart(2,"0")}:00
              </TLabel>
            ))}
          </div>
          <div style={{ flex: 1, borderLeft: `1px solid ${t.colorBorder}` }}>
            <TimeGridCol appts={visibleForCal(appts)} date={date} onSlotClick={onSlotClick} />
          </div>
        </div>
      </CalScroll>
    </CalWrap>
  );
}

// ─── WeekCalendarView ─────────────────────────────────────────────────────────

function WeekCalendarView({ appts, weekDays, onSlotClick }: {
  appts: Appointment[]; weekDays: Date[];
  onSlotClick: (date: Date, time: string) => void;
}) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const map = byDay(visibleForCal(appts));

  return (
    <CalWrap>
      <CalScroll>
        <WeekHeaderRow>
          <WeekCorner />
          {weekDays.map((day, i) => {
            const isToday = format(day, "yyyy-MM-dd") === todayStr;
            return (
              <WeekDH key={i} $today={isToday}>
                <WeekDName $today={isToday}>{VN_DAYS[i]}</WeekDName>
                <WeekDDate $today={isToday}>{format(day, "dd/MM")}</WeekDDate>
              </WeekDH>
            );
          })}
        </WeekHeaderRow>

        <div style={{ display: "flex", minWidth: 520 }}>
          <div style={{ width: CAL_TC, flexShrink: 0, position: "relative", height: CAL_TOTAL }}>
            {ALL_HOURS.map(h => (
              <TLabel key={h} style={{ top: (h - CAL_START) * CAL_HR_PX - 7 }}>
                {String(h).padStart(2,"0")}:00
              </TLabel>
            ))}
          </div>
          {weekDays.map((day, i) => (
            <div key={i} style={{ flex: 1, borderLeft: `1px solid ${t.colorBorder}` }}>
              <TimeGridCol appts={map[format(day, "yyyy-MM-dd")] ?? []} date={day} onSlotClick={onSlotClick} />
            </div>
          ))}
        </div>
      </CalScroll>
    </CalWrap>
  );
}

// ─── MonthCalendarView ────────────────────────────────────────────────────────

function MonthCalendarView({ appts, selectedDate, onDayClick, onSlotClick }: {
  appts: Appointment[]; selectedDate: Date;
  onDayClick: (date: Date) => void;
  onSlotClick: (date: Date, time: string) => void;
}) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const map = byDay(visibleForCal(appts));

  const calStart = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
  const calEnd   = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });
  const allDays  = eachDayOfInterval({ start: calStart, end: calEnd });
  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));

  return (
    <CalWrap>
      <MonthHRow>
        {VN_DAYS.map(d => <MonthHCell key={d}>{d}</MonthHCell>)}
      </MonthHRow>
      {weeks.map((week, wi) => (
        <MonthWRow key={wi}>
          {week.map((day, di) => {
            const key      = format(day, "yyyy-MM-dd");
            const isToday  = key === todayStr;
            const inMonth  = isSameMonth(day, selectedDate);
            const dayAppts = map[key] ?? [];
            const shown    = dayAppts.slice(0, 3);
            const more     = dayAppts.length - shown.length;
            return (
              <MonthCell key={di} $in={inMonth} $today={isToday} onClick={() => onSlotClick(day, "08:00")}>
                <MonthNum $today={isToday}>{format(day, "d")}</MonthNum>
                {shown.map(a => {
                  const clr = TYPE_CAL[a.type] ?? { border: t.N60, bg: t.N20, text: t.colorText };
                  return (
                    <MonthChip key={a.id} $clr={clr.text} $bg={clr.bg}
                      onClick={e => { e.stopPropagation(); onDayClick(day); }}
                    >
                      {fmtTime(a.startTime)} {a.customer.fullName}
                    </MonthChip>
                  );
                })}
                {more > 0 && <MonthMore>+{more} khác</MonthMore>}
              </MonthCell>
            );
          })}
        </MonthWRow>
      ))}
    </CalWrap>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AppointmentsClient({ isSuperAdmin, branches = [] }: {
  isSuperAdmin: boolean;
  currentBranchId: string | null;
  branches?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const today = startOfToday();

  const [selectedDate, setSelectedDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]           = useState(true);
  const [viewMode, setViewMode]         = useState<ViewMode>("day");

  // Create modal
  const [open, setOpen]         = useState(false);
  const [saving, setSaving]     = useState(false);
  const [apptType, setApptType] = useState("");
  const [createDate, setCreateDate]     = useState(today);
  const [customerOptions, setCustomerOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedBranchId, setSelectedBranchId]     = useState(branches[0]?.id ?? "");

  // Status update
  const [updateTarget, setUpdateTarget]   = useState<Appointment | null>(null);
  const [newStatus, setNewStatus]         = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancelTarget, setCancelTarget]   = useState<Appointment | null>(null);

  const { handleSubmit, reset, register, setValue, watch, control, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { startTime: "", endTime: "", note: "" },
  });
  const watchStart = watch("startTime");
  const watchEnd   = watch("endTime");

  const weekDays = useMemo(() => {
    const ws = startOfWeek(selectedDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [selectedDate]);

  // ── Fetch ─────────────────────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: "1" });
      if (statusFilter) p.set("status", statusFilter);
      if (viewMode === "day") {
        p.set("date", format(selectedDate, "yyyy-MM-dd"));
      } else if (viewMode === "week") {
        p.set("dateFrom", format(weekDays[0], "yyyy-MM-dd"));
        p.set("dateTo",   format(weekDays[6], "yyyy-MM-dd"));
        p.set("pageSize", "200");
      } else if (viewMode === "month") {
        p.set("dateFrom", format(startOfMonth(selectedDate), "yyyy-MM-dd"));
        p.set("dateTo",   format(endOfMonth(selectedDate),   "yyyy-MM-dd"));
        p.set("pageSize", "500");
      } else {
        // list: show current day
        p.set("date", format(selectedDate, "yyyy-MM-dd"));
      }
      const res  = await fetch(`/api/appointments?${p}`);
      const json = await res.json();
      setAppointments(json.data ?? []);
    } finally { setLoading(false); }
  }, [selectedDate, statusFilter, viewMode, weekDays]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // ── Navigation ────────────────────────────────────────────────────
  const goBack = () => {
    if (viewMode === "week")  setSelectedDate(d => subWeeks(d, 1));
    else if (viewMode === "month") setSelectedDate(d => subMonths(d, 1));
    else setSelectedDate(d => subDays(d, 1));
  };
  const goFwd = () => {
    if (viewMode === "week")  setSelectedDate(d => addWeeks(d, 1));
    else if (viewMode === "month") setSelectedDate(d => addMonths(d, 1));
    else setSelectedDate(d => addDays(d, 1));
  };

  const dateLabel = useMemo(() => {
    if (viewMode === "month") return format(selectedDate, "MMMM yyyy", { locale: vi });
    if (viewMode === "week") return `${format(weekDays[0], "dd/MM")} – ${format(weekDays[6], "dd/MM/yyyy")}`;
    return format(selectedDate, "EEEE, dd/MM/yyyy", { locale: vi });
  }, [viewMode, selectedDate, weekDays]);

  const showTodayBtn = useMemo(() => {
    if (viewMode === "month") return !isSameMonth(selectedDate, today);
    if (viewMode === "week")  return !weekDays.some(d => isSameDay(d, today));
    return format(selectedDate, "yyyy-MM-dd") !== format(today, "yyyy-MM-dd");
  }, [viewMode, selectedDate, weekDays, today]);

  // ── Handlers ─────────────────────────────────────────────────────
  const openCreate = (date: Date, time?: string) => {
    setCreateDate(date);
    if (time) {
      setValue("startTime", time, { shouldValidate: false });
      const auto = addMins(time, 30);
      if (auto) setValue("endTime", auto, { shouldValidate: false });
    }
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false); reset();
    setApptType(""); setSelectedCustomerId("");
    setSelectedBranchId(branches[0]?.id ?? "");
  };

  const handleCustomerSearch = async (q: string) => {
    if (!q.trim()) { setCustomerOptions([]); return; }
    const res  = await fetch(`/api/customers?search=${encodeURIComponent(q)}&page=1`);
    const json = await res.json();
    setCustomerOptions((json.data ?? []).map((c: { id: string; code: string; fullName: string }) => ({
      value: c.id, label: `${c.fullName} (${c.code})`,
    })));
  };

  const onSubmit = async (data: CreateForm) => {
    if (!selectedCustomerId) return toast.error("Vui lòng chọn khách hàng");
    if (!apptType)           return toast.error("Vui lòng chọn loại lịch hẹn");
    if (data.endTime <= data.startTime) return toast.error("Giờ kết thúc phải sau giờ bắt đầu");
    setSaving(true);
    try {
      const dateStr = format(createDate, "yyyy-MM-dd");
      const res = await fetch("/api/appointments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId, type: apptType,
          startTime:  `${dateStr}T${data.startTime}`,
          endTime:    `${dateStr}T${data.endTime}`,
          note:       data.note,
          ...(isSuperAdmin ? { branchId: selectedBranchId } : {}),
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success("Đặt lịch hẹn thành công");
      onClose(); fetchAppointments();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSaving(false); }
  };

  const updateStatus = async () => {
    if (!updateTarget || !newStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/appointments/${updateTarget.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      toast.success("Cập nhật trạng thái thành công");
      setUpdateTarget(null); setNewStatus(""); fetchAppointments();
    } catch { toast.error("Không thể cập nhật trạng thái"); }
    finally { setUpdatingStatus(false); }
  };

  const cancelAppointment = async () => {
    if (!cancelTarget) return;
    try {
      const res = await fetch(`/api/appointments/${cancelTarget.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Đã hủy lịch hẹn"); setCancelTarget(null); fetchAppointments();
    } catch { toast.error("Không thể hủy lịch hẹn"); }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      <SectionHeader>
        <ToolBar>
          <DateNav>
            <Button appearance="subtle" onClick={goBack} style={{ padding: "0 6px", height: 24 }}><ChevronLeft size={14} /></Button>
            <DateLabel>{dateLabel}</DateLabel>
            <Button appearance="subtle" onClick={goFwd}  style={{ padding: "0 6px", height: 24 }}><ChevronRight size={14} /></Button>
          </DateNav>
          {showTodayBtn && (
            <Button appearance="subtle" onClick={() => setSelectedDate(today)}>
              <Calendar size={14} /> Hôm nay
            </Button>
          )}
          <Select options={STATUS_OPTIONS_FILTER} value={statusFilter} onChange={setStatusFilter} placeholder="Trạng thái" />
          <ViewToggle>
            <VBtn $on={viewMode === "day"}   onClick={() => setViewMode("day")}>Ngày</VBtn>
            <VBtn $on={viewMode === "week"}  onClick={() => setViewMode("week")}>Tuần</VBtn>
            <VBtn $on={viewMode === "month"} onClick={() => setViewMode("month")}>Tháng</VBtn>
            <VBtn $on={viewMode === "list"}  onClick={() => setViewMode("list")}><List size={13} /></VBtn>
          </ViewToggle>
        </ToolBar>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: t.fontSizeSm, color: t.colorTextSubtle, whiteSpace: "nowrap" }}>
            {appointments.length} lịch hẹn
          </span>
          <Button appearance="primary" onClick={() => openCreate(selectedDate)}>
            <Plus /> Đặt lịch
          </Button>
        </div>
      </SectionHeader>

      {loading && (
        <div style={{ padding: 40, textAlign: "center", color: t.colorTextSubtle, fontFamily: t.fontFamily }}>Đang tải...</div>
      )}

      {!loading && viewMode === "day" && (
        <DayCalendarView appts={appointments} date={selectedDate} onSlotClick={openCreate} />
      )}
      {!loading && viewMode === "week" && (
        <WeekCalendarView appts={appointments} weekDays={weekDays} onSlotClick={openCreate} />
      )}
      {!loading && viewMode === "month" && (
        <MonthCalendarView
          appts={appointments} selectedDate={selectedDate}
          onDayClick={day => { setSelectedDate(day); setViewMode("day"); }}
          onSlotClick={openCreate}
        />
      )}
      {!loading && viewMode === "list" && (
        <TableContainer>
          <Table>
            <TableHeader>
              <tr>
                <Th width={100}>Giờ</Th><Th>Khách hàng</Th>
                <Th width={110}>Loại</Th><Th width={140}>Trạng thái</Th>
                <Th>Ghi chú</Th><Th width={180}>Thao tác nhanh</Th>
              </tr>
            </TableHeader>
            <TableBody>
              {appointments.length === 0 ? (
                <TableEmpty colSpan={6} icon={<CalendarDays />} message="Không có lịch hẹn" />
              ) : appointments.map(a => (
                <Tr key={a.id}>
                  <Td>
                    <TimeSlotRow>{fmtTime(a.startTime)}</TimeSlotRow>
                    <TimeRange>{fmtTime(a.startTime)} – {fmtTime(a.endTime)}</TimeRange>
                  </Td>
                  <Td>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontWeight: 600, fontFamily: t.fontFamily, color: t.colorTextBrand, cursor: "pointer" }}
                        onClick={() => router.push(`/admin/customers/${a.customer.id}`)}>
                        {a.customer.fullName}
                      </span>
                      {a.customer.hasAllergy && <span title="Có dị ứng" style={{ color: t.colorDanger, display: "flex" }}><AlertTriangle size={11} /></span>}
                      {a.customer.hasChronicDisease && <span title="Bệnh mãn tính" style={{ color: t.colorWarningBold, display: "flex" }}><AlertTriangle size={11} /></span>}
                    </div>
                    <TimeRange style={{ fontFamily: t.fontFamily }}>{a.customer.code}</TimeRange>
                  </Td>
                  <Td><Badge appearance={TYPE_APPEARANCE[a.type] ?? "default"} styleVariant="subtle">{TYPE_LABELS[a.type] ?? a.type}</Badge></Td>
                  <Td><Badge appearance={STATUS_APPEARANCE[a.status] ?? "default"} styleVariant="subtle">{STATUS_LABELS[a.status] ?? a.status}</Badge></Td>
                  <Td muted>{a.note ?? "–"}</Td>
                  <Td>
                    <StatusActions>
                      {a.status === "SCHEDULED" && <Button appearance="subtle" onClick={() => { setUpdateTarget(a); setNewStatus("CONFIRMED"); }}>Xác nhận</Button>}
                      {(a.status === "CONFIRMED" || a.status === "SCHEDULED") && <Button appearance="subtle" onClick={() => { setUpdateTarget(a); setNewStatus("WAITING"); }}>Đang chờ</Button>}
                      {a.status === "WAITING"    && <Button appearance="primary" onClick={() => { setUpdateTarget(a); setNewStatus("IN_PROGRESS"); }}>Vào khám</Button>}
                      {a.status === "IN_PROGRESS"&& <Button appearance="primary" onClick={() => { setUpdateTarget(a); setNewStatus("COMPLETED"); }}>Hoàn thành</Button>}
                      {!["COMPLETED","CANCELLED","NO_SHOW"].includes(a.status) && <Button appearance="danger" onClick={() => setCancelTarget(a)}>Hủy</Button>}
                      {["SCHEDULED","CONFIRMED","WAITING","IN_PROGRESS"].includes(a.status) && <Button appearance="subtle" onClick={() => { setUpdateTarget(a); setNewStatus(a.status); }}>···</Button>}
                    </StatusActions>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create modal */}
      <Modal open={open} onOpenChange={onClose}
        title={`Đặt lịch hẹn — ${format(createDate, "EEEE, dd/MM/yyyy", { locale: vi })}`} size="lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {isSuperAdmin && branches.length > 0 && (
                <Field label="Chi nhánh" required>
                  <Select options={branches.map(b => ({ value: b.id, label: b.name }))} value={selectedBranchId} onChange={setSelectedBranchId} placeholder="Chọn chi nhánh" />
                </Field>
              )}
              <Field label="Khách hàng" required>
                <Autocomplete options={customerOptions} value={selectedCustomerId} onChange={setSelectedCustomerId} onSearch={handleCustomerSearch} placeholder="Tìm tên hoặc mã khách hàng..." clearable />
              </Field>
              <Field label="Loại lịch hẹn" required>
                <Select options={TYPE_OPTIONS} value={apptType} onChange={setApptType} placeholder="Chọn loại" />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Controller name="startTime" control={control} render={({ field }) => (
                  <Field label={field.value ? `Giờ bắt đầu — ${field.value}` : "Giờ bắt đầu"} required error={errors.startTime?.message}>
                    <TimeSlotPicker value={field.value} onChange={v => {
                      field.onChange(v);
                      if (watchEnd && watchEnd <= v) setValue("endTime", addMins(v, 30) || "", { shouldValidate: false });
                    }} />
                  </Field>
                )} />
                <Controller name="endTime" control={control} render={({ field }) => (
                  <Field label={field.value ? `Giờ kết thúc — ${field.value}` : "Giờ kết thúc"} required error={errors.endTime?.message}>
                    <TimeSlotPicker value={field.value} onChange={field.onChange} disabledBefore={watchStart} />
                  </Field>
                )} />
              </div>
              <Field label="Ghi chú">
                <TextField placeholder="Yêu cầu đặc biệt, lý do hẹn..." {...register("note")} />
              </Field>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" type="button" onClick={onClose}>Hủy</Button>
            <Button appearance="primary" type="submit" isDisabled={saving}>{saving ? "Đang lưu..." : "Đặt lịch"}</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Update status modal */}
      <Modal open={!!updateTarget} onOpenChange={o => { if (!o) { setUpdateTarget(null); setNewStatus(""); } }} title="Cập nhật trạng thái" size="xs">
        <ModalBody>
          {updateTarget && (
            <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeSm, color: t.colorTextSubtle, marginBottom: 12 }}>
              {updateTarget.customer.fullName} · {fmtTime(updateTarget.startTime)} – {fmtTime(updateTarget.endTime)}
            </div>
          )}
          <Field label="Trạng thái mới">
            <Select options={STATUS_UPDATE_OPTIONS} value={newStatus} onChange={setNewStatus} placeholder="Chọn trạng thái" />
          </Field>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={() => { setUpdateTarget(null); setNewStatus(""); }}>Hủy</Button>
          <Button appearance="primary" onClick={updateStatus} isDisabled={updatingStatus || !newStatus}>{updatingStatus ? "Đang lưu..." : "Cập nhật"}</Button>
        </ModalFooter>
      </Modal>

      <ConfirmModal
        open={!!cancelTarget}
        onOpenChange={o => { if (!o) setCancelTarget(null); }}
        title="Hủy lịch hẹn?"
        description={cancelTarget ? `Xác nhận hủy lịch hẹn của ${cancelTarget.customer.fullName} lúc ${fmtTime(cancelTarget.startTime)}?` : ""}
        confirmLabel="Hủy lịch hẹn" cancelLabel="Giữ lại" appearance="danger"
        onConfirm={cancelAppointment}
      />
    </>
  );
}
