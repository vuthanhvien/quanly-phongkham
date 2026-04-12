"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { SectionHeader, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ClipboardPlus, Search, ChevronLeft, ChevronRight, Activity, X } from "lucide-react";
import { Autocomplete } from "@/components/ui/autocomplete";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

type VisitRecord = {
  id: string;
  visitDate: string;
  status: string;
  chiefComplaint: string | null;
  diagnosis: string | null;
  prescription: string | null;
  note: string | null;
  pulse: number | null;
  systolicBP: number | null;
  diastolicBP: number | null;
  spO2: string | null;
  temperature: string | null;
  weight: string | null;
  customer: { id: string; code: string; fullName: string; phone: string };
  doctor:   { id: string; fullName: string };
  branch?:  { name: string };
  episode?: { id: string; serviceType: string } | null;
  createdBy: { id: string; fullName: string };
  createdAt: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "",            label: "Tất cả trạng thái" },
  { value: "WAITING",     label: "Chờ khám" },
  { value: "IN_PROGRESS", label: "Đang khám" },
  { value: "COMPLETED",   label: "Hoàn thành" },
  { value: "CANCELLED",   label: "Đã hủy" },
];

const STATUS_LABELS: Record<string, string> = {
  WAITING:     "Chờ khám",
  IN_PROGRESS: "Đang khám",
  COMPLETED:   "Hoàn thành",
  CANCELLED:   "Đã hủy",
};

const STATUS_APPEARANCE: Record<string, "warning" | "success" | "danger"> = {
  WAITING:     "warning",
  IN_PROGRESS: "warning",
  COMPLETED:   "success",
  CANCELLED:   "danger",
};

const STATUS_CREATE_OPTIONS = STATUS_OPTIONS.slice(1);

// ─── Schema ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  visitDate:     z.string().optional(),
  status:        z.string().optional(),
  pulse:         z.string().optional(),
  systolicBP:    z.string().optional(),
  diastolicBP:   z.string().optional(),
  spO2:          z.string().optional(),
  temperature:   z.string().optional(),
  weight:        z.string().optional(),
  chiefComplaint: z.string().optional(),
  diagnosis:      z.string().optional(),
  prescription:   z.string().optional(),
  note:           z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

// ─── Styled ───────────────────────────────────────────────────────────────────

const FilterBar = styled.div`display: flex; gap: 8px; align-items: center; flex-wrap: wrap;`;

const SearchWrap = styled.div`
  position: relative; flex: 1; min-width: 180px; max-width: 280px;
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
const FormGrid3 = styled.div`display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;`;

const Pagination = styled.div`
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid ${t.colorBorder};
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeSm}; color: ${t.colorTextSubtle};
`;

const VitalChip = styled.span`
  display: inline-flex; align-items: center; gap: 3px;
  padding: 1px 7px; border-radius: ${t.radiusFull};
  background: ${t.colorBgNeutralHovered}; font-size: 11px;
  font-family: ${t.fontFamily}; color: ${t.colorTextSubtle};
`;

const DetailOverlay = styled.div`
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200;
  display: flex; align-items: flex-start; justify-content: flex-end;
`;
const DetailPanel = styled.div`
  width: 480px; height: 100vh; overflow-y: auto;
  background: white; box-shadow: -4px 0 24px rgba(0,0,0,0.12);
  display: flex; flex-direction: column;
`;
const DetailHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-bottom: 1px solid ${t.colorBorder}; flex-shrink: 0;
`;
const DetailBody = styled.div`padding: 20px; display: flex; flex-direction: column; gap: 16px; flex: 1;`;

const InfoRow = styled.div`
  display: flex; gap: 8px; align-items: baseline;
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeMd};
`;
const InfoLabel = styled.span`color: ${t.colorTextSubtle}; min-width: 110px; flex-shrink: 0; font-size: ${t.fontSizeSm};`;
const InfoValue = styled.span`color: ${t.colorText}; font-weight: 500;`;

