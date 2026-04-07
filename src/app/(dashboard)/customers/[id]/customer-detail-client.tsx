"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import styled from "styled-components";
import { tokens as t } from "@/components/ui/tokens";
import { Button } from "@/components/ui/button";
import { Field, TextField, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, Lozenge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/tabs";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/dialog";
import {
  Phone, AlertTriangle, Edit2, MessageSquare, Send,
  FileText, Calendar, Package, ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

type Customer = {
  id: string; code: string; fullName: string; phone: string;
  email: string | null; dateOfBirth: string | null; gender: string;
  idNumber: string | null; address: string | null; source: string | null;
  status: string; tier: string; totalSpent: number; discountRate: number;
  hasAllergy: boolean; allergyNote: string | null;
  hasChronicDisease: boolean; chronicDiseaseNote: string | null;
  lastVisitAt: string | null; createdAt: string;
  branch: { name: string } | null;
  createdBy: { fullName: string };
  assignedSale: { id: string; fullName: string } | null;
  notes: Note[];
  episodes: Episode[];
  appointments: Appointment[];
  invoices: Invoice[];
};

type Note = {
  id: string; content: string; type: string;
  createdAt: string; resolvedAt: string | null;
  createdBy: { fullName: string };
};

type Episode  = { id: string; chiefComplaint: string | null; status: string; createdAt: string };
type Appointment = { id: string; startTime: string; status: string; note: string | null };
type Invoice  = { id: string; totalAmount: number; status: string; createdAt: string };

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "CONSULTING",      label: "Tư vấn" },
  { value: "WAITING_SURGERY", label: "Chờ phẫu thuật" },
  { value: "IN_TREATMENT",    label: "Đang điều trị" },
  { value: "COMPLETED",       label: "Hoàn thành" },
  { value: "INACTIVE",        label: "Ngưng" },
];

const STATUS_LABELS: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, o.label]));
const STATUS_APPEARANCE: Record<string, "primary" | "warning" | "success" | "neutral" | "danger"> = {
  CONSULTING: "primary", WAITING_SURGERY: "warning",
  IN_TREATMENT: "success", COMPLETED: "neutral", INACTIVE: "danger",
};
const TIER_LABELS: Record<string, string> = { BRONZE: "Đồng", SILVER: "Bạc", GOLD: "Vàng", DIAMOND: "Kim cương" };
const TIER_APPEARANCE: Record<string, "default" | "neutral" | "warning" | "discovery"> = {
  BRONZE: "default", SILVER: "neutral", GOLD: "warning", DIAMOND: "discovery",
};
const GENDER_OPTIONS = [
  { value: "MALE", label: "Nam" }, { value: "FEMALE", label: "Nữ" }, { value: "OTHER", label: "Khác" },
];
const GENDER_LABELS: Record<string, string> = Object.fromEntries(GENDER_OPTIONS.map(o => [o.value, o.label]));
const SOURCE_OPTIONS = [
  { value: "WALK_IN",  label: "Tự đến" },  { value: "REFERRAL", label: "Giới thiệu" },
  { value: "FACEBOOK", label: "Facebook" }, { value: "ZALO",     label: "Zalo" },
  { value: "TIKTOK",   label: "TikTok" },  { value: "GOOGLE",   label: "Google" },
  { value: "OTHER",    label: "Khác" },
];
const SOURCE_LABELS: Record<string, string> = Object.fromEntries(SOURCE_OPTIONS.map(o => [o.value, o.label]));

// ─── Edit schema ─────────────────────────────────────────────────────────────

