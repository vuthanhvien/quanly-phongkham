"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import styled from "styled-components";
import { tokens as t } from "@/components/ui/tokens";
import { Button } from "@/components/ui/button";
import { Field, TextField } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, Th, Tr, Td, TableEmpty, TableContainer } from "@/components/ui/table";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/dialog";
import { SectionHeader } from "@/components/ui/card";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/tabs";
import { Plus, Settings2, Coins, ChevronLeft, ChevronRight, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

type CommissionRule = {
  id:         string;
  name:       string;
  type:       string;
  value:      number;
  isActive:   boolean;
  serviceType: string | null;
  userId:     string | null;
  user:       { id: string; fullName: string } | null;
  createdAt:  string;
};

type Commission = {
  id:          string;
  amount:      number;
  status:      string;
  paidAt:      string | null;
  note:        string | null;
  user:        { id: string; fullName: string };
  invoice:     { invoiceNumber: string; totalAmount: number } | null;
  rule:        { name: string; type: string; value: number } | null;
  createdAt:   string;
};

type StaffUser = { id: string; fullName: string; roleName: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const RULE_TYPE_OPTIONS = [
  { value: "PERCENT", label: "Phần trăm (%)" },
  { value: "FIXED",   label: "Số tiền cố định (VND)" },
];

const COMMISSION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Chờ xử lý",
  PAID:    "Đã trả",
  CANCELLED: "Đã huỷ",
};
const COMMISSION_STATUS_APPEARANCE: Record<string, "warning" | "success" | "neutral"> = {
  PENDING:   "warning",
  PAID:      "success",
  CANCELLED: "neutral",
};

// ─── Schema ───────────────────────────────────────────────────────────────────

const ruleSchema = z.object({
  name:        z.string().min(1, "Tên quy tắc không được để trống"),
  type:        z.enum(["PERCENT", "FIXED"] as const),
  value:       z.string().refine(v => !isNaN(Number(v)) && Number(v) > 0, "Giá trị phải > 0"),
  serviceType: z.string().optional(),
  userId:      z.string().optional(),
  isActive:    z.boolean(),
});
type RuleForm = z.infer<typeof ruleSchema>;

// ─── Styled ───────────────────────────────────────────────────────────────────

const FilterBar = styled.div`display: flex; gap: 8px; align-items: center; flex-wrap: wrap;`;
const Pagination = styled.div`
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid ${t.colorBorder};
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeSm}; color: ${t.colorTextSubtle};
`;
const PageBtn = styled.button`
  all: unset; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: ${t.radiusMd}; color: ${t.colorTextSubtle};
  &:hover:not(:disabled) { background: ${t.colorBgNeutralHovered}; color: ${t.colorText}; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;
const ActionGroup = styled.div`display: flex; gap: 6px;`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "–";
  try { return format(new Date(d), "dd/MM/yyyy", { locale: vi }); } catch { return "–"; }
}
function fmtCurrency(v: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommissionsClient({
  isSuperAdmin, currentUserId, currentRole, staffUsers,
}: {
  isSuperAdmin: boolean;
  currentUserId: string;
  currentRole: string;
  staffUsers: StaffUser[];
}) {
  // ── Rules ────────────────────────────────────────────────────────────────
  const [rules, setRules]         = useState<CommissionRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [ruleOpen, setRuleOpen]   = useState(false);
  const [editRule, setEditRule]   = useState<CommissionRule | null>(null);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [deleteRule, setDeleteRule] = useState<CommissionRule | null>(null);
  const [delOpen, setDelOpen]     = useState(false);
  const [deleting, setDeleting]   = useState(false);

  const ruleForm   = useForm<RuleForm>({ resolver: zodResolver(ruleSchema),
    defaultValues: { type: "PERCENT", isActive: true } });
  const ruleErrors = ruleForm.formState.errors;

  // ── Commissions ─────────────────────────────────────────────────────────
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [commTotal, setCommTotal]     = useState(0);
  const [commPage, setCommPage]       = useState(1);
  const [commLoading, setCommLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterUser, setFilterUser]   = useState(isSuperAdmin ? "" : currentUserId);
  const [markPaying, setMarkPaying]   = useState<string | null>(null);

  const PAGE_SIZE = 20;

  // ── Fetch rules ──────────────────────────────────────────────────────────
  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const res  = await fetch("/api/commissions/rules");
      const json = await res.json();
      setRules(json.data ?? json);
    } finally { setRulesLoading(false); }
  }, []);
  useEffect(() => { fetchRules(); }, [fetchRules]);

  // ── Fetch commissions ─────────────────────────────────────────────────────
  const fetchCommissions = useCallback(async () => {
    setCommLoading(true);
    try {
      const p = new URLSearchParams({ page: String(commPage) });
      if (filterStatus) p.set("status", filterStatus);
      if (filterUser)   p.set("userId", filterUser);
      const res  = await fetch(`/api/commissions?${p}`);
      const json = await res.json();
      setCommissions(json.data ?? []);
      setCommTotal(json.total ?? 0);
    } finally { setCommLoading(false); }
  }, [commPage, filterStatus, filterUser]);
  useEffect(() => { fetchCommissions(); }, [fetchCommissions]);
  useEffect(() => { setCommPage(1); }, [filterStatus, filterUser]);

  // ── Rule handlers ─────────────────────────────────────────────────────────

  const openCreateRule = () => {
    setEditRule(null);
    ruleForm.reset({ name: "", type: "PERCENT", value: "", serviceType: "", userId: "", isActive: true });
    setRuleOpen(true);
  };

  const openEditRule = (rule: CommissionRule) => {
    setEditRule(rule);
    ruleForm.reset({
      name:        rule.name,
      type:        rule.type as "PERCENT" | "FIXED",
      value:       String(rule.value),
      serviceType: rule.serviceType ?? "",
      userId:      rule.userId ?? "",
      isActive:    rule.isActive,
    });
    setRuleOpen(true);
  };

  const onRuleSave = async (data: RuleForm) => {
    setRuleSaving(true);
    try {
      const body = {
        name:        data.name,
        type:        data.type,
        value:       Number(data.value),
        serviceType: data.serviceType || undefined,
        userId:      data.userId || undefined,
        isActive:    data.isActive,
      };
      const url    = editRule ? `/api/commissions/rules/${editRule.id}` : "/api/commissions/rules";
      const method = editRule ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success(editRule ? "Đã cập nhật quy tắc" : "Đã thêm quy tắc hoa hồng");
      setRuleOpen(false);
      fetchRules();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally { setRuleSaving(false); }
  };

  const confirmDelete = (rule: CommissionRule) => {
    setDeleteRule(rule);
    setDelOpen(true);
  };

  const onDeleteRule = async () => {
    if (!deleteRule) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/commissions/rules/${deleteRule.id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success("Đã xoá quy tắc");
      setDelOpen(false);
      fetchRules();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally { setDeleting(false); }
  };

  // ── Commission handlers ───────────────────────────────────────────────────

  const markPaid = async (id: string) => {
    setMarkPaying(id);
    try {
      const res = await fetch(`/api/commissions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "PAID" }) });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success("Đã đánh dấu đã trả hoa hồng");
      fetchCommissions();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally { setMarkPaying(null); }
  };

  const commPages = Math.max(1, Math.ceil(commTotal / PAGE_SIZE));

  // ── Prefix staff options ──────────────────────────────────────────────────
  const staffOptions = [
    { value: "", label: "Tất cả nhân viên" },
    ...staffUsers.map(u => ({ value: u.id, label: `${u.fullName} (${u.roleName})` })),
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Tabs defaultValue="rules">
        <TabList>
          <Tab value="rules"><Settings2 size={15} style={{ marginRight: 6 }} />Quy tắc hoa hồng</Tab>
          <Tab value="commissions"><Coins size={15} style={{ marginRight: 6 }} />Danh sách hoa hồng</Tab>
        </TabList>

        {/* ── Quy tắc tab ───────────────────────────────────────────────── */}
        <TabPanel value="rules" style={{ paddingTop: 16 }}>
          <SectionHeader>
            <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeMd, fontWeight: 600, color: t.colorText }}>
              Quy tắc hoa hồng ({rules.length})
            </div>
            {isSuperAdmin && (
              <Button appearance="primary" onClick={openCreateRule}>
                <Plus size={14} /> Thêm quy tắc
              </Button>
            )}
          </SectionHeader>
          <TableContainer>
            <Table>
              <TableHeader>
                <tr>
                  <Th>Tên quy tắc</Th>
                  <Th>Loại</Th>
                  <Th align="right">Giá trị</Th>
                  <Th>Loại dịch vụ</Th>
                  <Th>Áp dụng cho</Th>
                  <Th>Trạng thái</Th>
                  {isSuperAdmin && <Th />}
                </tr>
              </TableHeader>
              <TableBody>
                {rulesLoading ? null : rules.length === 0 ? (
                  <TableEmpty colSpan={isSuperAdmin ? 7 : 6} icon={<Settings2 size={32} />} message="Chưa có quy tắc hoa hồng nào" />
                ) : rules.map(r => (
                  <Tr key={r.id}>
                    <Td><strong style={{ fontFamily: t.fontFamily }}>{r.name}</strong></Td>
                    <Td>{r.type === "PERCENT" ? "Phần trăm" : "Cố định"}</Td>
                    <Td align="right">{r.type === "PERCENT" ? `${r.value}%` : fmtCurrency(r.value)}</Td>
                    <Td>{r.serviceType ?? "–"}</Td>
                    <Td>{r.user ? r.user.fullName : "Tất cả"}</Td>
                    <Td>
                      <Badge appearance={r.isActive ? "success" : "neutral"} styleVariant="subtle">
                        {r.isActive ? "Đang áp dụng" : "Ngừng"}
                      </Badge>
                    </Td>
                    {isSuperAdmin && (
                      <Td>
                        <ActionGroup>
                          <Button appearance="subtle" spacing="compact" onClick={() => openEditRule(r)}>
                            <Pencil size={13} />
                          </Button>
                          <Button appearance="danger" spacing="compact" onClick={() => confirmDelete(r)}>
                            <Trash2 size={13} />
                          </Button>
                        </ActionGroup>
                      </Td>
                    )}
                  </Tr>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* ── Danh sách hoa hồng tab ────────────────────────────────────── */}
        <TabPanel value="commissions" style={{ paddingTop: 16 }}>
          <SectionHeader>
            <FilterBar>
              <Select
                compact
                value={filterStatus}
                onChange={v => setFilterStatus(v as string)}
                options={[
                  { value: "",          label: "Tất cả trạng thái" },
                  { value: "PENDING",   label: "Chờ xử lý" },
                  { value: "PAID",      label: "Đã trả" },
                  { value: "CANCELLED", label: "Đã huỷ" },
                ]}
              />
              {isSuperAdmin && (
                <Select
                  compact
                  value={filterUser}
                  onChange={v => setFilterUser(v as string)}
                  options={staffOptions}
                />
              )}
            </FilterBar>
            <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeSm, color: t.colorTextSubtle }}>
              {commTotal} khoản hoa hồng
            </div>
          </SectionHeader>
          <TableContainer>
            <Table>
              <TableHeader>
                <tr>
                  <Th>Nhân viên</Th>
                  <Th>Hóa đơn</Th>
                  <Th>Quy tắc</Th>
                  <Th>Ngày</Th>
                  <Th align="right">Hoa hồng</Th>
                  <Th>Trạng thái</Th>
                  {(isSuperAdmin || currentRole === "MANAGER") && <Th />}
                </tr>
              </TableHeader>
              <TableBody>
                {commLoading ? null : commissions.length === 0 ? (
                  <TableEmpty colSpan={(isSuperAdmin || currentRole === "MANAGER") ? 7 : 6} icon={<Coins size={32} />} message="Chưa có hoa hồng nào" />
                ) : commissions.map(c => (
                  <Tr key={c.id}>
                    <Td>{c.user.fullName}</Td>
                    <Td>{c.invoice?.invoiceNumber ?? "–"}</Td>
                    <Td>
                      {c.rule ? (
                        <span style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeSm }}>
                          {c.rule.name} ({c.rule.type === "PERCENT" ? `${c.rule.value}%` : fmtCurrency(c.rule.value)})
                        </span>
                      ) : "–"}
                    </Td>
                    <Td>{fmtDate(c.createdAt)}</Td>
                    <Td align="right">
                      <strong style={{ fontFamily: t.fontFamily, color: t.colorTextSuccess }}>{fmtCurrency(c.amount)}</strong>
                    </Td>
                    <Td>
                      <Badge appearance={COMMISSION_STATUS_APPEARANCE[c.status] ?? "neutral"}>
                        {COMMISSION_STATUS_LABELS[c.status] ?? c.status}
                      </Badge>
                    </Td>
                    {(isSuperAdmin || currentRole === "MANAGER") && (
                      <Td>
                        {c.status === "PENDING" && (
                          <Button
                            appearance="primary"
                            spacing="compact"
                            isDisabled={markPaying === c.id}
                            onClick={() => markPaid(c.id)}
                          >
                            <CheckCircle2 size={13} /> Đã trả
                          </Button>
                        )}
                      </Td>
                    )}
                  </Tr>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination>
            <span>Trang {commPage} / {commPages} &bull; {commTotal} khoản</span>
            <PageBtn disabled={commPage <= 1} onClick={() => setCommPage(p => p - 1)}><ChevronLeft size={16} /></PageBtn>
            <PageBtn disabled={commPage >= commPages} onClick={() => setCommPage(p => p + 1)}><ChevronRight size={16} /></PageBtn>
          </Pagination>
        </TabPanel>
      </Tabs>

      {/* ── Create / Edit Rule Modal ─────────────────────────────────────── */}
      <Modal open={ruleOpen} onOpenChange={setRuleOpen} title={editRule ? "Chỉnh sửa quy tắc" : "Thêm quy tắc hoa hồng"} size="sm">
        <form onSubmit={ruleForm.handleSubmit(onRuleSave)}>
          <ModalBody>
            <Field label="Tên quy tắc *" error={ruleErrors.name?.message}>
              <TextField {...ruleForm.register("name")} placeholder="Vd: Hoa hồng điều trị 10%" />
            </Field>
            <Field label="Loại *" style={{ marginTop: 12 }}>
              <Select
                value={ruleForm.watch("type")}
                onChange={v => ruleForm.setValue("type", v as "PERCENT" | "FIXED")}
                options={RULE_TYPE_OPTIONS}
              />
            </Field>
            <Field label={ruleForm.watch("type") === "PERCENT" ? "Phần trăm (%) *" : "Số tiền (VND) *"} error={ruleErrors.value?.message} style={{ marginTop: 12 }}>
              <TextField {...ruleForm.register("value")} type="number" step="0.01" min={0} placeholder="0" />
            </Field>
            <Field label="Loại dịch vụ (tùy chọn)" style={{ marginTop: 12 }}>
              <TextField {...ruleForm.register("serviceType")} placeholder="Vd: TREATMENT" />
            </Field>
            <Field label="Áp dụng cho nhân viên (tùy chọn)" style={{ marginTop: 12 }}>
              <Select
                value={ruleForm.watch("userId") ?? ""}
                onChange={v => ruleForm.setValue("userId", v as string)}
                options={[{ value: "", label: "Tất cả nhân viên" }, ...staffUsers.map(u => ({ value: u.id, label: u.fullName }))]}
              />
            </Field>
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="isActive"
                checked={ruleForm.watch("isActive")}
                onChange={e => ruleForm.setValue("isActive", e.target.checked)}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <label htmlFor="isActive" style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeMd, cursor: "pointer", color: t.colorText }}>
                Đang áp dụng
              </label>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" appearance="subtle" onClick={() => setRuleOpen(false)}>Huỷ</Button>
            <Button type="submit" appearance="primary" isDisabled={ruleSaving}>
              {editRule ? "Cập nhật" : "Thêm quy tắc"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── Delete Confirm Modal ─────────────────────────────────────────── */}
      <Modal open={delOpen} onOpenChange={setDelOpen} title="Xoá quy tắc hoa hồng" size="sm">
        <ModalBody>
          <p style={{ fontFamily: t.fontFamily, color: t.colorText }}>
            Bạn có chắc muốn xoá quy tắc <strong>{deleteRule?.name}</strong>? Hành động này không thể hoàn tác.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button type="button" appearance="subtle" onClick={() => setDelOpen(false)}>Huỷ</Button>
          <Button type="button" appearance="danger" isDisabled={deleting} onClick={onDeleteRule}>Xoá</Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
