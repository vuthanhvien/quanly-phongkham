"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import styled from "styled-components";
import { tokens as t } from "@/components/ui/tokens";
import { Button } from "@/components/ui/button";
import { Field, TextField } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, Lozenge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, Th, Tr, Td, TableEmpty, TableContainer } from "@/components/ui/table";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/dialog";
import { SectionHeader } from "@/components/ui/card";
import { Plus, Users, Search, Phone, AlertTriangle, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useRouter as useNav } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

type Customer = {
  id: string; code: string; fullName: string; phone: string;
  gender: string; status: string; tier: string;
  totalSpent: number; hasAllergy: boolean; hasChronicDisease: boolean;
  allergyNote: string | null; chronicDiseaseNote: string | null;
  lastVisitAt: string | null;
  branch?: { name: string };
  assignedSale?: { fullName: string } | null;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "CONSULTING",      label: "Tư vấn" },
  { value: "WAITING_SURGERY", label: "Chờ PT" },
  { value: "IN_TREATMENT",    label: "Điều trị" },
  { value: "COMPLETED",       label: "Hoàn thành" },
  { value: "INACTIVE",        label: "Ngưng" },
];

const TIER_OPTIONS = [
  { value: "", label: "Tất cả hạng" },
  { value: "BRONZE",  label: "Đồng" },
  { value: "SILVER",  label: "Bạc" },
  { value: "GOLD",    label: "Vàng" },
  { value: "DIAMOND", label: "Kim cương" },
];

const STATUS_LABELS: Record<string, string> = Object.fromEntries(STATUS_OPTIONS.slice(1).map(o => [o.value, o.label]));
const TIER_LABELS:   Record<string, string> = Object.fromEntries(TIER_OPTIONS.slice(1).map(o => [o.value, o.label]));

const STATUS_APPEARANCE: Record<string, "primary" | "warning" | "success" | "neutral" | "danger"> = {
  CONSULTING: "primary", WAITING_SURGERY: "warning",
  IN_TREATMENT: "success", COMPLETED: "neutral", INACTIVE: "danger",
};
const TIER_APPEARANCE: Record<string, "default" | "neutral" | "warning" | "discovery"> = {
  BRONZE: "default", SILVER: "neutral", GOLD: "warning", DIAMOND: "discovery",
};
const GENDER_LABELS: Record<string, string> = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" };

