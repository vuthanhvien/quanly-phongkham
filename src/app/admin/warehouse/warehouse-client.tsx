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
import { Autocomplete } from "@/components/ui/autocomplete";
import { Plus, Search, Package, PackageCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  code: string;
  name: string;
  productType: string;
  purchaseUnit: string;
  usageUnit: string;
  conversionFactor: number;
  purchasePrice: number;
  sellingPrice: number;
  minStockLevel: number;
  isActive: boolean;
  category: { name: string };
  supplier: { name: string };
  totalStock: number;
};

type Batch = {
  id: string;
  batchNumber: string;
  quantityIn: number;
  quantityInUsage: number;
  remainingQty: number;
  purchasePrice: number;
  expiryDate: string | null;
  receivedAt: string;
  note: string | null;
  product:   { code: string; name: string; usageUnit: string };
  supplier:  { name: string } | null;
  branch:    { name: string };
  createdBy: { fullName: string };
};

type ProductOption = {
  value: string;
  label: string;
  conversionFactor: number;
  purchaseUnit: string;
  usageUnit: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const PRODUCT_TYPES = ["CONSUMABLE", "REUSABLE", "RETAIL"] as const;

const PRODUCT_TYPE_OPTIONS = [
  { value: "",           label: "Tất cả loại" },
  { value: "CONSUMABLE", label: "Vật tư tiêu hao" },
  { value: "REUSABLE",   label: "Vật tư tái sử dụng" },
  { value: "RETAIL",     label: "Sản phẩm bán lẻ" },
];

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  CONSUMABLE: "Tiêu hao",
  REUSABLE:   "Tái sử dụng",
  RETAIL:     "Bán lẻ",
};

const PRODUCT_TYPE_APPEARANCE: Record<string, "primary" | "neutral" | "success"> = {
  CONSUMABLE: "primary",
  REUSABLE:   "neutral",
  RETAIL:     "success",
};

// ─── Schemas ──────────────────────────────────────────────────────────────────

const productSchema = z.object({
  code:             z.string().min(1, "Mã không được để trống"),
  name:             z.string().min(1, "Tên không được để trống"),
  productType:      z.enum(PRODUCT_TYPES, "Chọn loại sản phẩm"),
  categoryName:     z.string().min(1, "Nhóm hàng không được để trống"),
  supplierName:     z.string().min(1, "Nhà cung cấp không được để trống"),
  purchaseUnit:     z.string().min(1, "Đơn vị mua không được để trống"),
  usageUnit:        z.string().min(1, "Đơn vị dùng không được để trống"),
  conversionFactor: z.string().refine(v => !isNaN(Number(v)) && Number(v) > 0, "Phải > 0"),
  purchasePrice:    z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0, "Không hợp lệ"),
  sellingPrice:     z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0, "Không hợp lệ"),
  minStockLevel:    z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0, "Không hợp lệ"),
});
type ProductForm = z.infer<typeof productSchema>;

