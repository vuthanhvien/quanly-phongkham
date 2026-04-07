"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Stethoscope, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Autocomplete } from "@/components/ui/autocomplete";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

type Episode = {
  id: string; serviceType: string; serviceCode: string | null;
  status: string; chiefComplaint: string | null; diagnosis: string | null;
  operationDate: string | null; createdAt: string;
  customer: { id: string; code: string; fullName: string };
  doctor:   { id: string; fullName: string };
  branch?:  { name: string };
  _count:   { vitalSigns: number; postOpNotes: number; documents: number };
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "",          label: "Tất cả trạng thái" },
  { value: "ACTIVE",    label: "Đang điều trị" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang điều trị", COMPLETED: "Hoàn thành", CANCELLED: "Đã hủy",
};
const STATUS_APPEARANCE: Record<string, "success" | "neutral" | "danger"> = {
  ACTIVE: "success", COMPLETED: "neutral", CANCELLED: "danger",
};

const SERVICE_TYPES = [
  "Phẫu thuật thẩm mỹ mặt",
  "Phẫu thuật nâng ngực",
  "Phẫu thuật hút mỡ",
  "Phẫu thuật mũi",
  "Phẫu thuật mắt",
  "Tiêm filler",
  "Tiêm botox",
  "Laser / Điều trị da",
  "Điều trị mụn",
  "Điều trị sẹo",
  "Khác",
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  serviceType:    z.string().min(1, "Vui lòng chọn loại dịch vụ"),
  serviceCode:    z.string().optional(),
  chiefComplaint: z.string().optional(),
  diagnosis:      z.string().optional(),
  operationDate:  z.string().optional(),
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

const Pagination = styled.div`
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid ${t.colorBorder};
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeSm}; color: ${t.colorTextSubtle};
`;

const CountBubble = styled.span`
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px; border-radius: ${t.radiusFull};
  background: ${t.colorBgNeutralHovered}; font-size: 11px; font-weight: 700;
  color: ${t.colorTextSubtle}; font-family: ${t.fontFamily};
`;

// ─── Component ───────────────────────────────────────────────────────────────

export function EpisodesClient({ doctors }: {
  doctors: { id: string; fullName: string }[];
  isSuperAdmin: boolean;
}) {
  const router = useRouter();

  const [episodes, setEpisodes]   = useState<Episode[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput]   = useState("");
  const [search, setSearch]             = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Create modal
  const [open, setOpen]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const [doctorId, setDoctorId]     = useState("");
  const [serviceType, setServiceType] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerOptions, setCustomerOptions] = useState<{ value: string; label: string }[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(val); setPage(1); }, 350);
  };

  const fetchEpisodes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search)       params.set("search",   search);
      if (statusFilter) params.set("status",   statusFilter);
      const res  = await fetch(`/api/episodes?${params}`);
      const json = await res.json();
      setEpisodes(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally { setLoading(false); }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchEpisodes(); }, [fetchEpisodes]);
  useEffect(() => { setPage(1); }, [statusFilter]);

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
    setDoctorId(""); setServiceType(""); setSelectedCustomerId("");
  };

  const onSubmit = async (data: CreateForm) => {
    if (!selectedCustomerId) return toast.error("Vui lòng chọn khách hàng");
    if (!doctorId)          return toast.error("Vui lòng chọn bác sĩ phụ trách");
    setSaving(true);
    try {
      const res = await fetch("/api/episodes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, serviceType, customerId: selectedCustomerId, doctorId }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      const ep = await res.json();
      toast.success("Tạo hồ sơ bệnh án thành công");
      onClose();
      router.push(`/episodes/${ep.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setSaving(false); }
  };

  const pageSize   = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const doctorOptions = [{ value: "", label: "Tất cả bác sĩ" }, ...doctors.map(d => ({ value: d.id, label: d.fullName }))];
  const [doctorFilter, setDoctorFilter] = useState("");

  function fmtDate(d: string | null) {
    if (!d) return "–";
    try { return format(new Date(d), "dd/MM/yyyy", { locale: vi }); } catch { return "–"; }
  }

  return (
    <>
      <SectionHeader>
        <FilterBar>
          <SearchWrap>
            <Search />
            <SearchInput
              placeholder="Tìm tên KH, mã KH..."
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
            />
          </SearchWrap>
          <Select options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} placeholder="Trạng thái" />
          {doctors.length > 0 && (
            <Select options={doctorOptions} value={doctorFilter} onChange={setDoctorFilter} placeholder="Bác sĩ" />
          )}
        </FilterBar>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: t.fontSizeSm, color: t.colorTextSubtle, whiteSpace: "nowrap" }}>{total} hồ sơ</span>
          <Button appearance="primary" onClick={() => setOpen(true)}>
            <Plus /> Tạo hồ sơ
          </Button>
        </div>
      </SectionHeader>

      <TableContainer>
        <Table>
          <TableHeader>
            <tr>
              <Th>Khách hàng</Th>
              <Th>Dịch vụ</Th>
              <Th>Lý do khám</Th>
              <Th>Bác sĩ</Th>
              <Th width={110}>Ngày PT</Th>
              <Th width={120}>Trạng thái</Th>
              <Th width={90} style={{ textAlign: "center" }}>Dữ liệu</Th>
              <Th width={110}>Tạo lúc</Th>
            </tr>
          </TableHeader>
          <TableBody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 32, textAlign: "center", color: t.colorTextSubtle, fontFamily: t.fontFamily }}>Đang tải...</td></tr>
            ) : episodes.length === 0 ? (
              <TableEmpty colSpan={8} icon={<Stethoscope />} message="Chưa có hồ sơ bệnh án nào" />
            ) : episodes.map(ep => (
              <Tr key={ep.id} clickable onClick={() => router.push(`/episodes/${ep.id}`)}>
                <Td>
                  <div>
                    <div style={{ fontWeight: 600, fontFamily: t.fontFamily, color: t.colorText }}>{ep.customer.fullName}</div>
                    <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeXs, color: t.colorTextSubtlest }}>{ep.customer.code}</div>
                  </div>
                </Td>
                <Td>
                  <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeMd, color: t.colorText }}>{ep.serviceType}</div>
                  {ep.serviceCode && <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeXs, color: t.colorTextSubtlest }}>{ep.serviceCode}</div>}
                </Td>
                <Td muted>{ep.chiefComplaint ?? "–"}</Td>
                <Td muted>{ep.doctor.fullName}</Td>
                <Td muted>{fmtDate(ep.operationDate)}</Td>
                <Td>
                  <Badge appearance={STATUS_APPEARANCE[ep.status] ?? "default"} styleVariant="subtle">
                    {STATUS_LABELS[ep.status] ?? ep.status}
                  </Badge>
                </Td>
                <Td center>
                  <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                    {ep._count.vitalSigns  > 0 && <CountBubble title="Sinh hiệu">S{ep._count.vitalSigns}</CountBubble>}
                    {ep._count.postOpNotes > 0 && <CountBubble title="Ghi chú HP">HP{ep._count.postOpNotes}</CountBubble>}
                    {ep._count.documents   > 0 && <CountBubble title="Tài liệu">TL{ep._count.documents}</CountBubble>}
                  </div>
                </Td>
                <Td muted>{fmtDate(ep.createdAt)}</Td>
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
      <Modal open={open} onOpenChange={onClose} title="Tạo hồ sơ bệnh án mới" size="default">
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
                <Field label="Loại dịch vụ" required error={errors.serviceType?.message}>
                  <Select
                    options={SERVICE_TYPES.map(s => ({ value: s, label: s }))}
                    value={serviceType}
                    onChange={v => { setServiceType(v); }}
                    placeholder="Chọn dịch vụ"
                    isInvalid={!!errors.serviceType}
                  />
                </Field>
                <Field label="Mã dịch vụ" hint="VD: PT-NOSE-001">
                  <TextField placeholder="Tùy chọn" {...register("serviceCode")} />
                </Field>
              </FormGrid>
              <FormGrid>
                <Field label="Bác sĩ phụ trách" required>
                  <Select
                    options={doctors.map(d => ({ value: d.id, label: d.fullName }))}
                    value={doctorId}
                    onChange={setDoctorId}
                    placeholder="Chọn bác sĩ"
                  />
                </Field>
                <Field label="Ngày phẫu thuật / thực hiện">
                  <TextField type="date" {...register("operationDate")} />
                </Field>
              </FormGrid>
              <Field label="Lý do khám / triệu chứng chính">
                <TextField placeholder="Mô tả ngắn..." {...register("chiefComplaint")} />
              </Field>
              <Field label="Chẩn đoán sơ bộ">
                <TextField placeholder="Chẩn đoán..." {...register("diagnosis")} />
              </Field>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" type="button" onClick={onClose}>Hủy</Button>
            <Button appearance="primary" type="submit" isDisabled={saving}>
              {saving ? "Đang tạo..." : "Tạo hồ sơ"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