const SOURCE_OPTIONS = [
  { value: "WALK_IN",  label: "Tự đến" },  { value: "REFERRAL", label: "Giới thiệu" },
  { value: "FACEBOOK", label: "Facebook" }, { value: "ZALO",     label: "Zalo" },
  { value: "TIKTOK",   label: "TikTok" },  { value: "GOOGLE",   label: "Google" },
  { value: "OTHER",    label: "Khác" },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const createSchema = z.object({
  fullName:           z.string().min(1, "Họ tên không được để trống"),
  phone:              z.string().min(9, "Số điện thoại không hợp lệ"),
  email:              z.string().optional(),
  dateOfBirth:        z.string().optional(),
  address:            z.string().optional(),
  hasAllergy:         z.boolean().optional(),
  allergyNote:        z.string().optional(),
  hasChronicDisease:  z.boolean().optional(),
  chronicDiseaseNote: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

// ─── Styled ───────────────────────────────────────────────────────────────────

const FilterBar = styled.div`
  display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
`;

const SearchWrap = styled.div`
  position: relative; flex: 1; min-width: 200px; max-width: 300px;
  svg { position: absolute; left: 9px; top: 50%; transform: translateY(-50%);
        color: ${t.colorTextSubtlest}; width: 14px; height: 14px; pointer-events: none; }
`;

const SearchInput = styled.input`
  width: 100%; height: 32px; padding: 0 10px 0 30px;
  border: 2px solid ${t.colorBorderInput}; border-radius: ${t.radiusMd};
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeMd};
  color: ${t.colorText}; background: white; outline: none;
  box-sizing: border-box;
  &::placeholder { color: ${t.colorTextSubtlest}; }
  &:focus { border-color: ${t.colorBorderFocused}; box-shadow: 0 0 0 2px ${t.colorBrandSubtlest}; }
`;

const FormGrid = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 14px;`;

const AlertBanner = styled.div<{ variant: "danger" | "warning" }>`
  display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px;
  border-radius: ${t.radiusMd};
  background: ${p => p.variant === "danger" ? t.colorDangerSubtlest : t.colorWarningSubtlest};
  border: 1px solid ${p => p.variant === "danger" ? t.colorBorderDanger : t.colorBorderWarning};
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeSm};
  color: ${p => p.variant === "danger" ? t.colorTextDanger : t.colorTextWarning};
  svg { flex-shrink: 0; margin-top: 1px; width: 14px; height: 14px; }
`;

const PhoneCell = styled.button`
  all: unset; cursor: pointer; font-family: ${t.fontFamily}; font-size: ${t.fontSizeMd};
  color: ${t.colorTextBrand}; text-decoration: underline dashed;
  display: inline-flex; align-items: center; gap: 3px;
  &:hover { color: ${t.colorBrandBoldHovered}; }
`;

const Pagination = styled.div`
  display: flex; align-items: center; justify-content: flex-end; gap: 8px;
  padding: 10px 16px; border-top: 1px solid ${t.colorBorder};
  font-family: ${t.fontFamily}; font-size: ${t.fontSizeSm}; color: ${t.colorTextSubtle};
`;

const Divider = styled.div`border-top: 1px solid ${t.colorBorder}; margin: 6px 0 12px;`;
const SectionLabel = styled.p`margin: 0 0 10px; font-family: ${t.fontFamily}; font-size: ${t.fontSizeSm}; font-weight: 600; color: ${t.colorText};`;

// ─── Component ───────────────────────────────────────────────────────────────

export function CustomersClient({ sales, isSuperAdmin, branches = [] }: {
  sales: { id: string; fullName: string }[];
  isSuperAdmin: boolean;
  currentBranchId: string | null;
  branches?: { id: string; name: string }[];
}) {
  const nav = useNav();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters with debounce for search
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter]     = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Create modal
  const [open, setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [genderValue, setGenderValue] = useState("OTHER");
  const [sourceValue, setSourceValue] = useState("");
  const [assignedSaleId, setAssignedSaleId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id ?? "");

  // Revealed phones cache
  const [revealedPhones, setRevealedPhones] = useState<Record<string, string>>({});

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { hasAllergy: false, hasChronicDisease: false },
  });
  const hasAllergy        = watch("hasAllergy");
  const hasChronicDisease = watch("hasChronicDisease");

  // Debounce search input
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(val); setPage(1); }, 350);
  };

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search)       params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (tierFilter)   params.set("tier",   tierFilter);
      const res  = await fetch(`/api/customers?${params}`);
      const json = await res.json();
      setCustomers(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, tierFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [statusFilter, tierFilter]);

  const onClose = () => {
    setOpen(false); reset();
    setGenderValue("OTHER"); setSourceValue(""); setAssignedSaleId("");
    setSelectedBranchId(branches[0]?.id ?? "");
  };

  const onSubmit = async (data: CreateForm) => {
    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          gender: genderValue,
          source: sourceValue || undefined,
          assignedSaleId: assignedSaleId || undefined,
          ...(isSuperAdmin ? { branchId: selectedBranchId } : {}),
        }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success("Thêm khách hàng thành công");
      onClose(); fetchCustomers();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const revealPhone = async (e: React.MouseEvent, customerId: string) => {
    e.stopPropagation();
    if (revealedPhones[customerId]) return;
    try {
      const res = await fetch(`/api/customers/${customerId}/phone`);
      if (!res.ok) throw new Error();
      const { phone } = await res.json();
      setRevealedPhones(prev => ({ ...prev, [customerId]: phone }));
    } catch {
      toast.error("Không thể hiển thị số điện thoại");
    }
  };

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "9999" });
      if (search)       params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (tierFilter)   params.set("tier",   tierFilter);
      const res  = await fetch(`/api/customers?${params}`);
      const json = await res.json();
      const rows: Customer[] = json.data ?? [];

      const header = ["Mã KH", "Họ tên", "Giới tính", "Trạng thái", "Hạng", "Tổng chi tiêu", "Tư vấn viên"];
      const lines  = rows.map(c => [
        c.code, c.fullName, GENDER_LABELS[c.gender] ?? c.gender,
        STATUS_LABELS[c.status] ?? c.status, TIER_LABELS[c.tier] ?? c.tier,
        c.totalSpent, c.assignedSale?.fullName ?? "",
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));

      const csv  = [header.join(","), ...lines].join("\n");
      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = `khach-hang-${Date.now()}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Không thể xuất file");
    }
  };

  const pageSize  = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const salesOptions = [{ value: "", label: "Chưa phân công" }, ...sales.map(s => ({ value: s.id, label: s.fullName }))];

  return (
    <>
      <SectionHeader>
        <FilterBar>
          <SearchWrap>
            <Search />
            <SearchInput
              placeholder="Tìm tên, mã, email..."
              value={searchInput}
              onChange={e => handleSearchChange(e.target.value)}
            />
          </SearchWrap>
          <Select options={STATUS_OPTIONS} value={statusFilter} onChange={v => { setStatusFilter(v); }} placeholder="Trạng thái" />
          <Select options={TIER_OPTIONS}   value={tierFilter}   onChange={v => { setTierFilter(v); }}   placeholder="Hạng KH" />
        </FilterBar>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: t.fontSizeSm, color: t.colorTextSubtle, whiteSpace: "nowrap" }}>{total} khách hàng</span>
          <Button appearance="subtle" onClick={exportCsv} title="Xuất CSV">
            <Download size={14} />
          </Button>
          <Button appearance="primary" onClick={() => setOpen(true)}>
            <Plus /> Thêm khách hàng
          </Button>
        </div>
      </SectionHeader>

      <TableContainer>
        <Table>
          <TableHeader>
            <tr>
              <Th width={88}>Mã KH</Th>
              <Th>Họ tên</Th>
              <Th width={136}>Điện thoại</Th>
              <Th width={56}>Giới tính</Th>
              <Th width={120}>Trạng thái</Th>
              <Th width={96}>Hạng</Th>
              <Th width={130}>Tổng chi tiêu</Th>
              <Th>Tư vấn viên</Th>
            </tr>
          </TableHeader>
          <TableBody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ padding: "32px", textAlign: "center", color: t.colorTextSubtle, fontFamily: t.fontFamily }}>
                  Đang tải...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <TableEmpty colSpan={8} icon={<Users />} message={search ? "Không tìm thấy khách hàng" : "Chưa có khách hàng nào"} />
            ) : customers.map(c => (
              <Tr
                key={c.id}
                clickable
                onClick={() => nav.push(`/customers/${c.id}`)}
                style={{ cursor: "pointer" }}
              >
                <Td muted style={{ fontFamily: "monospace", fontSize: 12 }}>{c.code}</Td>
                <Td>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ fontWeight: 600, fontFamily: t.fontFamily, color: t.colorText }}>{c.fullName}</span>
                    {c.hasAllergy && (
                      <span title={c.allergyNote ?? "Có dị ứng"} style={{ color: t.colorDanger, display: "flex", cursor: "default" }}>
                        <AlertTriangle size={11} />
                      </span>
                    )}
                    {c.hasChronicDisease && (
                      <span title={c.chronicDiseaseNote ?? "Bệnh mãn tính"} style={{ color: t.colorWarningBold, display: "flex", cursor: "default" }}>
                        <AlertTriangle size={11} />
                      </span>
                    )}
                  </div>
                </Td>
                <Td>
                  {revealedPhones[c.id]
                    ? <span style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeMd }}>{revealedPhones[c.id]}</span>
                    : (
                      <PhoneCell onClick={e => revealPhone(e, c.id)} title="Nhấn để xem số">
                        <Phone size={11} />{c.phone}
                      </PhoneCell>
                    )
                  }
                </Td>
                <Td muted>{GENDER_LABELS[c.gender] ?? "–"}</Td>
                <Td>
                  <Badge appearance={STATUS_APPEARANCE[c.status] ?? "default"} styleVariant="subtle">
                    {STATUS_LABELS[c.status] ?? c.status}
                  </Badge>
                </Td>
                <Td>
                  <Lozenge appearance={TIER_APPEARANCE[c.tier] ?? "default"} styleVariant="subtle">
                    {TIER_LABELS[c.tier] ?? c.tier}
                  </Lozenge>
                </Td>
                <Td muted>{c.totalSpent > 0 ? `${c.totalSpent.toLocaleString("vi-VN")} ₫` : "–"}</Td>
                <Td muted>{c.assignedSale?.fullName ?? "–"}</Td>
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

      {/* ─── Create modal ─────────────────────────────────────────────── */}
      <Modal open={open} onOpenChange={onClose} title="Thêm khách hàng mới" size="default">
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
              <FormGrid>
                <Field label="Họ và tên" required error={errors.fullName?.message}>
                  <TextField placeholder="Nguyễn Thị A" isInvalid={!!errors.fullName} {...register("fullName")} />
                </Field>
                <Field label="Số điện thoại" required error={errors.phone?.message}>
                  <TextField placeholder="0901234567" isInvalid={!!errors.phone} {...register("phone")} />
                </Field>
              </FormGrid>
              <FormGrid>
                <Field label="Email">
                  <TextField type="email" placeholder="khachhang@email.com" {...register("email")} />
                </Field>
                <Field label="Ngày sinh">
                  <TextField type="date" {...register("dateOfBirth")} />
                </Field>
              </FormGrid>
              <FormGrid>
                <Field label="Giới tính">
                  <Select
                    options={[{ value: "MALE", label: "Nam" }, { value: "FEMALE", label: "Nữ" }, { value: "OTHER", label: "Khác" }]}
                    value={genderValue} onChange={setGenderValue} placeholder="Chọn"
                  />
                </Field>
                <Field label="Nguồn biết đến">
                  <Select
                    options={[{ value: "", label: "–" }, ...SOURCE_OPTIONS]}
                    value={sourceValue} onChange={setSourceValue} placeholder="Chọn nguồn"
                  />
                </Field>
              </FormGrid>
              <Field label="Địa chỉ">
                <TextField placeholder="123 Nguyễn Trãi, Q.1..." {...register("address")} />
              </Field>
              {sales.length > 0 && (
                <Field label="Tư vấn viên phụ trách">
                  <Select options={salesOptions} value={assignedSaleId} onChange={setAssignedSaleId} placeholder="Chọn" />
                </Field>
              )}

              <Divider />
              <SectionLabel>Thông tin y tế</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: t.fontFamily, fontSize: t.fontSizeMd }}>
                  <input type="checkbox" {...register("hasAllergy")} style={{ width: 15, height: 15, accentColor: t.colorDanger }} />
                  Có dị ứng
                </label>
                {hasAllergy && (
                  <AlertBanner variant="danger">
                    <AlertTriangle />
                    <Field label="Ghi chú dị ứng" style={{ flex: 1, margin: 0 }}>
                      <TextField placeholder="Dị ứng với..." {...register("allergyNote")} />
                    </Field>
                  </AlertBanner>
                )}
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontFamily: t.fontFamily, fontSize: t.fontSizeMd }}>
                  <input type="checkbox" {...register("hasChronicDisease")} style={{ width: 15, height: 15, accentColor: t.colorWarningBold }} />
                  Có bệnh mãn tính
                </label>
                {hasChronicDisease && (
                  <AlertBanner variant="warning">
                    <AlertTriangle />
                    <Field label="Ghi chú bệnh mãn tính" style={{ flex: 1, margin: 0 }}>
                      <TextField placeholder="Tiểu đường, huyết áp..." {...register("chronicDiseaseNote")} />
                    </Field>
                  </AlertBanner>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button appearance="subtle" type="button" onClick={onClose}>Hủy</Button>
            <Button appearance="primary" type="submit" isDisabled={saving}>
              {saving ? "Đang lưu..." : "Thêm khách hàng"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