const batchSchema = z.object({
  batchNumber:   z.string().min(1, "Số lô không được để trống"),
  quantityIn:    z.string().refine(v => !isNaN(Number(v)) && Number(v) > 0, "Số lượng phải > 0"),
  purchasePrice: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0, "Không hợp lệ"),
  expiryDate:    z.string().optional(),
  supplierName:  z.string().optional(),
  note:          z.string().optional(),
});
type BatchForm = z.infer<typeof batchSchema>;

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
const PageBtn = styled.button`
  all: unset; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: ${t.radiusMd}; color: ${t.colorTextSubtle};
  &:hover:not(:disabled) { background: ${t.colorBgNeutralHovered}; color: ${t.colorText}; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "–";
  try { return format(new Date(d), "dd/MM/yyyy", { locale: vi }); } catch { return "–"; }
}
function fmtCurrency(v: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(v);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WarehouseClient({
  isSuperAdmin, currentBranchId, productOptions,
}: {
  isSuperAdmin: boolean;
  currentBranchId: string | null;
  branches: { id: string; name: string }[];
  productOptions: ProductOption[];
}) {
  // ── Products tab ───────────────────────────────────────────────────────────
  const [products, setProducts]         = useState<Product[]>([]);
  const [prodTotal, setProdTotal]       = useState(0);
  const [prodPage, setProdPage]         = useState(1);
  const [prodLoading, setProdLoading]   = useState(true);
  const [prodSearch, setProdSearch]     = useState("");
  const [prodSearchInput, setProdSearchInput] = useState("");
  const [prodType, setProdType]         = useState("");
  const [prodDebounce, setProdDebounce] = useState<ReturnType<typeof setTimeout>>();

  const [prodOpen, setProdOpen]     = useState(false);
  const [prodSaving, setProdSaving] = useState(false);

  const prodForm   = useForm<ProductForm>({ resolver: zodResolver(productSchema) });
  const prodErrors = prodForm.formState.errors;

  // ── Batches tab ────────────────────────────────────────────────────────────
  const [batches, setBatches]           = useState<Batch[]>([]);
  const [batchTotal, setBatchTotal]     = useState(0);
  const [batchPage, setBatchPage]       = useState(1);
  const [batchLoading, setBatchLoading] = useState(true);

  const [batchOpen, setBatchOpen]     = useState(false);
  const [batchSaving, setBatchSaving] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);

  const batchForm   = useForm<BatchForm>({ resolver: zodResolver(batchSchema) });
  const batchErrors = batchForm.formState.errors;

  const PAGE_SIZE = 20;

  // ── Fetch products ─────────────────────────────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setProdLoading(true);
    try {
      const p = new URLSearchParams({ page: String(prodPage) });
      if (prodSearch) p.set("search", prodSearch);
      if (prodType)   p.set("type",   prodType);
      const res  = await fetch(`/api/warehouse/products?${p}`);
      const json = await res.json();
      setProducts(json.data ?? []);
      setProdTotal(json.total ?? 0);
    } finally { setProdLoading(false); }
  }, [prodPage, prodSearch, prodType]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setProdPage(1); }, [prodType]);

  // ── Fetch batches ──────────────────────────────────────────────────────────
  const fetchBatches = useCallback(async () => {
    setBatchLoading(true);
    try {
      const p = new URLSearchParams({ page: String(batchPage) });
      const res  = await fetch(`/api/warehouse/batches?${p}`);
      const json = await res.json();
      setBatches(json.data ?? []);
      setBatchTotal(json.total ?? 0);
    } finally { setBatchLoading(false); }
  }, [batchPage]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleProdSearch = (v: string) => {
    setProdSearchInput(v);
    clearTimeout(prodDebounce);
    setProdDebounce(setTimeout(() => { setProdSearch(v); setProdPage(1); }, 350));
  };

  const openCreateProduct = () => {
    prodForm.reset({ code: "", name: "", productType: "CONSUMABLE", categoryName: "", supplierName: "",
      purchaseUnit: "", usageUnit: "", conversionFactor: "1", purchasePrice: "0", sellingPrice: "0", minStockLevel: "0" });
    setProdOpen(true);
  };

  const onProdSave = async (data: ProductForm) => {
    setProdSaving(true);
    try {
      const res = await fetch("/api/warehouse/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data,
          conversionFactor: Number(data.conversionFactor), purchasePrice: Number(data.purchasePrice),
          sellingPrice: Number(data.sellingPrice), minStockLevel: Number(data.minStockLevel) }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success("Đã thêm sản phẩm");
      setProdOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally { setProdSaving(false); }
  };

  const openCreateBatch = () => {
    setSelectedProduct(null);
    batchForm.reset({ batchNumber: "", quantityIn: "", purchasePrice: "0", expiryDate: "", supplierName: "", note: "" });
    setBatchOpen(true);
  };

  const onBatchSave = async (data: BatchForm) => {
    if (!selectedProduct) { toast.error("Chọn sản phẩm nhập kho"); return; }
    const branchId = currentBranchId;
    if (!branchId && !isSuperAdmin) { toast.error("Không xác định được chi nhánh"); return; }
    setBatchSaving(true);
    try {
      const res = await fetch("/api/warehouse/batches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProduct.value, branchId,
          batchNumber: data.batchNumber, quantityIn: Number(data.quantityIn), purchasePrice: Number(data.purchasePrice),
          expiryDate: data.expiryDate || undefined, supplierName: data.supplierName || undefined, note: data.note || undefined }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      toast.success("Đã ghi nhận nhập kho");
      setBatchOpen(false);
      fetchBatches();
      fetchProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally { setBatchSaving(false); }
  };

  const prodPages  = Math.max(1, Math.ceil(prodTotal  / PAGE_SIZE));
  const batchPages = Math.max(1, Math.ceil(batchTotal / PAGE_SIZE));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <Tabs defaultValue="products">
        <TabList>
          <Tab value="products"><Package size={15} style={{ marginRight: 6 }} />Sản phẩm</Tab>
          <Tab value="imports"><PackageCheck size={15} style={{ marginRight: 6 }} />Nhập kho</Tab>
        </TabList>

        {/* ── Sản phẩm tab ──────────────────────────────────────────────── */}
        <TabPanel value="products" style={{ paddingTop: 16 }}>
          <SectionHeader>
            <FilterBar>
              <SearchWrap>
                <Search />
                <SearchInput
                  placeholder="Tìm theo tên, mã..."
                  value={prodSearchInput}
                  onChange={e => handleProdSearch(e.target.value)}
                />
              </SearchWrap>
              <Select
                compact
                value={prodType}
                onChange={v => setProdType(v as string)}
                options={PRODUCT_TYPE_OPTIONS}
              />
            </FilterBar>
            <Button appearance="primary" onClick={openCreateProduct}>
              <Plus size={14} /> Thêm sản phẩm
            </Button>
          </SectionHeader>
          <TableContainer>
            <Table>
              <TableHeader>
                <tr>
                  <Th>Mã / Tên</Th>
                  <Th>Loại</Th>
                  <Th>Nhóm hàng</Th>
                  <Th>Nhà cung cấp</Th>
                  <Th>ĐVT mua / dùng</Th>
                  <Th align="right">Giá mua</Th>
                  <Th align="right">Giá bán</Th>
                  <Th align="right">Tồn kho</Th>
                </tr>
              </TableHeader>
              <TableBody>
                {prodLoading ? null : products.length === 0 ? (
                  <TableEmpty colSpan={8} icon={<Package size={32} />} message="Chưa có sản phẩm nào" />
                ) : products.map(p => (
                  <Tr key={p.id}>
                    <Td>
                      <strong style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeMd }}>{p.code}</strong>
                      <br />
                      <span style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeSm, color: t.colorTextSubtle }}>{p.name}</span>
                    </Td>
                    <Td>
                      <Badge appearance={PRODUCT_TYPE_APPEARANCE[p.productType] ?? "neutral"}>
                        {PRODUCT_TYPE_LABELS[p.productType] ?? p.productType}
                      </Badge>
                    </Td>
                    <Td>{p.category.name}</Td>
                    <Td>{p.supplier.name}</Td>
                    <Td>{p.purchaseUnit} / {p.usageUnit}</Td>
                    <Td align="right">{fmtCurrency(p.purchasePrice)}</Td>
                    <Td align="right">{fmtCurrency(p.sellingPrice)}</Td>
                    <Td align="right">
                      <Badge appearance={p.totalStock <= p.minStockLevel ? "danger" : "success"}>
                        {p.totalStock} {p.usageUnit}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination>
            <span>Trang {prodPage} / {prodPages} &bull; {prodTotal} sản phẩm</span>
            <PageBtn disabled={prodPage <= 1} onClick={() => setProdPage(p => p - 1)}><ChevronLeft size={16} /></PageBtn>
            <PageBtn disabled={prodPage >= prodPages} onClick={() => setProdPage(p => p + 1)}><ChevronRight size={16} /></PageBtn>
          </Pagination>
        </TabPanel>

        {/* ── Nhập kho tab ──────────────────────────────────────────────── */}
        <TabPanel value="imports" style={{ paddingTop: 16 }}>
          <SectionHeader>
            <div style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeMd, fontWeight: 600, color: t.colorText }}>
              Lịch sử nhập kho ({batchTotal})
            </div>
            <Button appearance="primary" onClick={openCreateBatch}>
              <Plus size={14} /> Nhập kho
            </Button>
          </SectionHeader>
          <TableContainer>
            <Table>
              <TableHeader>
                <tr>
                  <Th>Sản phẩm</Th>
                  <Th>Số lô</Th>
                  <Th align="right">SL nhập</Th>
                  <Th align="right">Còn lại</Th>
                  <Th>Hạn dùng</Th>
                  <Th align="right">Giá nhập</Th>
                  <Th>Chi nhánh</Th>
                  <Th>Ngày nhập</Th>
                </tr>
              </TableHeader>
              <TableBody>
                {batchLoading ? null : batches.length === 0 ? (
                  <TableEmpty colSpan={8} icon={<PackageCheck size={32} />} message="Chưa có dữ liệu nhập kho" />
                ) : batches.map(b => (
                  <Tr key={b.id}>
                    <Td><strong style={{ fontFamily: t.fontFamily }}>{b.product.name}</strong></Td>
                    <Td>{b.batchNumber}</Td>
                    <Td align="right">{Number(b.quantityInUsage)} {b.product.usageUnit}</Td>
                    <Td align="right">
                      <Badge appearance={Number(b.remainingQty) <= 0 ? "danger" : "success"}>
                        {Number(b.remainingQty)} {b.product.usageUnit}
                      </Badge>
                    </Td>
                    <Td>{fmtDate(b.expiryDate)}</Td>
                    <Td align="right">{fmtCurrency(Number(b.purchasePrice))}</Td>
                    <Td>{b.branch.name}</Td>
                    <Td>{fmtDate(b.receivedAt)}</Td>
                  </Tr>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination>
            <span>Trang {batchPage} / {batchPages} &bull; {batchTotal} lô hàng</span>
            <PageBtn disabled={batchPage <= 1} onClick={() => setBatchPage(p => p - 1)}><ChevronLeft size={16} /></PageBtn>
            <PageBtn disabled={batchPage >= batchPages} onClick={() => setBatchPage(p => p + 1)}><ChevronRight size={16} /></PageBtn>
          </Pagination>
        </TabPanel>
      </Tabs>

      {/* ── Create Product Modal ──────────────────────────────────────────── */}
      <Modal open={prodOpen} onOpenChange={setProdOpen} title="Thêm sản phẩm mới" size="lg">
        <form onSubmit={prodForm.handleSubmit(onProdSave)}>
          <ModalBody>
            <FormGrid>
              <Field label="Mã sản phẩm *" error={prodErrors.code?.message}>
                <TextField {...prodForm.register("code")} placeholder="SP001" />
              </Field>
              <Field label="Tên sản phẩm *" error={prodErrors.name?.message}>
                <TextField {...prodForm.register("name")} placeholder="Tên sản phẩm" />
              </Field>
              <Field label="Loại sản phẩm *" error={prodErrors.productType?.message}>
                <Select
                  value={prodForm.watch("productType")}
                  onChange={v => prodForm.setValue("productType", v as typeof PRODUCT_TYPES[number])}
                  options={[
                    { value: "CONSUMABLE", label: "Vật tư tiêu hao" },
                    { value: "REUSABLE",   label: "Vật tư tái sử dụng" },
                    { value: "RETAIL",     label: "Sản phẩm bán lẻ" },
                  ]}
                />
              </Field>
              <Field label="Nhóm hàng *" error={prodErrors.categoryName?.message}>
                <TextField {...prodForm.register("categoryName")} placeholder="Vd: Thuốc gây tê, Kim tiêm..." />
              </Field>
              <Field label="Nhà cung cấp *" error={prodErrors.supplierName?.message}>
                <TextField {...prodForm.register("supplierName")} placeholder="Tên nhà cung cấp" />
              </Field>
              <Field label="ĐV mua (purchaseUnit) *" error={prodErrors.purchaseUnit?.message}>
                <TextField {...prodForm.register("purchaseUnit")} placeholder="Vd: hộp, chai, cái" />
              </Field>
              <Field label="ĐV dùng (usageUnit) *" error={prodErrors.usageUnit?.message}>
                <TextField {...prodForm.register("usageUnit")} placeholder="Vd: viên, ml, cc" />
              </Field>
              <Field label="Hệ số quy đổi *" error={prodErrors.conversionFactor?.message}>
                <TextField {...prodForm.register("conversionFactor")} type="number" step="0.0001" placeholder="1 hộp = ? viên" />
              </Field>
              <Field label="Giá mua (VND) *" error={prodErrors.purchasePrice?.message}>
                <TextField {...prodForm.register("purchasePrice")} type="number" placeholder="0" />
              </Field>
              <Field label="Giá bán (VND) *" error={prodErrors.sellingPrice?.message}>
                <TextField {...prodForm.register("sellingPrice")} type="number" placeholder="0" />
              </Field>
              <Field label="Tồn kho tối thiểu" error={prodErrors.minStockLevel?.message}>
                <TextField {...prodForm.register("minStockLevel")} type="number" placeholder="0" />
              </Field>
            </FormGrid>
          </ModalBody>
          <ModalFooter>
            <Button type="button" appearance="subtle" onClick={() => setProdOpen(false)}>Huỷ</Button>
            <Button type="submit" appearance="primary" isDisabled={prodSaving}>Lưu sản phẩm</Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ── Create Batch Modal ────────────────────────────────────────────── */}
      <Modal open={batchOpen} onOpenChange={setBatchOpen} title="Nhập kho">
        <form onSubmit={batchForm.handleSubmit(onBatchSave)}>
          <ModalBody>
            <Field label="Sản phẩm *">
              <Autocomplete
                placeholder="Tìm sản phẩm..."
                options={productOptions}
                value={selectedProduct?.value ?? ""}
                onChange={v => {
                  const opt = productOptions.find(p => p.value === v) ?? null;
                  setSelectedProduct(opt);
                }}
              />
              {selectedProduct && (
                <span style={{ fontFamily: t.fontFamily, fontSize: t.fontSizeXs, color: t.colorTextSubtle, marginTop: 4, display: "block" }}>
                  Hệ số: 1 {selectedProduct.purchaseUnit} = {selectedProduct.conversionFactor} {selectedProduct.usageUnit}
                </span>
              )}
            </Field>
            <FormGrid style={{ marginTop: 12 }}>
              <Field label="Số lô *" error={batchErrors.batchNumber?.message}>
                <TextField {...batchForm.register("batchNumber")} placeholder="LOT001" />
              </Field>
              <Field label={`Số lượng (${selectedProduct ? selectedProduct.purchaseUnit : "đơn vị mua"}) *`} error={batchErrors.quantityIn?.message}>
                <TextField {...batchForm.register("quantityIn")} type="number" step="0.01" placeholder="0" />
              </Field>
              <Field label="Giá nhập (VND / đơn vị mua)" error={batchErrors.purchasePrice?.message}>
                <TextField {...batchForm.register("purchasePrice")} type="number" placeholder="0" />
              </Field>
              <Field label="Hạn sử dụng">
                <TextField {...batchForm.register("expiryDate")} type="date" />
              </Field>
              <Field label="Nhà cung cấp">
                <TextField {...batchForm.register("supplierName")} placeholder="Tên nhà cung cấp" />
              </Field>
              <Field label="Ghi chú">
                <TextField {...batchForm.register("note")} placeholder="Ghi chú (tùy chọn)" />
              </Field>
            </FormGrid>
          </ModalBody>
          <ModalFooter>
            <Button type="button" appearance="subtle" onClick={() => setBatchOpen(false)}>Huỷ</Button>
            <Button type="submit" appearance="primary" isDisabled={batchSaving}>Ghi nhận nhập kho</Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
