"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Badge, Lozenge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, Th, Tr, Td, TableEmpty, TableContainer } from "@/components/ui/table";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/dialog";
import { SectionHeader } from "@/components/ui/card";
import { Plus, Users, Search, Phone, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

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

const STATUS_LABELS: Record<string, string> = {
  CONSULTING:       "Tư vấn",
  WAITING_SURGERY:  "Chờ PT",
  IN_TREATMENT:     "Điều trị",
  COMPLETED:        "Hoàn thành",
  INACTIVE:         "Ngưng",
};

const STATUS_APPEARANCE: Record<string, "primary" | "warning" | "success" | "neutral" | "discovery" | "danger"> = {
  CONSULTING:       "primary",
  WAITING_SURGERY:  "warning",
  IN_TREATMENT:     "success",
  COMPLETED:        "neutral",
  INACTIVE:         "danger",
};

const TIER_LABELS: Record<string, string> = {
  BRONZE: "Đồng", SILVER: "Bạc", GOLD: "Vàng", DIAMOND: "Kim cương",
};

const TIER_APPEARANCE: Record<string, "default" | "neutral" | "warning" | "discovery"> = {
  BRONZE: "default", SILVER: "neutral", GOLD: "warning", DIAMOND: "discovery",
};

const GENDER_LABELS: Record<string, string> = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" };

const SOURCE_OPTIONS = [
  { value: "WALK_IN",    label: "Tự đến" },
  { value: "REFERRAL",   label: "Giới thiệu" },
  { value: "FACEBOOK",   label: "Facebook" },
  { value: "ZALO",       label: "Zalo" },
  { value: "TIKTOK",     label: "TikTok" },
  { value: "GOOGLE",     label: "Google" },
  { value: "OTHER",      label: "Khác" },
];

// ─── Styled ───────────────────────────────────────────────────────────────────

const FilterBar = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;
  max-width: 320px;
  svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: ${t.colorTextSubtlest}; width: 14px; height: 14px; pointer-events: none; }
  input { padding-left: 30px; }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const AlertBanner = styled.div<{ variant: "danger" | "warning" }>`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  border-radius: ${t.radiusMd};
  background: ${p => p.variant === "danger" ? t.colorDangerSubtlest : t.colorWarningSubtlest};
  border: 1px solid ${p => p.variant === "danger" ? t.colorBorderDanger : t.colorBorderWarning};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  color: ${p => p.variant === "danger" ? t.colorTextDanger : t.colorTextWarning};
  svg { flex-shrink: 0; margin-top: 1px; width: 14px; height: 14px; }
`;

const PhoneCell = styled.button`
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${t.colorTextBrand};
  text-decoration: underline;
  text-decoration-style: dashed;
  &:hover { color: ${t.colorBrandBoldHovered}; }
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid ${t.colorBorder};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  color: ${t.colorTextSubtle};
`;


// ─── Schema ───────────────────────────────────────────────────────────────────

const customerSchema = z.object({
  fullName:           z.string().min(1, "Họ tên không được để trống"),
  phone:              z.string().min(9, "Số điện thoại không hợp lệ"),
  email:              z.string().optional(),
  dateOfBirth:        z.string().optional(),
  gender:             z.string().optional(),
  address:            z.string().optional(),
  source:             z.string().optional(),
  hasAllergy:         z.boolean().optional(),
  allergyNote:        z.string().optional(),
  hasChronicDisease:  z.boolean().optional(),
  chronicDiseaseNote: z.string().optional(),
});
type CustomerForm = z.infer<typeof customerSchema>;

// ─── Component ───────────────────────────────────────────────────────────────

