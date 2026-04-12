"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import styled from "styled-components";
import { tokens as t } from "@/components/ui/tokens";
import { Button } from "@/components/ui/button";
import { Field, TextField, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, Th, Tr, Td, TableEmpty, TableContainer } from "@/components/ui/table";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/dialog";
import { SectionHeader } from "@/components/ui/card";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/tabs";
import { Autocomplete } from "@/components/ui/autocomplete";
import {
  Plus, Search, Edit2, Trash2, ClipboardList,
  ChevronLeft, ChevronRight, CalendarCheck, ListChecks,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

type Plan = {
  id: string;
  name: string;
  totalSessions: number;
  sessionInterval: number;
  description: string | null;
  createdBy: { fullName: string };
  _count: { sessions: number };
};

type Session = {
  id: string;
  sessionNumber: number;
  scheduledDate: string;
  actualDate: string | null;
  status: string;
  note: string | null;
  plan:    { id: string; name: string; totalSessions: number };
  episode: {
    id: string;
    customer: { id: string; code: string; fullName: string };
    branch:   { name: string };
  };
};

// ─── Constants ───────────────────────────────────────────────────────────────

const SESSION_STATUS_OPTIONS = [
  { value: "",             label: "Tất cả trạng thái" },
  { value: "SCHEDULED",   label: "Chờ thực hiện" },
  { value: "COMPLETED",   label: "Hoàn thành" },
  { value: "LATE",        label: "Trễ" },
  { value: "SKIPPED",     label: "Bỏ buổi" },
  { value: "RESCHEDULED", label: "Dời lịch" },
];

const SESSION_STATUS_LABELS: Record<string, string> = {
  SCHEDULED:   "Chờ thực hiện",
  COMPLETED:   "Hoàn thành",
  LATE:        "Trễ",
  SKIPPED:     "Bỏ buổi",
  RESCHEDULED: "Dời lịch",
};

const SESSION_STATUS_APPEARANCE: Record<string, "primary" | "success" | "danger" | "warning" | "neutral"> = {
  SCHEDULED:   "primary",
  COMPLETED:   "success",
  LATE:        "warning",
  SKIPPED:     "danger",
  RESCHEDULED: "neutral",
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const planSchema = z.object({
  name:            z.string().min(1, "Tên không được để trống"),
  totalSessions:   z.string().min(1).refine(v => !isNaN(Number(v)) && Number(v) >= 1, "Phải ≥ 1"),
  sessionInterval: z.string().min(1).refine(v => !isNaN(Number(v)) && Number(v) >= 1, "Phải ≥ 1 ngày"),
  description:     z.string().optional(),
});
type PlanForm = z.infer<typeof planSchema>;

const assignSchema = z.object({
  startDate: z.string().min(1, "Vui lòng chọn ngày bắt đầu"),
});
type AssignForm = z.infer<typeof assignSchema>;

// ─── Styled ───────────────────────────────────────────────────────────────────

const FilterBar = styled.div`display: flex; gap: 8px; align-items: center; flex-wrap: wrap;`;

const SearchWrap = styled.div`
  position: relative; flex: 1; min-width: 180px; max-width: 300px;
  svg { position: absolute; left: 9px; top: 50%; transform: translateY(-50%);
        color: ${t.colorTextSubtlest}; width: 14px; height: 14px; pointer-events: none; }
`;
const SearchInput = styled.input`
  width: 100%; height: 32px; padding: 0 10px 0 30px;
  border: 2px solid ${t.colorBorderInput}; border-radius: ${t.radiusMd};
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeMd};
  color: ${t.colorText}; background: white; outline: none; box-sizing: border-box;
  &::placeholder { color: ${t.colorTextSubtlest}; }
  &:focus { border-color: ${t.colorBorderFocused}; box-shadow: 0 0 0 2px ${t.colorBrandSubtlest}; }
`;

const FormGrid = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 14px;`;

const Pagination = styled.div`
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid ${t.colorBorder};
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeSm}; color: ${t.colorTextSubtle};
`;

const ActionBtn = styled.button`
  all: unset; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: ${t.radiusMd};
  color: ${t.colorTextSubtle};
  &:hover { background: ${t.colorBgNeutralHovered}; color: ${t.colorText}; }
`;

const DeleteBtn = styled(ActionBtn)`&:hover { background: ${t.colorDangerSubtlest}; color: ${t.colorDanger}; }`;

const DescText = styled.span`
  font-size: ${t.fontSizeXs}; color: ${t.colorTextSubtlest}; font-family: ${t.fontFamily};
  display: block; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px;
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "–";
  try { return format(new Date(d), "dd/MM/yyyy", { locale: vi }); } catch { return "–"; }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TreatmentsClient({
  isSuperAdmin, currentBranchId, branches, planOptions,
}: {
  isSuperAdmin: boolean;
  currentBranchId: string | null;
  branches: { id: string; name: string }[];
  doctors:  { id: string; fullName: string }[];
  planOptions: { id: string; name: string; totalSessions: number; sessionInterval: number }[];
}) {
  // ── Plans tab ──────────────────────────────────────────────────────────────
  const [plans, setPlans]         = useState<Plan[]>([]);
  const [planTotal, setPlanTotal] = useState(0);
  const [planPage, setPlanPage]   = useState(1);
  const [planLoading, setPlanLoading] = useState(true);
  const [planSearch, setPlanSearch]   = useState("");
  const [planSearchInput, setPlanSearchInput] = useState("");
  const [planDebounce, setPlanDebounce] = useState<ReturnType<typeof setTimeout>>();

  // Plan create/edit modal
  const [planOpen, setPlanOpen]     = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planSaving, setPlanSaving] = useState(false);

  const planForm = useForm<PlanForm>({ resolver: zodResolver(planSchema) });
  const planErrors = planForm.formState.errors;

  // ── Sessions tab ───────────────────────────────────────────────────────────
  const [sessions, setSessions]         = useState<Session[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [sessionPage, setSessionPage]   = useState(1);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionStatus, setSessionStatus]   = useState("");
  const [sessionSearch, setSessionSearch]   = useState("");
  const [sessionSearchInput, setSessionSearchInput] = useState("");
  const [sessionDebounce, setSessionDebounce] = useState<ReturnType<typeof setTimeout>>();

  // Assign modal (assign plan to episode)
  const [assignOpen, setAssignOpen]     = useState(false);
  const [assignPlanId, setAssignPlanId] = useState("");
  const [assignEpisodeId, setAssignEpisodeId] = useState("");
  const [episodeOptions, setEpisodeOptions]   = useState<{ value: string; label: string }[]>([]);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignBranchId, setAssignBranchId] = useState(currentBranchId ?? "");

  const assignForm = useForm<AssignForm>({ resolver: zodResolver(assignSchema) });
  const assignErrors = assignForm.formState.errors;

  // Update session status modal
  const [statusOpen, setStatusOpen]       = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [newStatus, setNewStatus]         = useState("");
  const [actualDate, setActualDate]       = useState("");
  const [sessionNote, setSessionNote]     = useState("");
  const [statusSaving, setStatusSaving]   = useState(false);

  const planPageSize = 20;
  const sessionPageSize = 20;

  // ── Fetch plans ────────────────────────────────────────────────────────────
  const fetchPlans = useCallback(async () => {
    setPlanLoading(true);
    try {
      const p = new URLSearchParams({ page: String(planPage) });
      if (planSearch) p.set("search", planSearch);
      const res = await fetch(`/api/treatments?${p}`);
      const json = await res.json();
      setPlans(json.data ?? []);
      setPlanTotal(json.total ?? 0);
    } finally { setPlanLoading(false); }
  }, [planPage, planSearch]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  // ── Fetch sessions ─────────────────────────────────────────────────────────
  const fetchSessions = useCallback(async () => {
    setSessionLoading(true);
    try {
      const p = new URLSearchParams({ page: String(sessionPage) });
      if (sessionStatus) p.set("status",  sessionStatus);
      if (sessionSearch) p.set("search",  sessionSearch);
      const res = await fetch(`/api/treatments/sessions?${p}`);
      const json = await res.json();
      setSessions(json.data ?? []);
      setSessionTotal(json.total ?? 0);
    } finally { setSessionLoading(false); }
  }, [sessionPage, sessionStatus, sessionSearch]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);
  useEffect(() => { setSessionPage(1); }, [sessionStatus]);

  // ── Plan search debounce ───────────────────────────────────────────────────
  const handlePlanSearch = (v: string) => {
    setPlanSearchInput(v);
    clearTimeout(planDebounce);
    setPlanDebounce(setTimeout(() => { setPlanSearch(v); setPlanPage(1); }, 350));
  };

  // ── Session search debounce ────────────────────────────────────────────────
  const handleSessionSearch = (v: string) => {
    setSessionSearchInput(v);
    clearTimeout(sessionDebounce);
    setSessionDebounce(setTimeout(() => { setSessionSearch(v); setSessionPage(1); }, 350));
  };

  // ── Episode autocomplete ───────────────────────────────────────────────────
  const handleEpisodeSearch = async (q: string) => {
    if (!q.trim()) { setEpisodeOptions([]); return; }
    const params = new URLSearchParams({ search: q, page: "1" });
    if (!isSuperAdmin && currentBranchId) params.set("branchId", currentBranchId);
    const res  = await fetch(`/api/episodes?${params}`);
    const json = await res.json();
    setEpisodeOptions(
      (json.data ?? []).map((e: { id: string; customer: { fullName: string; code: string }; serviceType: string }) => ({
        value: e.id,
        label: `${e.customer.fullName} (${e.customer.code}) — ${e.serviceType}`,
      }))
    );
  };

  // ── Plan CRUD ──────────────────────────────────────────────────────────────
  const openCreatePlan = () => {
    setEditingPlan(null);
    planForm.reset({ name: "", totalSessions: "", sessionInterval: "", description: "" });
    setPlanOpen(true);
  };

  const openEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    planForm.reset({
      name:            plan.name,
      totalSessions:   String(plan.totalSessions),
      sessionInterval: String(plan.sessionInterval),
      description:     plan.description ?? "",
    });
    setPlanOpen(true);
  };

  const onPlanSave = async (data: PlanForm) => {
    setPlanSaving(true);
    try {
      const payload = {
        name:            data.name,
        totalSessions:   Number(data.totalSessions),
        sessionInterval: Number(data.sessionInterval),
        description:     data.description || undefined,
      };
      const url    = editingPlan ? `/api/treatments/${editingPlan.id}` : "/api/treatments";
      const method = editingPlan ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success(editingPlan ? "Đã cập nhật kế hoạch" : "Đã tạo kế hoạch điều trị");
      setPlanOpen(false);
      fetchPlans();
    } catch (err) {
      toast.error((err as Error).message ?? "Lỗi");
    } finally { setPlanSaving(false); }
  };

  const deletePlan = async (plan: Plan) => {
    if (!confirm(`Xóa kế hoạch "${plan.name}"?`)) return;
    const res = await fetch(`/api/treatments/${plan.id}`, { method: "DELETE" });
    if (!res.ok) { const e = await res.json(); return toast.error(e.message); }
    toast.success("Đã xóa kế hoạch");
    fetchPlans();
  };

  // ── Assign plan to episode ─────────────────────────────────────────────────
  const openAssign = () => {
    setAssignPlanId(""); setAssignEpisodeId(""); setEpisodeOptions([]);
    setAssignBranchId(currentBranchId ?? "");
    assignForm.reset({ startDate: "" });
    setAssignOpen(true);
  };

  const onAssignSave = async (data: AssignForm) => {
    if (!assignPlanId)    return toast.error("Vui lòng chọn kế hoạch điều trị");
    if (!assignEpisodeId) return toast.error("Vui lòng chọn hồ sơ bệnh án");
    setAssignSaving(true);
    try {
      const res = await fetch("/api/treatments/sessions", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId:    assignPlanId,
          episodeId: assignEpisodeId,
          startDate: data.startDate,
          ...(isSuperAdmin ? { branchId: assignBranchId } : {}),
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      const { created } = await res.json();
      toast.success(`Đã tạo ${created} buổi điều trị`);
      setAssignOpen(false);
      fetchSessions();
    } catch (err) {
      toast.error((err as Error).message ?? "Lỗi");
    } finally { setAssignSaving(false); }
  };

  // ── Update session status ──────────────────────────────────────────────────
  const openStatusModal = (session: Session) => {
    setEditingSession(session);
    setNewStatus(session.status);
    setActualDate(session.actualDate ? session.actualDate.slice(0, 10) : "");
    setSessionNote(session.note ?? "");
    setStatusOpen(true);
  };

  const onStatusSave = async () => {
    if (!editingSession || !newStatus) return;
    setStatusSaving(true);
    try {
      const res = await fetch(`/api/treatments/sessions/${editingSession.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status:     newStatus,
          actualDate: actualDate || undefined,
          note:       sessionNote || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success("Đã cập nhật buổi điều trị");
      setStatusOpen(false);
      fetchSessions();
    } catch (err) {
      toast.error((err as Error).message ?? "Lỗi");
    } finally { setStatusSaving(false); }
  };

  const planTotalPages    = Math.ceil(planTotal    / planPageSize);
  const sessionTotalPages = Math.ceil(sessionTotal / sessionPageSize);

  const assignPlanOptions = [
    { value: "", label: "Chọn kế hoạch điều trị..." },
    ...planOptions.map(p => ({
      value: p.id,
      label: `${p.name} (${p.totalSessions} buổi, cách ${p.sessionInterval} ngày)`,
    })),
  ];

  const statusEditOptions = SESSION_STATUS_OPTIONS.filter(o => o.value !== "");

  return (
    <>
      <Tabs defaultValue="plans">
        <TabList>
          <Tab value="plans"><ListChecks size={14} /> Kế hoạch ({planTotal})</Tab>
          <Tab value="sessions"><CalendarCheck size={14} /> Buổi điều trị ({sessionTotal})</Tab>
        </TabList>

        {/* ─── Tab 1: Plans ──────────────────────────────────────────────── */}
        <TabPanel value="plans" style={{ paddingTop: 16 }}>
          <SectionHeader>
            <FilterBar>
              <SearchWrap>
                <Search />
                <SearchInput
                  placeholder="Tìm kế hoạch..."
                  value={planSearchInput}
                  onChange={e => handlePlanSearch(e.target.value)}
                />
              </SearchWrap>
            </FilterBar>
            <Button appearance="primary" onClick={openCreatePlan}>
              <Plus size={14} /> Tạo kế hoạch
            </Button>
          </SectionHeader>

          <TableContainer>
            <Table>
              <TableHeader>
                <Tr>
                  <Th>Tên kế hoạch</Th>
                  <Th style={{ width: 120, textAlign: "center" }}>Số buổi</Th>
                  <Th style={{ width: 160, textAlign: "center" }}>Cách nhau (ngày)</Th>
                  <Th style={{ width: 120, textAlign: "center" }}>Đã giao</Th>
                  <Th style={{ width: 140 }}>Người tạo</Th>
                  <Th style={{ width: 80 }}></Th>
                </Tr>
              </TableHeader>
              <TableBody>
                {planLoading ? (
                  <TableEmpty colSpan={6} message="Đang tải..." />
                ) : plans.length === 0 ? (
                  <TableEmpty colSpan={6} icon={<ClipboardList />} message="Chưa có kế hoạch nào" />
                ) : plans.map(plan => (
                  <Tr key={plan.id}>
                    <Td>
                      <strong style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeMd }}>{plan.name}</strong>
                      {plan.description && <DescText>{plan.description}</DescText>}
                    </Td>
                    <Td style={{ textAlign: "center" }}>{plan.totalSessions}</Td>
                    <Td style={{ textAlign: "center" }}>{plan.sessionInterval}</Td>
                    <Td style={{ textAlign: "center" }}>{plan._count.sessions}</Td>
                    <Td style={{ color: t.colorTextSubtle, fontSize: t.fontSizeSm, fontFamily: t.fontFamily }}>
                      {plan.createdBy.fullName}
                    </Td>
                    <Td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <ActionBtn title="Sửa" onClick={() => openEditPlan(plan)}><Edit2 size={13} /></ActionBtn>
                        <DeleteBtn title="Xóa" onClick={() => deletePlan(plan)}><Trash2 size={13} /></DeleteBtn>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TableBody>
            </Table>
            {planTotalPages > 1 && (
              <Pagination>
                <span>{planTotal} kế hoạch</span>
                <Button appearance="subtle" isDisabled={planPage <= 1} onClick={() => setPlanPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <span>{planPage} / {planTotalPages}</span>
                <Button appearance="subtle" isDisabled={planPage >= planTotalPages} onClick={() => setPlanPage(p => p + 1)}>
                  <ChevronRight size={14} />
                </Button>
              </Pagination>
            )}
          </TableContainer>
        </TabPanel>

        {/* ─── Tab 2: Sessions ───────────────────────────────────────────── */}
        <TabPanel value="sessions" style={{ paddingTop: 16 }}>
          <SectionHeader>
            <FilterBar>
              <SearchWrap>
                <Search />
                <SearchInput
                  placeholder="Tìm khách hàng / kế hoạch..."
                  value={sessionSearchInput}
                  onChange={e => handleSessionSearch(e.target.value)}
                />
              </SearchWrap>
              <Select
                options={SESSION_STATUS_OPTIONS}
                value={sessionStatus}
                onChange={setSessionStatus}
                placeholder="Tất cả trạng thái"
              />
            </FilterBar>
            <Button appearance="primary" onClick={openAssign}>
              <Plus size={14} /> Giao liệu trình
            </Button>
          </SectionHeader>

          <TableContainer>
            <Table>
              <TableHeader>
                <Tr>
                  <Th>Khách hàng</Th>
                  <Th>Kế hoạch</Th>
                  <Th style={{ width: 90, textAlign: "center" }}>Buổi</Th>
                  <Th style={{ width: 120 }}>Ngày dự kiến</Th>
                  <Th style={{ width: 120 }}>Ngày thực tế</Th>
                  <Th style={{ width: 140 }}>Trạng thái</Th>
                  {isSuperAdmin && <Th style={{ width: 100 }}>Chi nhánh</Th>}
                  <Th style={{ width: 60 }}></Th>
                </Tr>
              </TableHeader>
              <TableBody>
                {sessionLoading ? (
                  <TableEmpty colSpan={isSuperAdmin ? 8 : 7} message="Đang tải..." />
                ) : sessions.length === 0 ? (
                  <TableEmpty colSpan={isSuperAdmin ? 8 : 7} icon={<CalendarCheck />} message="Chưa có buổi điều trị nào" />
                ) : sessions.map(s => (
                  <Tr key={s.id}>
                    <Td>
                      <span style={{ fontFamily: t.fontFamily, fontWeight: 600, fontSize: t.fontSizeMd }}>
                        {s.episode.customer.fullName}
                      </span>
                      <DescText>{s.episode.customer.code}</DescText>
                    </Td>
                    <Td style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeMd }}>{s.plan.name}</Td>
                    <Td style={{ textAlign: "center", fontFamily: t.fontFamily, fontSize: t.fontSizeMd }}>
                      {s.sessionNumber} / {s.plan.totalSessions}
                    </Td>
                    <Td style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeMd }}>{fmtDate(s.scheduledDate)}</Td>
                    <Td style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeMd }}>{fmtDate(s.actualDate)}</Td>
                    <Td>
                      <Badge appearance={SESSION_STATUS_APPEARANCE[s.status] ?? "default"} styleVariant="subtle">
                        {SESSION_STATUS_LABELS[s.status] ?? s.status}
                      </Badge>
                    </Td>
                    {isSuperAdmin && (
                      <Td style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeSm, color: t.colorTextSubtle }}>
                        {s.episode.branch.name}
                      </Td>
                    )}
                    <Td>
                      <ActionBtn title="Cập nhật" onClick={() => openStatusModal(s)}>
                        <Edit2 size={13} />
                      </ActionBtn>
                    </Td>
                  </Tr>
                ))}
              </TableBody>
            </Table>
            {sessionTotalPages > 1 && (
              <Pagination>
                <span>{sessionTotal} buổi</span>
                <Button appearance="subtle" isDisabled={sessionPage <= 1} onClick={() => setSessionPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <span>{sessionPage} / {sessionTotalPages}</span>
                <Button appearance="subtle" isDisabled={sessionPage >= sessionTotalPages} onClick={() => setSessionPage(p => p + 1)}>
                  <ChevronRight size={14} />
                </Button>
              </Pagination>
            )}
          </TableContainer>
        </TabPanel>
      </Tabs>

      {/* ─── Modal: Create / Edit Plan ──────────────────────────────────────── */}
      <Modal
        open={planOpen}
        onOpenChange={setPlanOpen}
        title={editingPlan ? "Sửa kế hoạch điều trị" : "Tạo kế hoạch điều trị"}
      >
        <form onSubmit={planForm.handleSubmit(onPlanSave)}>
          <ModalBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Tên kế hoạch" required error={planErrors.name?.message}>
                <TextField isInvalid={!!planErrors.name} {...planForm.register("name")} placeholder="VD: Liệu trình điều trị mụn 10 buổi" />
              </Field>
              <FormGrid>
                <Field label="Số buổi" required error={planErrors.totalSessions?.message}>
                  <TextField
                    type="number" min="1"
                    isInvalid={!!planErrors.totalSessions}
                    {...planForm.register("totalSessions")}
                    placeholder="10"
                  />
                </Field>
                <Field label="Khoảng cách (ngày)" required error={planErrors.sessionInterval?.message}>
                  <TextField
                    type="number" min="1"
                    isInvalid={!!planErrors.sessionInterval}
                    {...planForm.register("sessionInterval")}
                    placeholder="7"
                  />
                </Field>
              </FormGrid>
              <Field label="Mô tả">
                <Textarea {...planForm.register("description")} placeholder="Mô tả kế hoạch điều trị..." rows={3} />
              </Field>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" type="button" onClick={() => setPlanOpen(false)}>Hủy</Button>
            <Button appearance="primary" type="submit" isDisabled={planSaving}>
              {planSaving ? "Đang lưu..." : editingPlan ? "Lưu thay đổi" : "Tạo kế hoạch"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ─── Modal: Assign Plan to Episode ─────────────────────────────────── */}
      <Modal open={assignOpen} onOpenChange={setAssignOpen} title="Giao liệu trình cho khách hàng">
        <form onSubmit={assignForm.handleSubmit(onAssignSave)}>
          <ModalBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {isSuperAdmin && (
                <Field label="Chi nhánh">
                  <Select
                    options={[{ value: "", label: "Chọn chi nhánh" }, ...branches.map(b => ({ value: b.id, label: b.name }))]}
                    value={assignBranchId}
                    onChange={setAssignBranchId}
                    placeholder="Chọn chi nhánh"
                  />
                </Field>
              )}
              <Field label="Kế hoạch điều trị" required>
                <Select
                  options={assignPlanOptions}
                  value={assignPlanId}
                  onChange={setAssignPlanId}
                  placeholder="Chọn kế hoạch..."
                />
              </Field>
              <Field label="Hồ sơ bệnh án (khách hàng)" required>
                <Autocomplete
                  options={episodeOptions}
                  value={assignEpisodeId}
                  onChange={setAssignEpisodeId}
                  onSearch={handleEpisodeSearch}
                  placeholder="Tìm theo tên / mã khách hàng..."
                />
              </Field>
              <Field label="Ngày bắt đầu" required error={assignErrors.startDate?.message}>
                <TextField
                  type="date"
                  isInvalid={!!assignErrors.startDate}
                  {...assignForm.register("startDate")}
                />
              </Field>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" type="button" onClick={() => setAssignOpen(false)}>Hủy</Button>
            <Button appearance="primary" type="submit" isDisabled={assignSaving}>
              {assignSaving ? "Đang tạo..." : "Giao liệu trình"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ─── Modal: Update Session Status ──────────────────────────────────── */}
      <Modal open={statusOpen} onOpenChange={setStatusOpen} title="Cập nhật buổi điều trị">
        <ModalBody>
          {editingSession && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ padding: "10px 14px", borderRadius: t.radiusMd, background: t.colorBgNeutral, border: `1px solid ${t.colorBorder}`, fontFamily: t.fontFamily, fontSize: t.fontSizeSm }}>
                <strong>{editingSession.episode.customer.fullName}</strong>
                {" — "}{editingSession.plan.name}
                {" — Buổi "}{editingSession.sessionNumber}/{editingSession.plan.totalSessions}
                <div style={{ color: t.colorTextSubtlest, marginTop: 2 }}>
                  Dự kiến: {fmtDate(editingSession.scheduledDate)}
                </div>
              </div>
              <Field label="Trạng thái">
                <Select
                  options={statusEditOptions}
                  value={newStatus}
                  onChange={setNewStatus}
                  placeholder="Chọn trạng thái"
                />
              </Field>
              <Field label="Ngày thực tế">
                <TextField
                  type="date"
                  value={actualDate}
                  onChange={e => setActualDate((e.target as HTMLInputElement).value)}
                />
              </Field>
              <Field label="Ghi chú">
                <Textarea
                  value={sessionNote}
                  onChange={e => setSessionNote(e.target.value)}
                  placeholder="Ghi chú buổi trị liệu..."
                  rows={3}
                />
              </Field>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" type="button" onClick={() => setStatusOpen(false)}>Hủy</Button>
          <Button appearance="primary" onClick={onStatusSave} isDisabled={statusSaving}>
            {statusSaving ? "Đang lưu..." : "Lưu"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
