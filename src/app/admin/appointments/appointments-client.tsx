"use client";

import { useState, useEffect, useCallback } from "react";
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
import { format, addDays, subDays, startOfToday } from "date-fns";
import { vi } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

type Appointment = {
  id: string; type: string; status: string;
  startTime: string; endTime: string; note: string | null;
  customer: { id: string; code: string; fullName: string; hasAllergy: boolean; hasChronicDisease: boolean };
  createdBy?: { fullName: string } | null;
  branch?: { name: string };
};

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
const TYPE_CAL_COLORS: Record<string, { border: string; bg: string; text: string }> = {
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
const STATUS_APPEARANCE: Record<string, "default" | "primary" | "warning" | "success" | "danger" | "neutral" | "discovery"> = {
  SCHEDULED: "primary", CONFIRMED: "discovery", WAITING: "warning",
  IN_PROGRESS: "success", COMPLETED: "neutral", NO_SHOW: "danger",
  CANCELLED: "danger", PENDING_CONFIRMATION: "warning",
};

// Calendar constants
const CAL_START_HOUR  = 7;
const CAL_END_HOUR    = 21;
const CAL_HOUR_PX     = 64; // px per hour
const CAL_TOTAL_PX    = (CAL_END_HOUR - CAL_START_HOUR) * CAL_HOUR_PX;
const CAL_TIME_COL_W  = 52; // px

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

function generateTimeSlots(startH = CAL_START_HOUR, endH = CAL_END_HOUR): string[] {
  const slots: string[] = [];
  for (let h = startH; h < endH; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`);
    }
  }
  return slots;
}
const ALL_TIME_SLOTS = generateTimeSlots();

function addMinutesToSlot(slot: string, minutes: number): string {
  const [h, m] = slot.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  if (nh >= CAL_END_HOUR) return "";
  return `${String(nh).padStart(2,"0")}:${String(nm).padStart(2,"0")}`;
}

// ─── Styled — General ────────────────────────────────────────────────────────

const ToolBar = styled.div`display: flex; gap: 8px; align-items: center; flex-wrap: wrap;`;

const DateNav = styled.div`
  display: flex; align-items: center; gap: 4px;
  background: ${t.colorBgNeutral}; border: 1px solid ${t.colorBorder};
  border-radius: ${t.radiusMd}; padding: 0 4px; height: 32px;
`;
const DateLabel = styled.span`
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeMd}; font-weight: 600;
  color: ${t.colorText}; padding: 0 8px; white-space: nowrap; min-width: 140px; text-align: center;
`;

const TimeSlotDisplay = styled.div`
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeSm};
  color: ${t.colorText}; font-weight: 600;
`;
const TimeRange = styled.div`
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeXs}; color: ${t.colorTextSubtle};
`;
const StatusActions = styled.div`display: flex; gap: 6px; flex-wrap: wrap;`;

const ViewToggle = styled.div`
  display: flex; border: 1px solid ${t.colorBorder}; border-radius: ${t.radiusMd}; overflow: hidden;
`;
const ViewToggleBtn = styled.button<{ $active: boolean }>`
  display: flex; align-items: center; gap: 5px;
  padding: 0 10px; height: 32px; border: none; cursor: pointer;
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeSm};
  background: ${p => p.$active ? t.colorBgSelected : t.colorBgNeutral};
  color: ${p => p.$active ? t.colorTextBrand : t.colorTextSubtle};
  font-weight: ${p => p.$active ? 600 : 400};
  transition: background ${t.durationFast};
  &:hover { background: ${p => p.$active ? t.colorBgSelectedHover : t.colorBgNeutralHovered}; }
`;

// ─── Styled — Calendar ───────────────────────────────────────────────────────

const CalWrap = styled.div`
  border: 1px solid ${t.colorBorder};
  border-radius: ${t.radiusLg};
  overflow: hidden;
  background: ${t.colorBgDefault};
`;

const CalScroll = styled.div`
  overflow-y: auto;
  max-height: calc(100vh - 230px);