export function CustomersClient({ sales }: {
  sales: { id: string; fullName: string }[];
  isSuperAdmin: boolean;
  currentBranchId: string | null;
}) {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revealedPhones, setRevealedPhones] = useState<Record<string, string>>({});

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: { hasAllergy: false, hasChronicDisease: false, gender: "OTHER" },
  });

  const hasAllergy        = watch("hasAllergy");
  const hasChronicDisease = watch("hasChronicDisease");

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        ...(search       ? { search }       : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(tierFilter   ? { tier: tierFilter }     : {}),
      });
      const res = await fetch(`/api/customers?${params}`);
      const json = await res.json();
      setCustomers(json.data ?? []);
      setTotal(json.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, tierFilter]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // Debounce search
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, tierFilter]);

  const onClose = () => { setOpen(false); reset(); };

  const onSubmit = async (data: CustomerForm) => {
    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

  const revealPhone = async (customerId: string) => {
    if (revealedPhones[customerId]) return;
    try {
      const res = await fetch(`/api/customers/${customerId}/phone`);
      if (!res.ok) throw new Error("Không thể hiển thị số điện thoại");
      const { phone } = await res.json();
      setRevealedPhones(prev => ({ ...prev, [customerId]: phone }));
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const salesOptions = sales.map(s => ({ value: s.id, label: s.fullName }));
  const [assignedSaleId, setAssignedSaleId] = useState("");
  const [genderValue, setGenderValue] = useState("OTHER");
  const [sourceValue, setSourceValue] = useState("");

  return (
    <>
      <SectionHeader>
        <FilterBar>
          <SearchWrap>
            <Search />
            <input
              placeholder="Tìm kiếm tên, mã, email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%", height: 32, paddingLeft: 30, paddingRight: 10,
                border: `2px solid ${t.colorBorderInput}`, borderRadius: t.radiusMd,
                fontFamily: t.fontFamily, fontSize: t.fontSizeMd, outline: "none",
                color: t.colorText, background: "white",
              }}
            />
          </SearchWrap>
          <Select
            options={[
              { value: "", label: "Tất cả trạng thái" },
              ...Object.entries(STATUS_LABELS).map(([v, l]) => ({ value: v, label: l })),
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Trạng thái"
          />
          <Select
            options={[
              { value: "", label: "Tất cả hạng" },
              ...Object.entries(TIER_LABELS).map(([v, l]) => ({ value: v, label: l })),
            ]}
            value={tierFilter}
            onChange={setTierFilter}
            placeholder="Hạng KH"
          />
        </FilterBar>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: t.fontSizeSm, color: t.colorTextSubtle }}>{total} khách hàng</span>
          <Button appearance="primary" onClick={() => setOpen(true)}>
            <Plus /> Thêm khách hàng
          </Button>
        </div>
      </SectionHeader>

      <TableContainer>
        <Table>
          <TableHeader>
            <tr>
              <Th width={90}>Mã KH</Th>
              <Th>Họ tên</Th>
              <Th width={130}>Điện thoại</Th>
              <Th width={60}>Giới tính</Th>
              <Th width={120}>Trạng thái</Th>
              <Th width={100}>Hạng</Th>
              <Th width={120}>Tổng chi tiêu</Th>
              <Th>Tư vấn viên</Th>
            </tr>
          </TableHeader>
          <TableBody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: "32px", textAlign: "center", color: t.colorTextSubtle, fontFamily: t.fontFamily }}>Đang tải...</td></tr>
            ) : customers.length === 0 ? (
              <TableEmpty colSpan={8} icon={<Users />} message="Chưa có khách hàng nào" />
            ) : customers.map((c) => (
              <Tr key={c.id} clickable>
                <Td muted>
                  <Link href={`/customers/${c.id}`} style={{ color: t.colorTextBrand, textDecoration: "none", fontFamily: t.fontFamily, fontSize: t.fontSizeMd }}>
                    {c.code}
                  </Link>
                </Td>
                <Td>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 600, color: t.colorText, fontFamily: t.fontFamily }}>{c.fullName}</span>
                    {c.hasAllergy && (
                      <span title={c.allergyNote ?? "Dị ứng"} style={{ color: t.colorDanger, display: "flex" }}>
                        <AlertTriangle size={12} />
                      </span>
                    )}
                    {c.hasChronicDisease && (
                      <span title={c.chronicDiseaseNote ?? "Bệnh mãn tính"} style={{ color: t.colorWarningBold, display: "flex" }}>
                        <AlertTriangle size={12} />
                      </span>
                    )}
                  </div>
                </Td>
                <Td>
                  {revealedPhones[c.id] ? (
                    <span style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeMd }}>{revealedPhones[c.id]}</span>
                  ) : (
                    <PhoneCell onClick={() => revealPhone(c.id)} title="Nhấn để xem số điện thoại">
                      <Phone size={12} style={{ marginRight: 4, verticalAlign: "middle" }} />
                      {c.phone}
                    </PhoneCell>
                  )}
                </Td>
                <Td muted>{GENDER_LABELS[c.gender] ?? c.gender}</Td>
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
            <span>Trang {page}/{totalPages}</span>
            <Button appearance="subtle" onClick={() => setPage(p => Math.max(1, p - 1))} isDisabled={page <= 1}>
              <ChevronLeft size={14} />
            </Button>
            <Button appearance="subtle" onClick={() => setPage(p => Math.min(totalPages, p + 1))} isDisabled={page >= totalPages}>
              <ChevronRight size={14} />
            </Button>
          </Pagination>
        )}
      </TableContainer>

      <Modal open={open} onOpenChange={onClose} title="Thêm khách hàng mới" size="default">
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                    options={[
                      { value: "MALE", label: "Nam" },
                      { value: "FEMALE", label: "Nữ" },
                      { value: "OTHER", label: "Khác" },
                    ]}
                    value={genderValue}
                    onChange={(v) => { setGenderValue(v); setValue("gender", v); }}
                    placeholder="Chọn giới tính"
                  />
                </Field>
                <Field label="Nguồn biết đến">
                  <Select
                    options={SOURCE_OPTIONS}
                    value={sourceValue}
                    onChange={(v) => { setSourceValue(v); setValue("source", v); }}
                    placeholder="Chọn nguồn"
                  />
                </Field>
              </FormGrid>
              <Field label="Địa chỉ">
                <TextField placeholder="123 Nguyễn Trãi, Q.1, TP.HCM" {...register("address")} />
              </Field>
              {salesOptions.length > 0 && (
                <Field label="Tư vấn viên phụ trách">
                  <Select
                    options={[{ value: "", label: "Chưa phân công" }, ...salesOptions]}
                    value={assignedSaleId}
                    onChange={setAssignedSaleId}
                    placeholder="Chọn tư vấn viên"
                  />
                </Field>
              )}

              {/* Medical flags */}
              <div style={{ borderTop: `1px solid ${t.colorBorder}`, paddingTop: 16 }}>
                <div style={{ fontSize: t.fontSizeSm, fontWeight: 600, color: t.colorText, fontFamily: t.fontFamily, marginBottom: 12 }}>
                  Thông tin y tế
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" {...register("hasAllergy")} style={{ width: 16, height: 16, accentColor: t.colorDanger }} />
                    <span style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeMd, color: t.colorText }}>Có dị ứng</span>
                  </label>
                  {hasAllergy && (
                    <AlertBanner variant="danger">
                      <AlertTriangle />
                      <Field label="Ghi chú dị ứng" style={{ flex: 1, margin: 0 }}>
                        <TextField placeholder="Dị ứng với..." {...register("allergyNote")} isInvalid={false} />
                      </Field>
                    </AlertBanner>
                  )}
                  <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" {...register("hasChronicDisease")} style={{ width: 16, height: 16, accentColor: t.colorWarningBold }} />
                    <span style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeMd, color: t.colorText }}>Có bệnh mãn tính</span>
                  </label>
                  {hasChronicDisease && (
                    <AlertBanner variant="warning">
                      <AlertTriangle />
                      <Field label="Ghi chú bệnh mãn tính" style={{ flex: 1, margin: 0 }}>
                        <TextField placeholder="Tiểu đường, huyết áp..." {...register("chronicDiseaseNote")} isInvalid={false} />
                      </Field>
                    </AlertBanner>
                  )}
                </div>
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
