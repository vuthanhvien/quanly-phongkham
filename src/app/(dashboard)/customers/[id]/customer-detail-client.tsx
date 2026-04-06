"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import styled from "styled-components";
import { tokens as t } from "@/components/ui/tokens";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/input";
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

type Episode = { id: string; chiefComplaint: string | null; status: string; createdAt: string };
type Appointment = { id: string; startTime: string; status: string; note: string | null };
type Invoice = { id: string; totalAmount: number; status: string; createdAt: string };

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  CONSULTING: "Tư vấn", WAITING_SURGERY: "Chờ PT",
  IN_TREATMENT: "Điều trị", COMPLETED: "Hoàn thành", INACTIVE: "Ngưng",
};
const STATUS_APPEARANCE: Record<string, "primary" | "warning" | "success" | "neutral" | "danger"> = {
  CONSULTING: "primary", WAITING_SURGERY: "warning",
  IN_TREATMENT: "success", COMPLETED: "neutral", INACTIVE: "danger",
};
const TIER_LABELS: Record<string, string> = { BRONZE: "Đồng", SILVER: "Bạc", GOLD: "Vàng", DIAMOND: "Kim cương" };
const TIER_APPEARANCE: Record<string, "default" | "neutral" | "warning" | "discovery"> = {
  BRONZE: "default", SILVER: "neutral", GOLD: "warning", DIAMOND: "discovery",
};
const GENDER_LABELS: Record<string, string> = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" };
const SOURCE_LABELS: Record<string, string> = {
  WALK_IN: "Tự đến", REFERRAL: "Giới thiệu", FACEBOOK: "Facebook",
  ZALO: "Zalo", TIKTOK: "TikTok", GOOGLE: "Google", OTHER: "Khác",
};

// ─── Styled ───────────────────────────────────────────────────────────────────

const Layout = styled.div`
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  align-items: start;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid ${t.colorBorder};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  &:last-child { border-bottom: none; }
  span:first-child { color: ${t.colorTextSubtle}; }
  span:last-child  { color: ${t.colorText}; font-weight: 500; max-width: 60%; text-align: right; }
`;

const AlertBanner = styled.div<{ variant: "danger" | "warning" }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  border-radius: ${t.radiusMd};
  background: ${p => p.variant === "danger" ? t.colorDangerSubtlest : t.colorWarningSubtlest};
  border: 1px solid ${p => p.variant === "danger" ? t.colorBorderDanger : t.colorBorderWarning};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  color: ${p => p.variant === "danger" ? t.colorTextDanger : t.colorTextWarning};
  margin-bottom: 8px;
  svg { flex-shrink: 0; margin-top: 1px; }
  strong { display: block; font-weight: 700; margin-bottom: 2px; }
`;

const NoteItem = styled.div`
  padding: 12px;
  border-radius: ${t.radiusMd};
  background: ${t.colorBgNeutral};
  border: 1px solid ${t.colorBorder};
  margin-bottom: 8px;
  font-family: ${t.fontFamily};
`;

const NoteContent = styled.p`
  margin: 0 0 6px;
  font-size: ${t.fontSizeMd};
  color: ${t.colorText};
  white-space: pre-wrap;
`;

const NoteMeta = styled.p`
  margin: 0;
  font-size: ${t.fontSizeXs};
  color: ${t.colorTextSubtlest};
`;

const NoteInput = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-top: 12px;
`;

const PhoneReveal = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${t.colorTextBrand};
  text-decoration: underline;
  text-decoration-style: dashed;
  display: flex;
  align-items: center;
  gap: 4px;
  &:hover { color: ${t.colorBrandBoldHovered}; }