`;

const CalInner = styled.div`
  position: relative;
  height: ${CAL_TOTAL_PX}px;
  min-width: 400px;
`;

const CalHourLabel = styled.div`
  position: absolute;
  left: 0;
  width: ${CAL_TIME_COL_W}px;
  font-family: ${t.fontFamily};
  font-size: 10px;
  color: ${t.colorTextSubtlest};
  text-align: right;
  padding-right: 8px;
  user-select: none;
  pointer-events: none;
  line-height: 1;
`;

const CalGridArea = styled.div`
  position: absolute;
  left: ${CAL_TIME_COL_W}px;
  right: 0; top: 0; bottom: 0;
  border-left: 1px solid ${t.colorBorder};
`;

// ─── Styled — Time Slot Picker ───────────────────────────────────────────────

const SlotPickerWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 4px;
  max-height: 180px;
  overflow-y: auto;
  padding: 2px;
  border: 1px solid ${t.colorBorder};
  border-radius: ${t.radiusMd};
  background: ${t.colorBgNeutral};
`;

const SlotChip = styled.button<{ $sel: boolean; $dis: boolean }>`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  font-weight: ${p => p.$sel ? 600 : 400};
  padding: 6px 4px;
  border-radius: ${t.radiusMd};
  border: 1px solid ${p => p.$sel ? t.colorBorderSelected : "transparent"};
  background: ${p => p.$sel ? t.colorBgSelected : t.colorBgDefault};
  color: ${p => p.$dis ? t.colorTextDisabled : p.$sel ? t.colorTextBrand : t.colorText};
  cursor: ${p => p.$dis ? "not-allowed" : "pointer"};
  opacity: ${p => p.$dis ? 0.45 : 1};
  text-align: center;
  transition: background ${t.durationFast}, border-color ${t.durationFast};
  &:hover:not(:disabled) {
    background: ${p => p.$sel ? t.colorBgSelectedHover : t.colorBgNeutralHovered};
  }
`;

// ─── TimeSlotPicker ───────────────────────────────────────────────────────────

function TimeSlotPicker({ value, onChange, disabledBefore }: {
  value: string;
  onChange: (v: string) => void;
  disabledBefore?: string;
}) {
  return (
    <SlotPickerWrap>
      {ALL_TIME_SLOTS.map(slot => {
        const disabled = disabledBefore ? slot <= disabledBefore : false;
        return (
          <SlotChip
            key={slot} type="button"
            $sel={value === slot} $dis={disabled}
            disabled={disabled}
            onClick={() => onChange(slot)}
          >
            {slot}
          </SlotChip>
        );
      })}
    </SlotPickerWrap>
  );
}

// ─── DayCalendarView ─────────────────────────────────────────────────────────