const editSchema = z.object({
  fullName:           z.string().min(1, "Họ tên không được để trống"),
  email:              z.string().optional(),
  dateOfBirth:        z.string().optional(),
  idNumber:           z.string().optional(),
  address:            z.string().optional(),
  hasAllergy:         z.boolean().optional(),
  allergyNote:        z.string().optional(),
  hasChronicDisease:  z.boolean().optional(),
  chronicDiseaseNote: z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

// ─── Styled ───────────────────────────────────────────────────────────────────

const Layout = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 16px;
  align-items: start;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 8px 0;
  border-bottom: 1px solid ${t.colorBorder};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  &:last-child { border-bottom: none; }
`;
const InfoLabel = styled.span`color: ${t.colorTextSubtle};`;
const InfoValue = styled.span`color: ${t.colorText}; font-weight: 500; text-align: right; max-width: 62%;`;

const AlertBanner = styled.div<{ variant: "danger" | "warning" }>`
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 14px; border-radius: ${t.radiusMd}; margin-bottom: 8px;
  background: ${p => p.variant === "danger" ? t.colorDangerSubtlest : t.colorWarningSubtlest};
  border: 1px solid ${p => p.variant === "danger" ? t.colorBorderDanger : t.colorBorderWarning};
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeSm};
  color: ${p => p.variant === "danger" ? t.colorTextDanger : t.colorTextWarning};
  svg { flex-shrink: 0; margin-top: 2px; }
  strong { display: block; font-weight: 700; margin-bottom: 2px; font-size: 11px; letter-spacing: .03em; }
`;

const NoteItem = styled.div`
  padding: 12px; border-radius: ${t.radiusMd};
  background: ${t.colorBgNeutral}; border: 1px solid ${t.colorBorder};
  margin-bottom: 8px; font-family: ${t.fontFamily};
`;
const NoteContent = styled.p`margin: 0 0 6px; font-size: ${t.fontSizeMd}; color: ${t.colorText}; white-space: pre-wrap;`;
const NoteMeta   = styled.p`margin: 0; font-size: ${t.fontSizeXs}; color: ${t.colorTextSubtlest};`;
const NoteInput  = styled.div`display: flex; gap: 8px; align-items: flex-start;`;

const PhoneReveal = styled.button`
  all: unset; cursor: pointer; font-family: ${t.fontFamily}; font-size: ${t.fontSizeMd};
  color: ${t.colorTextBrand}; text-decoration: underline dashed;
  display: inline-flex; align-items: center; gap: 4px;
  &:hover { color: ${t.colorBrandBoldHovered}; }
`;

const FormGrid = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 14px;`;
const Divider  = styled.div`border-top: 1px solid ${t.colorBorder}; margin: 4px 0 12px;`;
const SectionLabel = styled.p`
  margin: 0 0 10px; font-family: ${t.fontFamily}; font-size: ${t.fontSizeSm};
  font-weight: 600; color: ${t.colorText};
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "–";
  try { return format(new Date(d), "dd/MM/yyyy", { locale: vi }); } catch { return "–"; }
}
function fmtDateTime(d: string | null | undefined) {
  if (!d) return "–";
  try { return format(new Date(d), "HH:mm dd/MM/yyyy", { locale: vi }); } catch { return "–"; }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CustomerDetailClient({ customer, sales }: {
  customer: Customer;
  sales: { id: string; fullName: string }[];
  currentUserId: string;
}) {
  const router = useRouter();

  // Phone reveal
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);

  // Notes
  const [noteContent, setNoteContent] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [notes, setNotes] = useState<Note[]>(customer.notes);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editStatus, setEditStatus] = useState(customer.status);
  const [editGender, setEditGender] = useState(customer.gender);
  const [editSource, setEditSource] = useState(customer.source ?? "");
  const [editSaleId, setEditSaleId] = useState(customer.assignedSale?.id ?? "");
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      fullName:           customer.fullName,
      email:              customer.email ?? "",
      dateOfBirth:        customer.dateOfBirth ? customer.dateOfBirth.slice(0, 10) : "",
      idNumber:           customer.idNumber ?? "",
      address:            customer.address ?? "",
      hasAllergy:         customer.hasAllergy,
      allergyNote:        customer.allergyNote ?? "",
      hasChronicDisease:  customer.hasChronicDisease,
      chronicDiseaseNote: customer.chronicDiseaseNote ?? "",
    },
  });

  const hasAllergy        = watch("hasAllergy");
  const hasChronicDisease = watch("hasChronicDisease");

  const revealPhone = async () => {
    try {
      const res = await fetch(`/api/customers/${customer.id}/phone`);
      if (!res.ok) throw new Error();
      const { phone } = await res.json();
      setRevealedPhone(phone);
      toast.info("Số điện thoại đã được ghi log");
    } catch {
      toast.error("Không thể hiển thị số điện thoại");
    }
  };

  const sendNote = async () => {
    if (!noteContent.trim()) return;
    setSendingNote(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/notes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      if (!res.ok) throw new Error();
      const note = await res.json();
      setNotes(prev => [note, ...prev]);
      setNoteContent("");
    } catch {
      toast.error("Không thể thêm ghi chú");
    } finally {
      setSendingNote(false);
    }
  };

  const onSave = async (data: EditForm) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          gender: editGender,
          source: editSource || null,
          status: editStatus,
          assignedSaleId: editSaleId || null,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success("Đã cập nhật thông tin khách hàng");
      setEditOpen(false);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message ?? "Không thể cập nhật");
    } finally {
      setSaving(false);
    }
  };

  const salesOptions = [
    { value: "", label: "Chưa phân công" },
    ...sales.map(s => ({ value: s.id, label: s.fullName })),
  ];

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Link href="/customers" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: t.colorTextSubtle, fontFamily: t.fontFamily, fontSize: t.fontSizeSm, textDecoration: "none" }}>
          <ChevronLeft size={14} /> Danh sách khách hàng
        </Link>
      </div>

      <Layout>
        {/* ─── Left: profile card ─────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {customer.hasAllergy && (
            <AlertBanner variant="danger">
              <AlertTriangle size={14} />
              <div><strong>⚠ DỊ ỨNG</strong>{customer.allergyNote ?? "Xem chi tiết trong hồ sơ"}</div>
            </AlertBanner>
          )}
          {customer.hasChronicDisease && (
            <AlertBanner variant="warning">
              <AlertTriangle size={14} />
              <div><strong>⚠ BỆNH MÃN TÍNH</strong>{customer.chronicDiseaseNote ?? "Xem chi tiết trong hồ sơ"}</div>
            </AlertBanner>
          )}

          <Card>
            <CardHeader style={{ padding: "14px 16px 10px" }}>
              <div>
                <CardTitle style={{ margin: "0 0 6px" }}>{customer.fullName}</CardTitle>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Badge appearance={STATUS_APPEARANCE[customer.status] ?? "default"} styleVariant="subtle">
                    {STATUS_LABELS[customer.status] ?? customer.status}
                  </Badge>
                  <Lozenge appearance={TIER_APPEARANCE[customer.tier] ?? "default"} styleVariant="subtle">
                    {TIER_LABELS[customer.tier] ?? customer.tier}
                  </Lozenge>
                </div>
              </div>
              <Button appearance="subtle" onClick={() => setEditOpen(true)} title="Chỉnh sửa">
                <Edit2 size={14} />
              </Button>
            </CardHeader>

            <CardContent style={{ padding: "4px 16px 16px" }}>
              <InfoRow>
                <InfoLabel>Mã KH</InfoLabel>
                <InfoValue style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13 }}>{customer.code}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Điện thoại</InfoLabel>
                <InfoValue>
                  {revealedPhone
                    ? <span style={{ color: t.colorText }}>{revealedPhone}</span>
                    : <PhoneReveal onClick={revealPhone}><Phone size={11} />{customer.phone}</PhoneReveal>
                  }
                </InfoValue>
              </InfoRow>
              {customer.email && (
                <InfoRow><InfoLabel>Email</InfoLabel><InfoValue>{customer.email}</InfoValue></InfoRow>
              )}
              <InfoRow>
                <InfoLabel>Ngày sinh</InfoLabel>
                <InfoValue>{fmtDate(customer.dateOfBirth)}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Giới tính</InfoLabel>
                <InfoValue>{GENDER_LABELS[customer.gender] ?? "–"}</InfoValue>
              </InfoRow>
              {customer.idNumber && (
                <InfoRow><InfoLabel>CCCD</InfoLabel><InfoValue>{customer.idNumber}</InfoValue></InfoRow>
              )}
              {customer.address && (
                <InfoRow><InfoLabel>Địa chỉ</InfoLabel><InfoValue>{customer.address}</InfoValue></InfoRow>
              )}
              {customer.source && (
                <InfoRow><InfoLabel>Nguồn</InfoLabel><InfoValue>{SOURCE_LABELS[customer.source] ?? customer.source}</InfoValue></InfoRow>
              )}
              <InfoRow>
                <InfoLabel>Tư vấn viên</InfoLabel>
                <InfoValue>{customer.assignedSale?.fullName ?? "–"}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Chi nhánh</InfoLabel>
                <InfoValue>{customer.branch?.name ?? "–"}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Tổng chi tiêu</InfoLabel>
                <InfoValue style={{ color: t.colorTextSuccess, fontWeight: 700 }}>
                  {customer.totalSpent > 0 ? `${customer.totalSpent.toLocaleString("vi-VN")} ₫` : "–"}
                </InfoValue>
              </InfoRow>
              {customer.discountRate > 0 && (
                <InfoRow><InfoLabel>Giảm giá</InfoLabel><InfoValue>{Number(customer.discountRate)}%</InfoValue></InfoRow>
              )}
              <InfoRow>
                <InfoLabel>Lần cuối ghé</InfoLabel>
                <InfoValue>{fmtDate(customer.lastVisitAt)}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Ngày tạo</InfoLabel>
                <InfoValue>{fmtDateTime(customer.createdAt)}</InfoValue>
              </InfoRow>
            </CardContent>
          </Card>
        </div>

        {/* ─── Right: tabs ─────────────────────────────────────────────── */}
        <div>
          <Tabs defaultValue="notes">
            <TabList>
              <Tab value="notes"><MessageSquare size={14} /> Ghi chú ({notes.length})</Tab>
              <Tab value="episodes"><FileText size={14} /> Hồ sơ bệnh án ({customer.episodes.length})</Tab>
              <Tab value="appointments"><Calendar size={14} /> Lịch hẹn ({customer.appointments.length})</Tab>
              <Tab value="invoices"><Package size={14} /> Hoá đơn ({customer.invoices.length})</Tab>
            </TabList>

            <TabPanel value="notes" style={{ paddingTop: 14 }}>
              <NoteInput>
                <Textarea
                  placeholder="Thêm ghi chú... (Ctrl+Enter để gửi)"
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  style={{ flex: 1, minHeight: 68 }}
                  onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) sendNote(); }}
                />
                <Button appearance="primary" onClick={sendNote} isDisabled={sendingNote || !noteContent.trim()}>
                  <Send size={14} />
                </Button>
              </NoteInput>
              <div style={{ marginTop: 14 }}>
                {notes.length === 0
                  ? <EmptyState>Chưa có ghi chú nào</EmptyState>
                  : notes.map(n => (
                    <NoteItem key={n.id}>
                      <NoteContent>{n.content}</NoteContent>
                      <NoteMeta>{n.createdBy.fullName} · {fmtDateTime(n.createdAt)}</NoteMeta>
                    </NoteItem>
                  ))
                }
              </div>
            </TabPanel>

            <TabPanel value="episodes" style={{ paddingTop: 14 }}>
              {customer.episodes.length === 0
                ? <EmptyState>Chưa có hồ sơ bệnh án</EmptyState>
                : customer.episodes.map(e => (
                  <NoteItem key={e.id}>
                    <NoteContent>{e.chiefComplaint ?? "Không có lý do khám"}</NoteContent>
                    <NoteMeta>{e.status} · {fmtDate(e.createdAt)}</NoteMeta>
                  </NoteItem>
                ))
              }
            </TabPanel>

            <TabPanel value="appointments" style={{ paddingTop: 14 }}>
              {customer.appointments.length === 0
                ? <EmptyState>Chưa có lịch hẹn nào</EmptyState>
                : customer.appointments.map(a => (
                  <NoteItem key={a.id}>
                    <NoteContent>{fmtDateTime(a.startTime)}</NoteContent>
                    <NoteMeta>{a.status}{a.note ? ` · ${a.note}` : ""}</NoteMeta>
                  </NoteItem>
                ))
              }
            </TabPanel>

            <TabPanel value="invoices" style={{ paddingTop: 14 }}>
              {customer.invoices.length === 0
                ? <EmptyState>Chưa có hoá đơn nào</EmptyState>
                : customer.invoices.map(inv => (
                  <NoteItem key={inv.id}>
                    <NoteContent style={{ fontWeight: 600 }}>{inv.totalAmount.toLocaleString("vi-VN")} ₫</NoteContent>
                    <NoteMeta>{inv.status} · {fmtDate(inv.createdAt)}</NoteMeta>
                  </NoteItem>
                ))
              }
            </TabPanel>
          </Tabs>
        </div>
      </Layout>

      {/* ─── Edit modal ──────────────────────────────────────────────────── */}
      <Modal open={editOpen} onOpenChange={setEditOpen} title="Chỉnh sửa thông tin khách hàng" size="lg">
        <form onSubmit={handleSubmit(onSave)}>
          <ModalBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Basic info */}
              <FormGrid>
                <Field label="Họ và tên" required error={errors.fullName?.message}>
                  <TextField isInvalid={!!errors.fullName} {...register("fullName")} />
                </Field>
                <Field label="Email">
                  <TextField type="email" {...register("email")} />
                </Field>
              </FormGrid>
              <FormGrid>
                <Field label="Ngày sinh">
                  <TextField type="date" {...register("dateOfBirth")} />
                </Field>
                <Field label="CCCD / Hộ chiếu">
                  <TextField {...register("idNumber")} />
                </Field>
              </FormGrid>
              <FormGrid>
                <Field label="Giới tính">
                  <Select options={GENDER_OPTIONS} value={editGender} onChange={setEditGender} placeholder="Chọn" />
                </Field>
                <Field label="Nguồn biết đến">
                  <Select
                    options={[{ value: "", label: "–" }, ...SOURCE_OPTIONS]}
                    value={editSource}
                    onChange={setEditSource}
                    placeholder="Chọn nguồn"
                  />
                </Field>
              </FormGrid>
              <Field label="Địa chỉ">
                <TextField {...register("address")} />
              </Field>
              <FormGrid>
                <Field label="Trạng thái">
                  <Select options={STATUS_OPTIONS} value={editStatus} onChange={setEditStatus} placeholder="Chọn" />
                </Field>
                <Field label="Tư vấn viên phụ trách">
                  <Select options={salesOptions} value={editSaleId} onChange={setEditSaleId} placeholder="Chọn" />
                </Field>
              </FormGrid>

              <Divider />
              <SectionLabel>Thông tin y tế</SectionLabel>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: t.fontFamily, fontSize: t.fontSizeMd }}>
                  <input type="checkbox" {...register("hasAllergy")} style={{ width: 15, height: 15, accentColor: t.colorDanger }} />
                  Có dị ứng
                </label>
                {hasAllergy && (
                  <Field label="Ghi chú dị ứng">
                    <TextField placeholder="Dị ứng với thuốc / vật liệu gì..." {...register("allergyNote")} />
                  </Field>
                )}
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: t.fontFamily, fontSize: t.fontSizeMd }}>
                  <input type="checkbox" {...register("hasChronicDisease")} style={{ width: 15, height: 15, accentColor: t.colorWarningBold }} />
                  Có bệnh mãn tính
                </label>
                {hasChronicDisease && (
                  <Field label="Ghi chú bệnh mãn tính">
                    <TextField placeholder="Tiểu đường, huyết áp, tim mạch..." {...register("chronicDiseaseNote")} />
                  </Field>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" type="button" onClick={() => setEditOpen(false)}>Hủy</Button>
            <Button appearance="primary" type="submit" isDisabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}

const EmptyState = styled.div`
  color: ${t.colorTextSubtle};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  text-align: center;
  padding: 40px 0;
`;