`;

function fmtDate(d: string | null | undefined) {
  if (!d) return "–";
  try { return format(new Date(d), "dd/MM/yyyy", { locale: vi }); }
  catch { return "–"; }
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return "–";
  try { return format(new Date(d), "HH:mm dd/MM/yyyy", { locale: vi }); }
  catch { return "–"; }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CustomerDetailClient({ customer }: {
  customer: Customer;
  sales: { id: string; fullName: string }[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState("");
  const [sendingNote, setSendingNote] = useState(false);
  const [notes, setNotes] = useState<Note[]>(customer.notes);
  const [editOpen, setEditOpen] = useState(false);
  const [editStatus, setEditStatus] = useState(customer.status);
  const [saving, setSaving] = useState(false);

  const revealPhone = async () => {
    try {
      const res = await fetch(`/api/customers/${customer.id}/phone`);
      if (!res.ok) throw new Error("Lỗi");
      const { phone } = await res.json();
      setRevealedPhone(phone);
    } catch {
      toast.error("Không thể hiển thị số điện thoại");
    }
  };

  const sendNote = async () => {
    if (!noteContent.trim()) return;
    setSendingNote(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent.trim() }),
      });
      if (!res.ok) throw new Error("Lỗi");
      const note = await res.json();
      setNotes(prev => [note, ...prev]);
      setNoteContent("");
      toast.success("Đã thêm ghi chú");
    } catch {
      toast.error("Không thể thêm ghi chú");
    } finally {
      setSendingNote(false);
    }
  };

  const saveStatus = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus }),
      });
      if (!res.ok) throw new Error("Lỗi");
      toast.success("Cập nhật trạng thái thành công");
      setEditOpen(false);
      router.refresh();
    } catch {
      toast.error("Không thể cập nhật");
    } finally {
      setSaving(false);
    }
  };

  const maskedPhone = customer.phone; // already masked from server

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link href="/customers" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: t.colorTextSubtle, fontFamily: t.fontFamily, fontSize: t.fontSizeSm, textDecoration: "none" }}>
          <ChevronLeft size={14} /> Danh sách khách hàng
        </Link>
      </div>

      <Layout>
        {/* ── Left sidebar: profile ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Medical alerts */}
          {customer.hasAllergy && (
            <AlertBanner variant="danger">
              <AlertTriangle size={16} />
              <div>
                <strong>DỊ ỨNG</strong>
                {customer.allergyNote ?? "Có dị ứng – xem chi tiết hồ sơ"}
              </div>
            </AlertBanner>
          )}
          {customer.hasChronicDisease && (
            <AlertBanner variant="warning">
              <AlertTriangle size={16} />
              <div>
                <strong>BỆNH MÃN TÍNH</strong>
                {customer.chronicDiseaseNote ?? "Có bệnh mãn tính – xem chi tiết hồ sơ"}
              </div>
            </AlertBanner>
          )}

          <Card>
            <CardHeader style={{ padding: "14px 16px 0" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <CardTitle style={{ margin: 0 }}>{customer.fullName}</CardTitle>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Badge appearance={STATUS_APPEARANCE[customer.status] ?? "default"} styleVariant="subtle">
                    {STATUS_LABELS[customer.status] ?? customer.status}
                  </Badge>
                  <Lozenge appearance={TIER_APPEARANCE[customer.tier] ?? "default"} styleVariant="subtle">
                    {TIER_LABELS[customer.tier] ?? customer.tier}
                  </Lozenge>
                </div>
              </div>
              <Button appearance="subtle" onClick={() => setEditOpen(true)}>
                <Edit2 size={14} />
              </Button>
            </CardHeader>
            <CardContent style={{ padding: "12px 16px 16px" }}>
              <InfoRow>
                <span>Mã KH</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{customer.code}</span>
              </InfoRow>
              <InfoRow>
                <span>Điện thoại</span>
                <span>
                  {revealedPhone ? (
                    <span style={{ color: t.colorText }}>{revealedPhone}</span>
                  ) : (
                    <PhoneReveal onClick={revealPhone}>
                      <Phone size={12} /> {maskedPhone}
                    </PhoneReveal>
                  )}
                </span>
              </InfoRow>
              <InfoRow>
                <span>Email</span>
                <span>{customer.email ?? "–"}</span>
              </InfoRow>
              <InfoRow>
                <span>Ngày sinh</span>
                <span>{fmtDate(customer.dateOfBirth)}</span>
              </InfoRow>
              <InfoRow>
                <span>Giới tính</span>
                <span>{GENDER_LABELS[customer.gender] ?? "–"}</span>
              </InfoRow>
              <InfoRow>
                <span>Địa chỉ</span>
                <span>{customer.address ?? "–"}</span>
              </InfoRow>
              <InfoRow>
                <span>Nguồn</span>
                <span>{customer.source ? (SOURCE_LABELS[customer.source] ?? customer.source) : "–"}</span>
              </InfoRow>
              <InfoRow>
                <span>Tư vấn viên</span>
                <span>{customer.assignedSale?.fullName ?? "–"}</span>
              </InfoRow>
              <InfoRow>
                <span>Chi nhánh</span>
                <span>{customer.branch?.name ?? "–"}</span>
              </InfoRow>
              <InfoRow>
                <span>Tổng chi tiêu</span>
                <span style={{ color: t.colorTextSuccess, fontWeight: 700 }}>
                  {customer.totalSpent > 0 ? `${customer.totalSpent.toLocaleString("vi-VN")} ₫` : "–"}
                </span>
              </InfoRow>
              <InfoRow>
                <span>Giảm giá</span>
                <span>{customer.discountRate > 0 ? `${customer.discountRate}%` : "–"}</span>
              </InfoRow>
              <InfoRow>
                <span>Lần cuối ghé</span>
                <span>{fmtDate(customer.lastVisitAt)}</span>
              </InfoRow>
              <InfoRow>
                <span>Tạo lúc</span>
                <span>{fmtDateTime(customer.createdAt)}</span>
              </InfoRow>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: tabs ── */}
        <div>
          <Tabs defaultValue="notes">
            <TabList>
              <Tab value="notes">
                <MessageSquare size={14} /> Ghi chú
              </Tab>
              <Tab value="episodes">
                <FileText size={14} /> Hồ sơ bệnh án ({customer.episodes.length})
              </Tab>
              <Tab value="appointments">
                <Calendar size={14} /> Lịch hẹn ({customer.appointments.length})
              </Tab>
              <Tab value="invoices">
                <Package size={14} /> Hoá đơn ({customer.invoices.length})
              </Tab>
            </TabList>

            {/* Notes */}
            <TabPanel value="notes" style={{ paddingTop: 16 }}>
              <NoteInput>
                <Textarea
                  placeholder="Thêm ghi chú về khách hàng... (Ctrl+Enter để gửi)"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  style={{ flex: 1, minHeight: 72 }}
                  onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) sendNote(); }}
                />
                <Button appearance="primary" onClick={sendNote} isDisabled={sendingNote || !noteContent.trim()}>
                  <Send size={14} />
                </Button>
              </NoteInput>
              <div style={{ marginTop: 16 }}>
                {notes.length === 0 ? (
                  <div style={{ color: t.colorTextSubtle, fontFamily: t.fontFamily, fontSize: t.fontSizeSm, textAlign: "center", padding: 32 }}>
                    Chưa có ghi chú nào
                  </div>
                ) : notes.map(n => (
                  <NoteItem key={n.id}>
                    <NoteContent>{n.content}</NoteContent>
                    <NoteMeta>{n.createdBy.fullName} · {fmtDateTime(n.createdAt)}</NoteMeta>
                  </NoteItem>
                ))}
              </div>
            </TabPanel>

            {/* Episodes */}
            <TabPanel value="episodes" style={{ paddingTop: 16 }}>
              {customer.episodes.length === 0 ? (
                <div style={{ color: t.colorTextSubtle, fontFamily: t.fontFamily, fontSize: t.fontSizeSm, textAlign: "center", padding: 32 }}>
                  Chưa có hồ sơ bệnh án
                </div>
              ) : customer.episodes.map(e => (
                <NoteItem key={e.id}>
                  <NoteContent>{e.chiefComplaint ?? "Không có lý do"}</NoteContent>
                  <NoteMeta>{e.status} · {fmtDate(e.createdAt)}</NoteMeta>
                </NoteItem>
              ))}
            </TabPanel>

            {/* Appointments */}
            <TabPanel value="appointments" style={{ paddingTop: 16 }}>
              {customer.appointments.length === 0 ? (
                <div style={{ color: t.colorTextSubtle, fontFamily: t.fontFamily, fontSize: t.fontSizeSm, textAlign: "center", padding: 32 }}>
                  Chưa có lịch hẹn nào
                </div>
              ) : customer.appointments.map(a => (
                <NoteItem key={a.id}>
                  <NoteContent>{fmtDateTime(a.startTime)}</NoteContent>
                  <NoteMeta>{a.status}{a.note ? ` · ${a.note}` : ""}</NoteMeta>
                </NoteItem>
              ))}
            </TabPanel>

            {/* Invoices */}
            <TabPanel value="invoices" style={{ paddingTop: 16 }}>
              {customer.invoices.length === 0 ? (
                <div style={{ color: t.colorTextSubtle, fontFamily: t.fontFamily, fontSize: t.fontSizeSm, textAlign: "center", padding: 32 }}>
                  Chưa có hoá đơn nào
                </div>
              ) : customer.invoices.map(inv => (
                <NoteItem key={inv.id}>
                  <NoteContent>
                    {inv.totalAmount.toLocaleString("vi-VN")} ₫
                  </NoteContent>
                  <NoteMeta>{inv.status} · {fmtDate(inv.createdAt)}</NoteMeta>
                </NoteItem>
              ))}
            </TabPanel>
          </Tabs>
        </div>
      </Layout>

      {/* Edit status modal */}
      <Modal open={editOpen} onOpenChange={setEditOpen} title="Cập nhật trạng thái" size="xs">
        <ModalBody>
          <Field label="Trạng thái">
            <Select
              options={Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l }))}
              value={editStatus}
              onChange={setEditStatus}
              placeholder="Chọn trạng thái"
            />
          </Field>
        </ModalBody>
        <ModalFooter>
          <Button appearance="subtle" onClick={() => setEditOpen(false)}>Hủy</Button>
          <Button appearance="primary" onClick={saveStatus} isDisabled={saving}>
            {saving ? "Đang lưu..." : "Cập nhật"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