function DayCalendarView({
  appointments, onSlotClick,
}: {
  appointments: Appointment[];
  onSlotClick: (time: string) => void;
}) {
  const hours = Array.from({ length: CAL_END_HOUR - CAL_START_HOUR }, (_, i) => CAL_START_HOUR + i);

  return (
    <CalWrap>
      <CalScroll>
        <CalInner>
          {/* Hour labels + grid lines */}
          {hours.map(h => {
            const top = (h - CAL_START_HOUR) * CAL_HOUR_PX;
            return (
              <div key={h}>
                {/* Hour label */}
                <CalHourLabel style={{ top: top - 7 }}>
                  {String(h).padStart(2,"0")}:00
                </CalHourLabel>
                {/* Hour border */}
                <div style={{
                  position: "absolute", left: CAL_TIME_COL_W, right: 0, top,
                  borderTop: `1px solid ${t.colorBorder}`, pointerEvents: "none",
                }} />
                {/* 15-min sub-lines */}
                {[15, 30, 45].map(m => (
                  <div key={m} style={{
                    position: "absolute", left: CAL_TIME_COL_W, right: 0,
                    top: top + (m / 60) * CAL_HOUR_PX,
                    borderTop: `1px dashed ${t.N40}`, pointerEvents: "none",
                  }} />
                ))}
              </div>
            );
          })}

          {/* Bottom border */}
          <div style={{
            position: "absolute", left: CAL_TIME_COL_W, right: 0,
            top: CAL_TOTAL_PX, borderTop: `1px solid ${t.colorBorder}`, pointerEvents: "none",
          }} />

          <CalGridArea>
            {/* Clickable 15-min slots */}
            {ALL_TIME_SLOTS.map(slot => {
              const [h, m] = slot.split(":").map(Number);
              const top = ((h - CAL_START_HOUR) * 60 + m) / 60 * CAL_HOUR_PX;
              return (
                <div
                  key={slot}
                  title={`Đặt lịch lúc ${slot}`}
                  onClick={() => onSlotClick(slot)}
                  style={{
                    position: "absolute", left: 0, right: 0,
                    top, height: CAL_HOUR_PX / 4,
                    cursor: "pointer", zIndex: 0,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = t.colorBgNeutral; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = ""; }}
                />
              );
            })}

            {/* Appointment blocks */}
            {appointments.map(a => {
              const startStr = fmtTime(a.startTime);
              const endStr   = fmtTime(a.endTime);
              if (startStr === "–" || endStr === "–") return null;
              const [sh, sm] = startStr.split(":").map(Number);
              const [eh, em] = endStr.split(":").map(Number);
              const top      = ((sh - CAL_START_HOUR) * 60 + sm) / 60 * CAL_HOUR_PX;
              const durMin   = (eh * 60 + em) - (sh * 60 + sm);
              const height   = Math.max(durMin / 60 * CAL_HOUR_PX, 22);
              const clr      = TYPE_CAL_COLORS[a.type] ?? { border: t.N60, bg: t.N20, text: t.colorText };

              return (
                <div key={a.id} style={{
                  position: "absolute", top: top + 1, left: 4, right: 4, height: height - 2,
                  background: clr.bg, borderLeft: `3px solid ${clr.border}`,
                  borderRadius: t.radiusSm, padding: "3px 6px",
                  overflow: "hidden", zIndex: 1,
                  boxShadow: "0 1px 2px rgba(9,30,66,0.12)",
                }}>
                  <div style={{
                    fontFamily: t.fontFamily, fontSize: t.fontSizeXs, fontWeight: 700,
                    color: clr.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {a.customer.fullName}
                  </div>
                  {height >= 34 && (
                    <div style={{ fontFamily: t.fontFamily, fontSize: 10, color: t.colorTextSubtle }}>
                      {startStr}–{endStr} · {TYPE_LABELS[a.type] ?? a.type}
                    </div>
                  )}
                </div>
              );
            })}
          </CalGridArea>
        </CalInner>
      </CalScroll>
    </CalWrap>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

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
  const [viewMode, setViewMode]         = useState<"list" | "calendar">("calendar");

  // Create modal
  const [open, setOpen]         = useState(false);
  const [saving, setSaving]     = useState(false);
  const [apptType, setApptType] = useState("");
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

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const params  = new URLSearchParams({ date: dateStr, page: "1" });
      if (statusFilter) params.set("status", statusFilter);
      const res  = await fetch(`/api/appointments?${params}`);
      const json = await res.json();
      setAppointments(json.data ?? []);
    } finally { setLoading(false); }
  }, [selectedDate, statusFilter]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleCustomerSearch = async (q: string) => {
    if (!q.trim()) { setCustomerOptions([]); return; }
    const res  = await fetch(`/api/customers?search=${encodeURIComponent(q)}&page=1`);
    const json = await res.json();
    setCustomerOptions((json.data ?? []).map((c: { id: string; code: string; fullName: string }) => ({
      value: c.id, label: `${c.fullName} (${c.code})`,
    })));
  };

  const onClose = () => {
    setOpen(false); reset();
    setApptType(""); setSelectedCustomerId("");
    setSelectedBranchId(branches[0]?.id ?? "");
  };

  // When clicking a slot in the calendar, pre-fill start/end time
  const handleCalSlotClick = (time: string) => {
    setValue("startTime", time, { shouldValidate: false });
    const auto = addMinutesToSlot(time, 30);
    if (auto) setValue("endTime", auto, { shouldValidate: false });
    setOpen(true);
  };

  const onSubmit = async (data: CreateForm) => {
    if (!selectedCustomerId) return toast.error("Vui lòng chọn khách hàng");
    if (!apptType)           return toast.error("Vui lòng chọn loại lịch hẹn");
    if (data.endTime <= data.startTime) return toast.error("Giờ kết thúc phải sau giờ bắt đầu");
    setSaving(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const res = await fetch("/api/appointments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          type:       apptType,
          startTime:  `${dateStr}T${data.startTime}`,
          endTime:    `${dateStr}T${data.endTime}`,
          note:       data.note,
          ...(isSuperAdmin ? { branchId: selectedBranchId } : {}),
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success("Đặt lịch hẹn thành công");
      onClose(); fetchAppointments();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setSaving(false); }
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
      setUpdateTarget(null); setNewStatus("");
      fetchAppointments();
    } catch {
      toast.error("Không thể cập nhật trạng thái");
    } finally { setUpdatingStatus(false); }
  };

  const cancelAppointment = async () => {
    if (!cancelTarget) return;
    try {
      const res = await fetch(`/api/appointments/${cancelTarget.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Đã hủy lịch hẹn");
      setCancelTarget(null); fetchAppointments();
    } catch {
      toast.error("Không thể hủy lịch hẹn");
    }
  };

  const dateLabel = format(selectedDate, "EEEE, dd/MM/yyyy", { locale: vi });
  const isToday   = format(selectedDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

  return (
    <>
      <SectionHeader>
        <ToolBar>
          {/* Date navigator */}
          <DateNav>
            <Button appearance="subtle" onClick={() => setSelectedDate(d => subDays(d, 1))} style={{ padding: "0 6px", height: 24 }}>
              <ChevronLeft size={14} />
            </Button>
            <DateLabel>{dateLabel}</DateLabel>
            <Button appearance="subtle" onClick={() => setSelectedDate(d => addDays(d, 1))} style={{ padding: "0 6px", height: 24 }}>
              <ChevronRight size={14} />
            </Button>
          </DateNav>
          {!isToday && (
            <Button appearance="subtle" onClick={() => setSelectedDate(today)}>
              <Calendar size={14} /> Hôm nay
            </Button>
          )}
          <Select options={STATUS_OPTIONS_FILTER} value={statusFilter} onChange={setStatusFilter} placeholder="Trạng thái" />

          {/* View toggle */}
          <ViewToggle>
            <ViewToggleBtn $active={viewMode === "calendar"} onClick={() => setViewMode("calendar")}>
              <CalendarDays size={13} /> Lịch
            </ViewToggleBtn>
            <ViewToggleBtn $active={viewMode === "list"} onClick={() => setViewMode("list")}>
              <List size={13} /> Danh sách
            </ViewToggleBtn>
          </ViewToggle>
        </ToolBar>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: t.fontSizeSm, color: t.colorTextSubtle, whiteSpace: "nowrap" }}>
            {appointments.length} lịch hẹn
          </span>
          <Button appearance="primary" onClick={() => setOpen(true)}>
            <Plus /> Đặt lịch
          </Button>
        </div>
      </SectionHeader>

      {/* ─── Calendar view ─────────────────────────────────────────────── */}
      {viewMode === "calendar" && (
        loading ? (
          <div style={{ padding: 40, textAlign: "center", color: t.colorTextSubtle, fontFamily: t.fontFamily }}>
            Đang tải...
          </div>
        ) : (
          <DayCalendarView appointments={appointments} onSlotClick={handleCalSlotClick} />
        )
      )}

      {/* ─── List / Table view ─────────────────────────────────────────── */}
      {viewMode === "list" && (
        <TableContainer>
          <Table>
            <TableHeader>
              <tr>
                <Th width={100}>Giờ</Th>
                <Th>Khách hàng</Th>
                <Th width={110}>Loại</Th>
                <Th width={140}>Trạng thái</Th>
                <Th>Ghi chú</Th>
                <Th width={180}>Thao tác nhanh</Th>
              </tr>
            </TableHeader>
            <TableBody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: t.colorTextSubtle, fontFamily: t.fontFamily }}>Đang tải...</td></tr>
              ) : appointments.length === 0 ? (
                <TableEmpty colSpan={6} icon={<CalendarDays />} message={`Không có lịch hẹn ${isToday ? "hôm nay" : "ngày này"}`} />
              ) : appointments.map(a => (
                <Tr key={a.id}>
                  <Td>
                    <TimeSlotDisplay>{fmtTime(a.startTime)}</TimeSlotDisplay>
                    <TimeRange>{fmtTime(a.startTime)} – {fmtTime(a.endTime)}</TimeRange>
                  </Td>
                  <Td>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span
                        style={{ fontWeight: 600, fontFamily: t.fontFamily, color: t.colorTextBrand, cursor: "pointer" }}
                        onClick={() => router.push(`/admin/customers/${a.customer.id}`)}
                      >
                        {a.customer.fullName}
                      </span>
                      {a.customer.hasAllergy && (
                        <span title="Có dị ứng" style={{ color: t.colorDanger, display: "flex" }}><AlertTriangle size={11} /></span>
                      )}
                      {a.customer.hasChronicDisease && (
                        <span title="Bệnh mãn tính" style={{ color: t.colorWarningBold, display: "flex" }}><AlertTriangle size={11} /></span>
                      )}
                    </div>
                    <TimeRange style={{ fontFamily: t.fontFamily }}>{a.customer.code}</TimeRange>
                  </Td>
                  <Td>
                    <Badge appearance={TYPE_APPEARANCE[a.type] ?? "default"} styleVariant="subtle">
                      {TYPE_LABELS[a.type] ?? a.type}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge appearance={STATUS_APPEARANCE[a.status] ?? "default"} styleVariant="subtle">
                      {STATUS_LABELS[a.status] ?? a.status}
                    </Badge>
                  </Td>
                  <Td muted>{a.note ?? "–"}</Td>
                  <Td>
                    <StatusActions>
                      {a.status === "SCHEDULED" && (
                        <Button appearance="subtle" onClick={() => { setUpdateTarget(a); setNewStatus("CONFIRMED"); }}>
                          Xác nhận
                        </Button>
                      )}
                      {(a.status === "CONFIRMED" || a.status === "SCHEDULED") && (
                        <Button appearance="subtle" onClick={() => { setUpdateTarget(a); setNewStatus("WAITING"); }}>
                          Đang chờ
                        </Button>
                      )}
                      {a.status === "WAITING" && (
                        <Button appearance="primary" onClick={() => { setUpdateTarget(a); setNewStatus("IN_PROGRESS"); }}>
                          Vào khám
                        </Button>
                      )}
                      {a.status === "IN_PROGRESS" && (
                        <Button appearance="primary" onClick={() => { setUpdateTarget(a); setNewStatus("COMPLETED"); }}>
                          Hoàn thành
                        </Button>
                      )}
                      {!["COMPLETED","CANCELLED","NO_SHOW"].includes(a.status) && (
                        <Button appearance="danger" onClick={() => setCancelTarget(a)}>
                          Hủy
                        </Button>
                      )}
                      {["SCHEDULED","CONFIRMED","WAITING","IN_PROGRESS"].includes(a.status) && (
                        <Button appearance="subtle" onClick={() => { setUpdateTarget(a); setNewStatus(a.status); }}>
                          ···
                        </Button>
                      )}
                    </StatusActions>
                  </Td>
                </Tr>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ─── Create modal ───────────────────────────────────────────────── */}
      <Modal open={open} onOpenChange={onClose} title={`Đặt lịch hẹn — ${format(selectedDate, "dd/MM/yyyy")}`} size="lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {isSuperAdmin && branches.length > 0 && (
                <Field label="Chi nhánh" required>
                  <Select
                    options={branches.map(b => ({ value: b.id, label: b.name }))}
                    value={selectedBranchId}
                    onChange={setSelectedBranchId}
                    placeholder="Chọn chi nhánh"
                  />
                </Field>
              )}
              <Field label="Khách hàng" required>
                <Autocomplete
                  options={customerOptions}
                  value={selectedCustomerId}
                  onChange={setSelectedCustomerId}
                  onSearch={handleCustomerSearch}
                  placeholder="Tìm tên hoặc mã khách hàng..."
                  clearable
                />
              </Field>
              <Field label="Loại lịch hẹn" required>
                <Select
                  options={TYPE_OPTIONS}
                  value={apptType}
                  onChange={setApptType}
                  placeholder="Chọn loại"
                />
              </Field>

              {/* Time slot pickers */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Controller
                  name="startTime"
                  control={control}
                  render={({ field }) => (
                    <Field
                      label={field.value ? `Giờ bắt đầu — ${field.value}` : "Giờ bắt đầu"}
                      required
                      error={errors.startTime?.message}
                    >
                      <TimeSlotPicker
                        value={field.value}
                        onChange={v => {
                          field.onChange(v);
                          if (watchEnd && watchEnd <= v) {
                            const auto = addMinutesToSlot(v, 30);
                            setValue("endTime", auto || "", { shouldValidate: false });
                          }
                        }}
                      />
                    </Field>
                  )}
                />
                <Controller
                  name="endTime"
                  control={control}
                  render={({ field }) => (
                    <Field
                      label={field.value ? `Giờ kết thúc — ${field.value}` : "Giờ kết thúc"}
                      required
                      error={errors.endTime?.message}
                    >
                      <TimeSlotPicker
                        value={field.value}
                        onChange={field.onChange}
                        disabledBefore={watchStart}
                      />
                    </Field>
                  )}
                />
              </div>

              <Field label="Ghi chú">
                <TextField placeholder="Yêu cầu đặc biệt, lý do hẹn..." {...register("note")} />
              </Field>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" type="button" onClick={onClose}>Hủy</Button>
            <Button appearance="primary" type="submit" isDisabled={saving}>
              {saving ? "Đang lưu..." : "Đặt lịch"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ─── Update status modal ────────────────────────────────────────── */}
      <Modal
        open={!!updateTarget}
        onOpenChange={open => { if (!open) { setUpdateTarget(null); setNewStatus(""); } }}
        title="Cập nhật trạng thái lịch hẹn"
        size="xs"
      >
        <ModalBody>
          {updateTarget && (
            <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeSm, color: t.colorTextSubtle, marginBottom: 12 }}>
              {updateTarget.customer.fullName} · {fmtTime(updateTarget.startTime)} – {fmtTime(updateTarget.endTime)}
            </div>
          )}
          <Field label="Trạng thái mới">
            <Select
              options={STATUS_UPDATE_OPTIONS}
              value={newStatus}
              onChange={setNewStatus}
              placeholder="Chọn trạng thái"
            />
          </Field>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={() => { setUpdateTarget(null); setNewStatus(""); }}>Hủy</Button>
          <Button appearance="primary" onClick={updateStatus} isDisabled={updatingStatus || !newStatus}>
            {updatingStatus ? "Đang lưu..." : "Cập nhật"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ─── Cancel confirm ─────────────────────────────────────────────── */}
      <ConfirmModal
        open={!!cancelTarget}
        onOpenChange={open => { if (!open) setCancelTarget(null); }}
        title="Hủy lịch hẹn?"
        description={cancelTarget ? `Xác nhận hủy lịch hẹn của ${cancelTarget.customer.fullName} lúc ${fmtTime(cancelTarget.startTime)}?` : ""}
        confirmLabel="Hủy lịch hẹn"
        cancelLabel="Giữ lại"
        appearance="danger"
        onConfirm={cancelAppointment}
      />
    </>
  );
}