const SectionTitle = styled.div`
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeSm}; font-weight: 700;
  color: ${t.colorTextSubtle}; text-transform: uppercase; letter-spacing: 0.05em;
  margin-bottom: 8px;
`;

// ─── Component ───────────────────────────────────────────────────────────────

export function VisitsClient({ doctors }: {
  doctors: { id: string; fullName: string }[];
}) {
  const [visits, setVisits]       = useState<VisitRecord[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter]     = useState("");
  const [searchInput, setSearchInput]   = useState("");
  const [search, setSearch]             = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Create modal
  const [open, setOpen]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [doctorId, setDoctorId]               = useState("");
  const [visitStatus, setVisitStatus]         = useState("WAITING");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerOptions, setCustomerOptions] = useState<{ value: string; label: string }[]>([]);

  // Detail panel
  const [detail, setDetail] = useState<VisitRecord | null>(null);

  const { register, handleSubmit, reset } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(val); setPage(1); }, 350);
  };

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search)       params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (dateFilter)   params.set("date",   dateFilter);
      const res  = await fetch(`/api/visits?${params}`);
      const json = await res.json();
      setVisits(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally { setLoading(false); }
  }, [page, search, statusFilter, dateFilter]);

  useEffect(() => { fetchVisits(); }, [fetchVisits]);
  useEffect(() => { setPage(1); }, [statusFilter, dateFilter]);

  const handleCustomerSearch = async (q: string) => {
    if (!q.trim()) { setCustomerOptions([]); return; }
    const res  = await fetch(`/api/customers?search=${encodeURIComponent(q)}&page=1`);
    const json = await res.json();
    setCustomerOptions(
      (json.data ?? []).map((c: { id: string; code: string; fullName: string }) => ({
        value: c.id, label: `${c.fullName} (${c.code})`,
      }))
    );
  };

  const onClose = () => {
    setOpen(false); reset();
    setDoctorId(""); setVisitStatus("WAITING"); setSelectedCustomerId("");
  };

  const parseNum = (v: string | undefined) => {
    if (!v || v.trim() === "") return null;
    const n = parseFloat(v);
    return isNaN(n) ? null : n;
  };

  const onSubmit = async (data: CreateForm) => {
    if (!selectedCustomerId) return toast.error("Vui lòng chọn khách hàng");
    if (!doctorId)           return toast.error("Vui lòng chọn bác sĩ phụ trách");
    setSaving(true);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          doctorId,
          visitDate:  data.visitDate || undefined,
          status:     visitStatus,
          pulse:      parseNum(data.pulse) ? Math.round(parseNum(data.pulse)!) : null,
          systolicBP: parseNum(data.systolicBP) ? Math.round(parseNum(data.systolicBP)!) : null,
          diastolicBP: parseNum(data.diastolicBP) ? Math.round(parseNum(data.diastolicBP)!) : null,
          spO2:        parseNum(data.spO2),
          temperature: parseNum(data.temperature),
          weight:      parseNum(data.weight),
          chiefComplaint: data.chiefComplaint || undefined,
          diagnosis:      data.diagnosis      || undefined,
          prescription:   data.prescription   || undefined,
          note:           data.note           || undefined,
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success("Tạo phiếu khám thành công");
      onClose();
      fetchVisits();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setSaving(false); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/visits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Cập nhật thất bại");
      toast.success("Đã cập nhật trạng thái");
      fetchVisits();
      if (detail?.id === id) setDetail(prev => prev ? { ...prev, status } : null);
    } catch {
      toast.error("Cập nhật thất bại");
    }
  };

  const pageSize   = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function fmtDate(d: string | null) {
    if (!d) return "–";
    try { return format(new Date(d), "dd/MM/yyyy HH:mm", { locale: vi }); } catch { return "–"; }
  }
  return (
    <>
      <SectionHeader>
        <FilterBar>
          <SearchWrap>
            <Search />
            <SearchInput
              placeholder="Tìm tên KH, mã KH, SĐT..."
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
            />
          </SearchWrap>
          <Select options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} placeholder="Trạng thái" />
          <input
            type="date"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            style={{
              height: 32, padding: "0 8px", border: `2px solid ${t.colorBorderInput}`,
              borderRadius: t.radiusMd, fontFamily: t.fontFamily, fontSize: t.fontSizeMd,
              color: t.colorText, background: "white", outline: "none",
            }}
          />
        </FilterBar>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: t.fontSizeSm, color: t.colorTextSubtle, whiteSpace: "nowrap" }}>{total} phiếu</span>
          <Button appearance="primary" onClick={() => setOpen(true)}>
            <Plus /> Tạo phiếu khám
          </Button>
        </div>
      </SectionHeader>

      <TableContainer>
        <Table>
          <TableHeader>
            <tr>
              <Th>Khách hàng</Th>
              <Th>Bác sĩ</Th>
              <Th width={150}>Ngày khám</Th>
              <Th>Lý do khám</Th>
              <Th>Chẩn đoán</Th>
              <Th width={90}>Sinh hiệu</Th>
              <Th width={120}>Trạng thái</Th>
            </tr>
          </TableHeader>
          <TableBody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: t.colorTextSubtle, fontFamily: t.fontFamily }}>Đang tải...</td></tr>
            ) : visits.length === 0 ? (
              <TableEmpty colSpan={7} icon={<ClipboardPlus />} message="Chưa có phiếu khám nào" />
            ) : visits.map(v => (
              <Tr key={v.id} clickable onClick={() => setDetail(v)}>
                <Td>
                  <div>
                    <div style={{ fontWeight: 600, fontFamily: t.fontFamily, color: t.colorText }}>{v.customer.fullName}</div>
                    <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeXs, color: t.colorTextSubtlest }}>{v.customer.code} · {v.customer.phone}</div>
                  </div>
                </Td>
                <Td muted>{v.doctor.fullName}</Td>
                <Td muted>{fmtDate(v.visitDate)}</Td>
                <Td muted>{v.chiefComplaint ?? "–"}</Td>
                <Td muted>{v.diagnosis ?? "–"}</Td>
                <Td center>
                  <div style={{ display: "flex", gap: 3, justifyContent: "center", flexWrap: "wrap" }}>
                    {v.pulse      && <VitalChip>❤ {v.pulse}</VitalChip>}
                    {v.systolicBP && <VitalChip>⛑ {v.systolicBP}/{v.diastolicBP}</VitalChip>}
                    {v.temperature && <VitalChip>🌡 {v.temperature}°</VitalChip>}
                  </div>
                </Td>
                <Td>
                  <Badge appearance={STATUS_APPEARANCE[v.status] ?? "neutral"} styleVariant="subtle">
                    {STATUS_LABELS[v.status] ?? v.status}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <Pagination>
            <span>Trang {page}/{totalPages} · {total} bản ghi</span>
            <Button appearance="subtle" onClick={() => setPage(p => Math.max(1, p - 1))} isDisabled={page <= 1}>
              <ChevronLeft size={14} />
            </Button>
            <Button appearance="subtle" onClick={() => setPage(p => Math.min(totalPages, p + 1))} isDisabled={page >= totalPages}>
              <ChevronRight size={14} />
            </Button>
          </Pagination>
        )}
      </TableContainer>

      {/* ─── Create modal ─────────────────────────────────────────── */}
      <Modal open={open} onOpenChange={onClose} title="Tạo phiếu khám bệnh" size="default">
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Khách hàng" required>
                <Autocomplete
                  options={customerOptions}
                  value={selectedCustomerId}
                  onChange={setSelectedCustomerId}
                  onSearch={handleCustomerSearch}
                  placeholder="Nhập tên hoặc mã khách hàng..."
                  clearable
                />
              </Field>
              <FormGrid>
                <Field label="Bác sĩ phụ trách" required>
                  <Select
                    options={doctors.map(d => ({ value: d.id, label: d.fullName }))}
                    value={doctorId}
                    onChange={setDoctorId}
                    placeholder="Chọn bác sĩ"
                  />
                </Field>
                <Field label="Trạng thái">
                  <Select
                    options={STATUS_CREATE_OPTIONS}
                    value={visitStatus}
                    onChange={setVisitStatus}
                    placeholder="Trạng thái"
                  />
                </Field>
              </FormGrid>
              <Field label="Ngày & giờ khám">
                <TextField type="datetime-local" {...register("visitDate")} />
              </Field>

              <div style={{ borderTop: `1px solid ${t.colorBorder}`, paddingTop: 14 }}>
                <SectionTitle style={{ fontSize: t.fontSizeSm, fontWeight: 700, color: t.colorTextSubtle, fontFamily: t.fontFamily, marginBottom: 10 }}>
                  Sinh hiệu
                </SectionTitle>
                <FormGrid3>
                  <Field label="Mạch (lần/phút)">
                    <TextField type="number" placeholder="72" {...register("pulse")} />
                  </Field>
                  <Field label="Huyết áp tâm thu">
                    <TextField type="number" placeholder="120" {...register("systolicBP")} />
                  </Field>
                  <Field label="Huyết áp tâm trương">
                    <TextField type="number" placeholder="80" {...register("diastolicBP")} />
                  </Field>
                  <Field label="SpO2 (%)">
                    <TextField type="number" step="0.1" placeholder="98.5" {...register("spO2")} />
                  </Field>
                  <Field label="Nhiệt độ (°C)">
                    <TextField type="number" step="0.1" placeholder="36.8" {...register("temperature")} />
                  </Field>
                  <Field label="Cân nặng (kg)">
                    <TextField type="number" step="0.1" placeholder="60.0" {...register("weight")} />
                  </Field>
                </FormGrid3>
              </div>

              <div style={{ borderTop: `1px solid ${t.colorBorder}`, paddingTop: 14 }}>
                <Field label="Lý do khám / triệu chứng chính">
                  <TextField placeholder="Mô tả triệu chứng..." {...register("chiefComplaint")} />
                </Field>
              </div>
              <Field label="Chẩn đoán">
                <TextField placeholder="Chẩn đoán..." {...register("diagnosis")} />
              </Field>
              <Field label="Đơn thuốc / Hướng điều trị">
                <Textarea placeholder="Ghi đơn thuốc hoặc hướng dẫn điều trị..." rows={3} {...register("prescription")} />
              </Field>
              <Field label="Ghi chú thêm">
                <Textarea placeholder="Ghi chú..." rows={2} {...register("note")} />
              </Field>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" type="button" onClick={onClose}>Hủy</Button>
            <Button appearance="primary" type="submit" isDisabled={saving}>
              {saving ? "Đang tạo..." : "Tạo phiếu khám"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ─── Detail slide-over panel ─────────────────────────────── */}
      {detail && (
        <DetailOverlay onClick={() => setDetail(null)}>
          <DetailPanel onClick={e => e.stopPropagation()}>
            <DetailHeader>
              <div>
                <div style={{ fontFamily: t.fontFamily, fontWeight: 700, fontSize: t.fontSizeLg, color: t.colorText }}>
                  Phiếu khám bệnh
                </div>
                <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeSm, color: t.colorTextSubtle, marginTop: 2 }}>
                  {fmtDate(detail.visitDate)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <Badge appearance={STATUS_APPEARANCE[detail.status] ?? "neutral"} styleVariant="subtle">
                  {STATUS_LABELS[detail.status] ?? detail.status}
                </Badge>
                <Button appearance="subtle" onClick={() => setDetail(null)}>
                  <X size={16} />
                </Button>
              </div>
            </DetailHeader>

            <DetailBody>
              {/* Patient */}
              <Card>
                <CardHeader><CardTitle>Thông tin bệnh nhân</CardTitle></CardHeader>
                <CardContent>
                  <InfoRow><InfoLabel>Họ tên</InfoLabel><InfoValue>{detail.customer.fullName}</InfoValue></InfoRow>
                  <InfoRow><InfoLabel>Mã KH</InfoLabel><InfoValue>{detail.customer.code}</InfoValue></InfoRow>
                  <InfoRow><InfoLabel>Điện thoại</InfoLabel><InfoValue>{detail.customer.phone}</InfoValue></InfoRow>
                  <InfoRow><InfoLabel>Bác sĩ</InfoLabel><InfoValue>{detail.doctor.fullName}</InfoValue></InfoRow>
                  {detail.episode && (
                    <InfoRow><InfoLabel>Hồ sơ bệnh án</InfoLabel><InfoValue>{detail.episode.serviceType}</InfoValue></InfoRow>
                  )}
                </CardContent>
              </Card>

              {/* Vital signs */}
              {(detail.pulse || detail.systolicBP || detail.spO2 || detail.temperature || detail.weight) && (
                <Card>
                  <CardHeader><CardTitle><Activity size={14} style={{ display: "inline", marginRight: 4 }} />Sinh hiệu</CardTitle></CardHeader>
                  <CardContent>
                    {detail.pulse      && <InfoRow><InfoLabel>Mạch</InfoLabel><InfoValue>{detail.pulse} lần/phút</InfoValue></InfoRow>}
                    {detail.systolicBP && <InfoRow><InfoLabel>Huyết áp</InfoLabel><InfoValue>{detail.systolicBP}/{detail.diastolicBP} mmHg</InfoValue></InfoRow>}
                    {detail.spO2       && <InfoRow><InfoLabel>SpO2</InfoLabel><InfoValue>{detail.spO2}%</InfoValue></InfoRow>}
                    {detail.temperature && <InfoRow><InfoLabel>Nhiệt độ</InfoLabel><InfoValue>{detail.temperature}°C</InfoValue></InfoRow>}
                    {detail.weight     && <InfoRow><InfoLabel>Cân nặng</InfoLabel><InfoValue>{detail.weight} kg</InfoValue></InfoRow>}
                  </CardContent>
                </Card>
              )}

              {/* Medical info */}
              <Card>
                <CardHeader><CardTitle>Thông tin khám</CardTitle></CardHeader>
                <CardContent>
                  <InfoRow style={{ alignItems: "flex-start" }}>
                    <InfoLabel>Lý do khám</InfoLabel>
                    <InfoValue>{detail.chiefComplaint ?? "–"}</InfoValue>
                  </InfoRow>
                  <InfoRow style={{ alignItems: "flex-start" }}>
                    <InfoLabel>Chẩn đoán</InfoLabel>
                    <InfoValue>{detail.diagnosis ?? "–"}</InfoValue>
                  </InfoRow>
                  {detail.prescription && (
                    <InfoRow style={{ alignItems: "flex-start" }}>
                      <InfoLabel>Đơn thuốc</InfoLabel>
                      <InfoValue style={{ whiteSpace: "pre-wrap" }}>{detail.prescription}</InfoValue>
                    </InfoRow>
                  )}
                  {detail.note && (
                    <InfoRow style={{ alignItems: "flex-start" }}>
                      <InfoLabel>Ghi chú</InfoLabel>
                      <InfoValue style={{ whiteSpace: "pre-wrap" }}>{detail.note}</InfoValue>
                    </InfoRow>
                  )}
                </CardContent>
              </Card>

              {/* Status actions */}
              <Card>
                <CardHeader><CardTitle>Cập nhật trạng thái</CardTitle></CardHeader>
                <CardContent>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {STATUS_CREATE_OPTIONS.filter(s => s.value !== detail.status).map(s => (
                      <Button
                        key={s.value}
                        appearance="subtle"
                        onClick={() => handleStatusUpdate(detail.id, s.value)}
                      >
                        {s.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeXs, color: t.colorTextSubtlest }}>
                Tạo bởi {detail.createdBy.fullName} · {fmtDate(detail.createdAt)}
              </div>
            </DetailBody>
          </DetailPanel>
        </DetailOverlay>
      )}
    </>
  );
}
