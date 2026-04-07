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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/tabs";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/dialog";
import {
  ChevronLeft, Edit2, AlertTriangle, Heart, FileText,
  ClipboardList, Plus, Activity,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

type VitalSign = {
  id: string; recordedAt: string;
  pulse: number | null; systolicBP: number | null; diastolicBP: number | null;
  spO2: string | null; temperature: string | null; note: string | null;
  recordedBy: { fullName: string };
};

type PostOpNote = {
  id: string; day: number; note: string; status: string | null;
  createdAt: string; createdBy: { fullName: string };
};

type Document = {
  id: string; type: string; fileName: string; fileUrl: string;
  signedAt: string | null; createdAt: string;
};

type Episode = {
  id: string; serviceType: string; serviceCode: string | null;
  status: string; chiefComplaint: string | null; diagnosis: string | null;
  operationDate: string | null; completedAt: string | null; createdAt: string;
  customer: { id: string; code: string; fullName: string; phone: string;
    hasAllergy: boolean; allergyNote: string | null;
    hasChronicDisease: boolean; chronicDiseaseNote: string | null; };
  doctor:   { id: string; fullName: string };
  branch:   { name: string } | null;
  vitalSigns:  VitalSign[];
  postOpNotes: PostOpNote[];
  documents:   Document[];
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "ACTIVE",    label: "Đang điều trị" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];
const STATUS_LABELS: Record<string, string>     = Object.fromEntries(STATUS_OPTIONS.map(o => [o.value, o.label]));
const STATUS_APPEARANCE: Record<string, "success" | "neutral" | "danger"> = {
  ACTIVE: "success", COMPLETED: "neutral", CANCELLED: "danger",
};

// ─── Schemas ─────────────────────────────────────────────────────────────────

const editSchema = z.object({
  serviceType:    z.string().min(1),
  serviceCode:    z.string().optional(),
  chiefComplaint: z.string().optional(),
  diagnosis:      z.string().optional(),
  operationDate:  z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

const vsSchema = z.object({
  pulse:       z.string().optional(),
  systolicBP:  z.string().optional(),
  diastolicBP: z.string().optional(),
  spO2:        z.string().optional(),
  temperature: z.string().optional(),
  note:        z.string().optional(),
});
type VsForm = z.infer<typeof vsSchema>;

const postOpSchema = z.object({
  day:    z.string().min(1, "Ngày không được để trống"),
  note:   z.string().min(1, "Nội dung không được để trống"),
  status: z.string().optional(),
});
type PostOpForm = z.infer<typeof postOpSchema>;

// ─── Styled ───────────────────────────────────────────────────────────────────

const Layout = styled.div`
  display: grid; grid-template-columns: 280px 1fr; gap: 16px; align-items: start;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const InfoRow = styled.div`
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 7px 0; border-bottom: 1px solid ${t.colorBorder};
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeMd};
  &:last-child { border-bottom: none; }
`;
const InfoLabel = styled.span`color: ${t.colorTextSubtle}; flex-shrink: 0;`;
const InfoValue = styled.span`color: ${t.colorText}; font-weight: 500; text-align: right; max-width: 60%;`;

const AlertBanner = styled.div<{ variant: "danger" | "warning" }>`
  display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px; border-radius: ${t.radiusMd}; margin-bottom: 8px;
  background: ${p => p.variant === "danger" ? t.colorDangerSubtlest : t.colorWarningSubtlest};
  border: 1px solid ${p => p.variant === "danger" ? t.colorBorderDanger : t.colorBorderWarning};
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeSm};
  color: ${p => p.variant === "danger" ? t.colorTextDanger : t.colorTextWarning};
  svg { flex-shrink: 0; margin-top: 2px; }
  strong { display: block; font-weight: 700; margin-bottom: 2px; font-size: 11px; letter-spacing: .03em; }
`;

const VsCard = styled.div`
  padding: 12px 14px; border-radius: ${t.radiusMd}; background: white;
  border: 1px solid ${t.colorBorder}; margin-bottom: 8px;
`;
const VsGrid = styled.div`
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 6px;
  @media (max-width: 700px) { grid-template-columns: repeat(3, 1fr); }
`;
const VsStat = styled.div`
  text-align: center; padding: 6px;
  border-radius: ${t.radiusSm}; background: ${t.colorBgNeutral};
`;
const VsValue = styled.div`font-family: ${t.fontFamily}; font-size: 16px; font-weight: 700; color: ${t.colorText};`;
const VsLabel = styled.div`font-family: ${t.fontFamily}; font-size: 10px; color: ${t.colorTextSubtlest}; margin-top: 2px; text-transform: uppercase;`;
const VsMeta  = styled.div`font-family: ${t.fontFamily}; font-size: ${t.fontSizeXs}; color: ${t.colorTextSubtlest};`;

const NoteCard = styled.div`
  padding: 12px 14px; border-radius: ${t.radiusMd}; background: ${t.colorBgNeutral};
  border: 1px solid ${t.colorBorder}; margin-bottom: 8px; font-family: ${t.fontFamily};
`;
const NoteDay = styled.span`
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: ${t.radiusFull};
  background: ${t.colorBrandBold}; color: white; font-size: 11px; font-weight: 700;
  margin-right: 8px; flex-shrink: 0; font-family: ${t.fontFamily};
`;

const FormGrid = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 12px;`;
const EmptyState = styled.div`
  padding: 40px 0; text-align: center; font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm}; color: ${t.colorTextSubtle};
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "–";
  try { return format(new Date(d), "dd/MM/yyyy", { locale: vi }); } catch { return "–"; }
}
function fmtDT(d: string | null | undefined) {
  if (!d) return "–";
  try { return format(new Date(d), "HH:mm dd/MM/yyyy", { locale: vi }); } catch { return "–"; }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EpisodeDetailClient({ episode, doctors }: {
  episode: Episode;
  doctors: { id: string; fullName: string }[];
  currentUserId: string;
}) {
  const router = useRouter();

  // Edit episode
  const [editOpen, setEditOpen]   = useState(false);
  const [editStatus, setEditStatus] = useState(episode.status);
  const [editDoctorId, setEditDoctorId] = useState(episode.doctor.id);
  const [savingEdit, setSavingEdit] = useState(false);

  // Vital signs
  const [vitalSigns, setVitalSigns]   = useState<VitalSign[]>(episode.vitalSigns);
  const [vsOpen, setVsOpen]           = useState(false);
  const [savingVs, setSavingVs]       = useState(false);

  // Post-op notes
  const [postOpNotes, setPostOpNotes] = useState<PostOpNote[]>(episode.postOpNotes);
  const [popOpen, setPopOpen]         = useState(false);
  const [savingPop, setSavingPop]     = useState(false);

  const editForm = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      serviceType:    episode.serviceType,
      serviceCode:    episode.serviceCode ?? "",
      chiefComplaint: episode.chiefComplaint ?? "",
      diagnosis:      episode.diagnosis ?? "",
      operationDate:  episode.operationDate ? episode.operationDate.slice(0, 10) : "",
    },
  });

  const vsForm  = useForm<VsForm>({ resolver: zodResolver(vsSchema) });
  const popForm = useForm<PostOpForm>({ resolver: zodResolver(postOpSchema) });

  const saveEdit = async (data: EditForm) => {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/episodes/${episode.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, status: editStatus, doctorId: editDoctorId }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      toast.success("Đã cập nhật hồ sơ");
      setEditOpen(false); router.refresh();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSavingEdit(false); }
  };

  const saveVs = async (data: VsForm) => {
    const payload = {
      pulse:       data.pulse       ? parseInt(data.pulse)       : undefined,
      systolicBP:  data.systolicBP  ? parseInt(data.systolicBP)  : undefined,
      diastolicBP: data.diastolicBP ? parseInt(data.diastolicBP) : undefined,
      spO2:        data.spO2        ? parseFloat(data.spO2)       : undefined,
      temperature: data.temperature ? parseFloat(data.temperature): undefined,
      note:        data.note,
    };
    setSavingVs(true);
    try {
      const res = await fetch(`/api/episodes/${episode.id}/vital-signs`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const vs = await res.json();
      setVitalSigns(prev => [vs, ...prev]);
      vsForm.reset(); setVsOpen(false);
      toast.success("Đã ghi nhận sinh hiệu");
    } catch (err) { toast.error((err as Error).message); }
    finally { setSavingVs(false); }
  };

  const savePop = async (data: PostOpForm) => {
    setSavingPop(true);
    try {
      const res = await fetch(`/api/episodes/${episode.id}/post-op-notes`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day: parseInt(data.day), note: data.note, status: data.status }),
      });
      if (!res.ok) throw new Error((await res.json()).message);
      const note = await res.json();
      setPostOpNotes(prev => [...prev, note].sort((a, b) => a.day - b.day));
      popForm.reset(); setPopOpen(false);
      toast.success("Đã thêm ghi chú hậu phẫu");
    } catch (err) { toast.error((err as Error).message); }
    finally { setSavingPop(false); }
  };

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Link href="/admin/episodes" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: t.colorTextSubtle, fontFamily: t.fontFamily, fontSize: t.fontSizeSm, textDecoration: "none" }}>
          <ChevronLeft size={14} /> Hồ sơ bệnh án
        </Link>
        <span style={{ color: t.colorBorder }}>›</span>
        <Link href={`/customers/${episode.customer.id}`} style={{ color: t.colorTextSubtle, fontFamily: t.fontFamily, fontSize: t.fontSizeSm, textDecoration: "none" }}>
          {episode.customer.fullName}
        </Link>
      </div>

      <Layout>
        {/* ─── Left sidebar ─────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {episode.customer.hasAllergy && (
            <AlertBanner variant="danger">
              <AlertTriangle size={14} />
              <div><strong>⚠ DỊ ỨNG</strong>{episode.customer.allergyNote ?? "Xem hồ sơ khách hàng"}</div>
            </AlertBanner>
          )}
          {episode.customer.hasChronicDisease && (
            <AlertBanner variant="warning">
              <AlertTriangle size={14} />
              <div><strong>⚠ BỆNH MÃN TÍNH</strong>{episode.customer.chronicDiseaseNote ?? "Xem hồ sơ khách hàng"}</div>
            </AlertBanner>
          )}

          <Card>
            <CardHeader style={{ padding: "14px 16px 8px" }}>
              <div>
                <CardTitle style={{ margin: "0 0 6px", fontSize: 14 }}>{episode.serviceType}</CardTitle>
                <Badge appearance={STATUS_APPEARANCE[episode.status] ?? "default"} styleVariant="subtle">
                  {STATUS_LABELS[episode.status] ?? episode.status}
                </Badge>
              </div>
              <Button appearance="subtle" onClick={() => setEditOpen(true)} title="Chỉnh sửa">
                <Edit2 size={14} />
              </Button>
            </CardHeader>
            <CardContent style={{ padding: "4px 16px 16px" }}>
              <InfoRow>
                <InfoLabel>Khách hàng</InfoLabel>
                <InfoValue>
                  <Link href={`/customers/${episode.customer.id}`} style={{ color: t.colorTextBrand, textDecoration: "none" }}>
                    {episode.customer.fullName}
                  </Link>
                </InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Mã KH</InfoLabel>
                <InfoValue style={{ fontFamily: "monospace" }}>{episode.customer.code}</InfoValue>
              </InfoRow>
              {episode.serviceCode && (
                <InfoRow><InfoLabel>Mã DV</InfoLabel><InfoValue style={{ fontFamily: "monospace" }}>{episode.serviceCode}</InfoValue></InfoRow>
              )}
              <InfoRow><InfoLabel>Bác sĩ</InfoLabel><InfoValue>{episode.doctor.fullName}</InfoValue></InfoRow>
              <InfoRow><InfoLabel>Chi nhánh</InfoLabel><InfoValue>{episode.branch?.name ?? "–"}</InfoValue></InfoRow>
              {episode.chiefComplaint && (
                <InfoRow><InfoLabel>Lý do khám</InfoLabel><InfoValue>{episode.chiefComplaint}</InfoValue></InfoRow>
              )}
              {episode.diagnosis && (
                <InfoRow><InfoLabel>Chẩn đoán</InfoLabel><InfoValue>{episode.diagnosis}</InfoValue></InfoRow>
              )}
              <InfoRow><InfoLabel>Ngày PT</InfoLabel><InfoValue>{fmtDate(episode.operationDate)}</InfoValue></InfoRow>
              {episode.completedAt && (
                <InfoRow><InfoLabel>Hoàn thành</InfoLabel><InfoValue>{fmtDate(episode.completedAt)}</InfoValue></InfoRow>
              )}
              <InfoRow><InfoLabel>Tạo lúc</InfoLabel><InfoValue>{fmtDT(episode.createdAt)}</InfoValue></InfoRow>
            </CardContent>
          </Card>
        </div>

        {/* ─── Right: tabs ──────────────────────────────────────── */}
        <div>
          <Tabs defaultValue="vitals">
            <TabList>
              <Tab value="vitals">
                <Activity size={14} />Sinh hiệu ({vitalSigns.length})
              </Tab>
              <Tab value="postop">
                <Heart size={14} />Hậu phẫu ({postOpNotes.length})
              </Tab>
              <Tab value="docs">
                <FileText size={14} />Tài liệu ({episode.documents.length})
              </Tab>
              <Tab value="summary">
                <ClipboardList size={14} />Tóm tắt
              </Tab>
            </TabList>

            {/* ── Vital Signs ── */}
            <TabPanel value="vitals" style={{ paddingTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <Button appearance="primary" onClick={() => setVsOpen(true)}>
                  <Plus size={14} /> Ghi sinh hiệu
                </Button>
              </div>
              {vitalSigns.length === 0
                ? <EmptyState>Chưa có dữ liệu sinh hiệu</EmptyState>
                : vitalSigns.map(vs => (
                  <VsCard key={vs.id}>
                    <VsGrid>
                      <VsStat>
                        <VsValue>{vs.pulse ?? "–"}</VsValue>
                        <VsLabel>Mạch (lần/phút)</VsLabel>
                      </VsStat>
                      <VsStat>
                        <VsValue>{vs.systolicBP && vs.diastolicBP ? `${vs.systolicBP}/${vs.diastolicBP}` : "–"}</VsValue>
                        <VsLabel>Huyết áp (mmHg)</VsLabel>
                      </VsStat>
                      <VsStat>
                        <VsValue>{vs.spO2 ? `${Number(vs.spO2)}%` : "–"}</VsValue>
                        <VsLabel>SpO2</VsLabel>
                      </VsStat>
                      <VsStat>
                        <VsValue>{vs.temperature ? `${Number(vs.temperature)}°C` : "–"}</VsValue>
                        <VsLabel>Nhiệt độ</VsLabel>
                      </VsStat>
                      <VsStat style={{ gridColumn: "span 1" }}>
                        <VsValue style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {fmtDT(vs.recordedAt)}
                        </VsValue>
                        <VsLabel>Thời gian</VsLabel>
                      </VsStat>
                    </VsGrid>
                    {vs.note && <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeSm, color: t.colorTextSubtle, marginBottom: 4 }}>{vs.note}</div>}
                    <VsMeta>Ghi bởi: {vs.recordedBy.fullName} · {fmtDT(vs.recordedAt)}</VsMeta>
                  </VsCard>
                ))
              }
            </TabPanel>

            {/* ── Post-op Notes ── */}
            <TabPanel value="postop" style={{ paddingTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                <Button appearance="primary" onClick={() => setPopOpen(true)}>
                  <Plus size={14} /> Thêm ghi chú
                </Button>
              </div>
              {postOpNotes.length === 0
                ? <EmptyState>Chưa có ghi chú hậu phẫu</EmptyState>
                : postOpNotes.map(n => (
                  <NoteCard key={n.id}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                      <NoteDay>N{n.day}</NoteDay>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeMd, color: t.colorText, whiteSpace: "pre-wrap" }}>{n.note}</div>
                        {n.status && (
                          <Badge appearance="default" styleVariant="subtle" style={{ marginTop: 4 }}>{n.status}</Badge>
                        )}
                      </div>
                    </div>
                    <VsMeta>{n.createdBy.fullName} · {fmtDT(n.createdAt)}</VsMeta>
                  </NoteCard>
                ))
              }
            </TabPanel>

            {/* ── Documents ── */}
            <TabPanel value="docs" style={{ paddingTop: 14 }}>
              {episode.documents.length === 0
                ? <EmptyState>Chưa có tài liệu nào</EmptyState>
                : episode.documents.map(d => (
                  <NoteCard key={d.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeMd, fontWeight: 600, color: t.colorText }}>{d.fileName}</div>
                        <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeXs, color: t.colorTextSubtlest, marginTop: 2 }}>
                          {d.type} · {fmtDate(d.createdAt)}
                          {d.signedAt && ` · Đã ký ${fmtDate(d.signedAt)}`}
                        </div>
                      </div>
                      <Button appearance="subtle" as="a" href={d.fileUrl} target="_blank" rel="noopener noreferrer">
                        Xem
                      </Button>
                    </div>
                  </NoteCard>
                ))
              }
            </TabPanel>

            {/* ── Summary ── */}
            <TabPanel value="summary" style={{ paddingTop: 14 }}>
              <NoteCard>
                <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeSm, fontWeight: 600, color: t.colorText, marginBottom: 10 }}>Thông tin tổng hợp</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: t.fontFamily, fontSize: t.fontSizeMd }}>
                  {[
                    ["Dịch vụ",    episode.serviceType],
                    ["Mã dịch vụ", episode.serviceCode ?? "–"],
                    ["Lý do khám", episode.chiefComplaint ?? "–"],
                    ["Chẩn đoán",  episode.diagnosis ?? "–"],
                    ["Ngày PT",    fmtDate(episode.operationDate)],
                    ["Bác sĩ",     episode.doctor.fullName],
                    ["Số lần ghi sinh hiệu", String(vitalSigns.length)],
                    ["Số ghi chú hậu phẫu",  String(postOpNotes.length)],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: `1px solid ${t.colorBorder}` }}>
                      <td style={{ padding: "7px 0", color: t.colorTextSubtle, width: "40%" }}>{label}</td>
                      <td style={{ padding: "7px 0", color: t.colorText, fontWeight: 500 }}>{value}</td>
                    </tr>
                  ))}
                </table>
              </NoteCard>
            </TabPanel>
          </Tabs>
        </div>
      </Layout>

      {/* ─── Edit modal ────────────────────────────────────────────── */}
      <Modal open={editOpen} onOpenChange={setEditOpen} title="Chỉnh sửa hồ sơ bệnh án" size="default">
        <form onSubmit={editForm.handleSubmit(saveEdit)}>
          <ModalBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <FormGrid>
                <Field label="Loại dịch vụ" required>
                  <TextField {...editForm.register("serviceType")} isInvalid={!!editForm.formState.errors.serviceType} />
                </Field>
                <Field label="Mã dịch vụ">
                  <TextField {...editForm.register("serviceCode")} />
                </Field>
              </FormGrid>
              <FormGrid>
                <Field label="Bác sĩ phụ trách">
                  <Select
                    options={doctors.map(d => ({ value: d.id, label: d.fullName }))}
                    value={editDoctorId} onChange={setEditDoctorId} placeholder="Chọn bác sĩ"
                  />
                </Field>
                <Field label="Ngày phẫu thuật">
                  <TextField type="date" {...editForm.register("operationDate")} />
                </Field>
              </FormGrid>
              <Field label="Lý do khám / triệu chứng">
                <TextField {...editForm.register("chiefComplaint")} />
              </Field>
              <Field label="Chẩn đoán">
                <TextField {...editForm.register("diagnosis")} />
              </Field>
              <Field label="Trạng thái">
                <Select options={STATUS_OPTIONS} value={editStatus} onChange={setEditStatus} placeholder="Chọn trạng thái" />
              </Field>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" type="button" onClick={() => setEditOpen(false)}>Hủy</Button>
            <Button appearance="primary" type="submit" isDisabled={savingEdit}>
              {savingEdit ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ─── Vital signs modal ─────────────────────────────────────── */}
      <Modal open={vsOpen} onOpenChange={setVsOpen} title="Ghi nhận sinh hiệu" size="sm">
        <form onSubmit={vsForm.handleSubmit(saveVs)}>
          <ModalBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FormGrid>
                <Field label="Mạch (lần/phút)" hint="VD: 72">
                  <TextField type="number" placeholder="72" {...vsForm.register("pulse")} />
                </Field>
                <Field label="SpO2 (%)" hint="VD: 98">
                  <TextField type="number" step="0.1" placeholder="98" {...vsForm.register("spO2")} />
                </Field>
              </FormGrid>
              <FormGrid>
                <Field label="Huyết áp tâm thu (mmHg)">
                  <TextField type="number" placeholder="120" {...vsForm.register("systolicBP")} />
                </Field>
                <Field label="Huyết áp tâm trương (mmHg)">
                  <TextField type="number" placeholder="80" {...vsForm.register("diastolicBP")} />
                </Field>
              </FormGrid>
              <Field label="Nhiệt độ (°C)">
                <TextField type="number" step="0.1" placeholder="36.5" {...vsForm.register("temperature")} />
              </Field>
              <Field label="Ghi chú">
                <TextField placeholder="Tình trạng đặc biệt..." {...vsForm.register("note")} />
              </Field>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" type="button" onClick={() => { setVsOpen(false); vsForm.reset(); }}>Hủy</Button>
            <Button appearance="primary" type="submit" isDisabled={savingVs}>
              {savingVs ? "Đang lưu..." : "Ghi nhận"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ─── Post-op note modal ────────────────────────────────────── */}
      <Modal open={popOpen} onOpenChange={setPopOpen} title="Thêm ghi chú hậu phẫu" size="sm">
        <form onSubmit={popForm.handleSubmit(savePop)}>
          <ModalBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <FormGrid>
                <Field label="Ngày thứ (N+?)" required error={popForm.formState.errors.day?.message}>
                  <TextField type="number" min="0" placeholder="1" isInvalid={!!popForm.formState.errors.day} {...popForm.register("day")} />
                </Field>
                <Field label="Trạng thái" hint="VD: Tốt, Bình thường, Cần theo dõi">
                  <TextField placeholder="Tốt" {...popForm.register("status")} />
                </Field>
              </FormGrid>
              <Field label="Nội dung" required error={popForm.formState.errors.note?.message}>
                <Textarea
                  placeholder="Mô tả tình trạng sau phẫu thuật..."
                  isInvalid={!!popForm.formState.errors.note}
                  {...popForm.register("note")}
                  style={{ minHeight: 80 }}
                />
              </Field>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" type="button" onClick={() => { setPopOpen(false); popForm.reset(); }}>Hủy</Button>
            <Button appearance="primary" type="submit" isDisabled={savingPop}>
              {savingPop ? "Đang lưu..." : "Thêm ghi chú"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
