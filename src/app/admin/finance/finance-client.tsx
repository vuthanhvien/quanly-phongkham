"use client"

import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import styled from "styled-components"
import { tokens as t } from "@/components/ui/tokens"
import { Button } from "@/components/ui/button"
import { Field, TextField } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  Th,
  Tr,
  Td,
  TableEmpty,
  TableContainer,
} from "@/components/ui/table"
import { Modal, ModalBody, ModalFooter } from "@/components/ui/dialog"
import { SectionHeader } from "@/components/ui/card"
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/tabs"
import { Autocomplete } from "@/components/ui/autocomplete"
import {
  Plus,
  Search,
  Receipt,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  BarChart2,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns"
import { vi } from "date-fns/locale"

// ─── Types ───────────────────────────────────────────────────────────────────

type Invoice = {
  id: string
  invoiceNumber: string
  status: string
  totalAmount: number
  paidAmount: number
  discount: number
  invoiceDate: string
  customer: { id: string; fullName: string; phone: string | null } | null
  branch: { name: string }
  createdBy: { fullName: string }
  payments: {
    id: string
    amount: number
    paymentMethod: string
    paidAt: string
  }[]
}

type Expense = {
  id: string
  category: string
  description: string | null
  amount: number
  paidAt: string
  branch: { name: string }
  createdBy: { fullName: string }
}

type CustomerOption = { value: string; label: string; phone: string | null }
type LineItem = { description: string; quantity: number; unitPrice: number }

type ReportData = {
  totalRevenue: number
  totalExpenses: number
  profit: number
  paymentCount: number
  expenseCount: number
  paymentsByMethod: { method: string; amount: number }[]
  expensesByCategory: { category: string; amount: number }[]
  invoicesByStatus: { status: string; count: number; amount: number }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const INVOICE_STATUS_LABELS: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PARTIAL: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  CANCELLED: "Đã huỷ",
}
const INVOICE_STATUS_APPEARANCE: Record<
  string,
  "danger" | "warning" | "success" | "neutral"
> = {
  UNPAID: "danger",
  PARTIAL: "warning",
  PAID: "success",
  CANCELLED: "neutral",
}

const PAYMENT_METHOD_OPTIONS = [
  { value: "CASH", label: "Tiền mặt" },
  { value: "BANK", label: "Chuyển khoản" },
  { value: "CARD", label: "Thẻ" },
  { value: "OTHER", label: "Khác" },
]

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH:        "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  CREDIT_CARD: "Thẻ tín dụng",
  DEBIT_CARD:  "Thẻ ghi nợ",
  MOMO:        "MoMo",
  VNPAY:       "VNPay",
}

const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  SALARY:      "Lương",
  RENT:        "Mặt bằng",
  UTILITIES:   "Điện nước",
  SUPPLIES:    "Vật tư",
  MAINTENANCE: "Bảo trì",
  MARKETING:   "Marketing",
  OTHER:       "Khác",
}

const EXPENSE_CATEGORIES = [
  "SALARY",
  "RENT",
  "UTILITIES",
  "SUPPLIES",
  "MAINTENANCE",
  "MARKETING",
  "OTHER",
]
const EXPENSE_CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((c) => ({
  value: c,
  label: c,
}))

// ─── Schemas ──────────────────────────────────────────────────────────────────

const paymentSchema = z.object({
  amount: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Số tiền phải > 0"),
  paymentMethod: z.enum(["CASH", "BANK", "CARD", "OTHER"] as const),
  note: z.string().optional(),
})
type PaymentForm = z.infer<typeof paymentSchema>

const expenseSchema = z.object({
  category: z.string().min(1, "Chọn danh mục chi phí"),
  description: z.string().optional(),
  amount: z
    .string()
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Số tiền phải > 0"),
  paidAt: z.string().min(1, "Chọn ngày chi"),
})
type ExpenseForm = z.infer<typeof expenseSchema>

// ─── Styled ──────────────────────────────────────────────────────────────────

const FilterBar = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
`
const SearchWrap = styled.div`
  position: relative;
  flex: 1;
  min-width: 180px;
  max-width: 300px;
  svg {
    position: absolute;
    left: 9px;
    top: 50%;
    transform: translateY(-50%);
    color: ${t.colorTextSubtlest};
    width: 14px;
    height: 14px;
    pointer-events: none;
  }
`
const SearchInput = styled.input`
  width: 100%;
  height: 32px;
  padding: 0 10px 0 30px;
  border: 2px solid ${t.colorBorderInput};
  border-radius: ${t.radiusMd};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${t.colorText};
  background: white;
  outline: none;
  box-sizing: border-box;
  &::placeholder {
    color: ${t.colorTextSubtlest};
  }
  &:focus {
    border-color: ${t.colorBorderFocused};
    box-shadow: 0 0 0 2px ${t.colorBrandSubtlest};
  }
`
const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid ${t.colorBorder};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  color: ${t.colorTextSubtle};
`
const PageBtn = styled.button`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${t.radiusMd};
  color: ${t.colorTextSubtle};
  &:hover:not(:disabled) {
    background: ${t.colorBgNeutralHovered};
    color: ${t.colorText};
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`
const ReportFilterBar = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  padding: 12px 16px;
  border-bottom: 1px solid ${t.colorBorder};
  background: ${t.colorBgNeutral};
`
const PresetBtn = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  padding: 4px 10px;
  border-radius: ${t.radiusMd};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  font-weight: 500;
  background: ${({ $active }) => ($active ? t.colorBrandSubtle : "white")};
  color: ${({ $active }) => ($active ? t.colorBrand : t.colorTextSubtle)};
  border: 1px solid ${({ $active }) => ($active ? t.colorBrand : t.colorBorder)};
  &:hover {
    background: ${t.colorBrandSubtlest};
    color: ${t.colorBrand};
    border-color: ${t.colorBrand};
  }
`
const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px;
`
const StatCard = styled.div<{ $variant?: "success" | "danger" | "neutral" }>`
  background: white;
  border: 1px solid ${t.colorBorder};
  border-radius: ${t.radiusLg};
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-left: 3px solid
    ${({ $variant }) =>
      $variant === "success"
        ? t.colorTextSuccess
        : $variant === "danger"
          ? t.colorTextDanger
          : t.colorBorder};
`
const StatLabel = styled.div`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  color: ${t.colorTextSubtle};
  display: flex;
  align-items: center;
  gap: 5px;
`
const StatValue = styled.div<{ $variant?: "success" | "danger" | "neutral" }>`
  font-family: ${t.fontFamily};
  font-size: 22px;
  font-weight: 700;
  color: ${({ $variant }) =>
    $variant === "success"
      ? t.colorTextSuccess
      : $variant === "danger"
        ? t.colorTextDanger
        : t.colorText};
`
const ReportSection = styled.div`
  padding: 0 16px 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`
const ReportBox = styled.div`
  background: white;
  border: 1px solid ${t.colorBorder};
  border-radius: ${t.radiusLg};
  overflow: hidden;
`
const ReportBoxTitle = styled.div`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  font-weight: 600;
  color: ${t.colorText};
  padding: 10px 14px;
  border-bottom: 1px solid ${t.colorBorder};
  background: ${t.colorBgNeutral};
`
const BreakdownRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 7px 14px;
  border-bottom: 1px solid ${t.colorBorder};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  &:last-child {
    border-bottom: none;
  }
`
const BarTrack = styled.div`
  height: 4px;
  background: ${t.colorBgNeutralHovered};
  border-radius: 2px;
  margin-top: 3px;
  overflow: hidden;
`
const BarFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ $color }) => $color};
  border-radius: 2px;
  transition: width 0.4s ease;
`
const DateInput = styled.input`
  height: 32px;
  padding: 0 8px;
  border: 1px solid ${t.colorBorderInput};
  border-radius: ${t.radiusMd};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${t.colorText};
  background: white;
  outline: none;
  &:focus {
    border-color: ${t.colorBorderFocused};
  }
`
const ReportEmpty = styled.div`
  padding: 32px 16px;
  text-align: center;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${t.colorTextSubtlest};
`

const ItemRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 80px 120px 32px;
  gap: 8px;
  align-items: end;
  margin-bottom: 8px;
`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "–"
  try {
    return format(new Date(d), "dd/MM/yyyy", { locale: vi })
  } catch {
    return "–"
  }
}
function fmtCurrency(v: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(v)
}
function todayISO() {
  return format(new Date(), "yyyy-MM-dd")
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FinanceClient({
  currentBranchId,
}: {
  isSuperAdmin: boolean
  currentBranchId: string | null
  branches: { id: string; name: string }[]
}) {
  // ── Invoice list ────────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [invTotal, setInvTotal] = useState(0)
  const [invPage, setInvPage] = useState(1)
  const [invLoading, setInvLoading] = useState(true)
  const [invSearch, setInvSearch] = useState("")
  const [invSearchInput, setInvSearchInput] = useState("")
  const [invStatus, setInvStatus] = useState("")
  const [invDebounce, setInvDebounce] =
    useState<ReturnType<typeof setTimeout>>()

  const [invOpen, setInvOpen] = useState(false)
  const [invSaving, setInvSaving] = useState(false)

  // Invoice create form state (line items not managed by react-hook-form)
  const [invCustomer, setInvCustomer] = useState<CustomerOption | null>(null)
  const [custOptions, setCustOptions] = useState<CustomerOption[]>([])
  const [, setCustLoading] = useState(false)
  const [invItems, setInvItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ])
  const [invDiscount, setInvDiscount] = useState("0")

  // Payment modal
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null)
  const [payOpen, setPayOpen] = useState(false)
  const [paySaving, setPaySaving] = useState(false)
  const payForm = useForm<PaymentForm>({ resolver: zodResolver(paymentSchema) })
  const payErrors = payForm.formState.errors

  // ── Report ──────────────────────────────────────────────────────────────
  const [reportFrom, setReportFrom] = useState(() =>
    format(startOfMonth(new Date()), "yyyy-MM-dd"),
  )
  const [reportTo, setReportTo] = useState(() =>
    format(endOfMonth(new Date()), "yyyy-MM-dd"),
  )
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportPreset, setReportPreset] = useState<string>("thisMonth")

  const fetchReport = useCallback(async (from: string, to: string) => {
    setReportLoading(true)
    try {
      const res = await fetch(
        `/api/finance/report?from=${from}&to=${to}`,
      )
      const json = await res.json()
      setReportData(json)
    } catch {
      toast.error("Không thể tải báo cáo")
    } finally {
      setReportLoading(false)
    }
  }, [])

  const applyPreset = (preset: string) => {
    const now = new Date()
    let from: Date, to: Date
    if (preset === "thisMonth") {
      from = startOfMonth(now)
      to   = endOfMonth(now)
    } else if (preset === "lastMonth") {
      const last = subMonths(now, 1)
      from = startOfMonth(last)
      to   = endOfMonth(last)
    } else {
      from = startOfYear(now)
      to   = endOfYear(now)
    }
    const f = format(from, "yyyy-MM-dd")
    const t2 = format(to, "yyyy-MM-dd")
    setReportFrom(f)
    setReportTo(t2)
    setReportPreset(preset)
    fetchReport(f, t2)
  }

  // ── Expenses ────────────────────────────────────────────────────────────
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expTotal, setExpTotal] = useState(0)
  const [expPage, setExpPage] = useState(1)
  const [expLoading, setExpLoading] = useState(true)

  const [expOpen, setExpOpen] = useState(false)
  const [expSaving, setExpSaving] = useState(false)
  const expForm = useForm<ExpenseForm>({ resolver: zodResolver(expenseSchema) })
  const expErrors = expForm.formState.errors

  const PAGE_SIZE = 20

  // ── Fetch invoices ──────────────────────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    setInvLoading(true)
    try {
      const p = new URLSearchParams({ page: String(invPage) })
      if (invSearch) p.set("search", invSearch)
      if (invStatus) p.set("status", invStatus)
      const res = await fetch(`/api/invoices?${p}`)
      const json = await res.json()
      setInvoices(json.data ?? [])
      setInvTotal(json.total ?? 0)
    } finally {
      setInvLoading(false)
    }
  }, [invPage, invSearch, invStatus])
  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])
  useEffect(() => {
    setInvPage(1)
  }, [invStatus])

  // ── Fetch expenses ──────────────────────────────────────────────────────
  const fetchExpenses = useCallback(async () => {
    setExpLoading(true)
    try {
      const p = new URLSearchParams({ page: String(expPage) })
      const res = await fetch(`/api/expenses?${p}`)
      const json = await res.json()
      setExpenses(json.data ?? [])
      setExpTotal(json.total ?? 0)
    } finally {
      setExpLoading(false)
    }
  }, [expPage])
  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleInvSearch = (v: string) => {
    setInvSearchInput(v)
    clearTimeout(invDebounce)
    setInvDebounce(
      setTimeout(() => {
        setInvSearch(v)
        setInvPage(1)
      }, 350),
    )
  }

  const searchCustomers = async (q: string) => {
    if (!q || q.length < 2) {
      setCustOptions([])
      return
    }
    setCustLoading(true)
    try {
      const res = await fetch(
        `/api/customers?search=${encodeURIComponent(q)}&page=1`,
      )
      const json = await res.json()
      const list: CustomerOption[] = (json.data ?? []).map(
        (c: { id: string; fullName: string; phone: string | null }) => ({
          value: c.id,
          label: c.fullName,
          phone: c.phone,
        }),
      )
      setCustOptions(list)
    } finally {
      setCustLoading(false)
    }
  }

  const addItem = () =>
    setInvItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unitPrice: 0 },
    ])
  const removeItem = (i: number) =>
    setInvItems((prev) => prev.filter((_, idx) => idx !== i))
  const updateItem = (
    i: number,
    field: keyof LineItem,
    value: string | number,
  ) =>
    setInvItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)),
    )

  const invSubtotal = invItems.reduce(
    (s, it) => s + it.quantity * it.unitPrice,
    0,
  )
  const invTotal2 = Math.max(0, invSubtotal - Number(invDiscount || 0))

  const openCreateInvoice = () => {
    setInvCustomer(null)
    setInvItems([{ description: "", quantity: 1, unitPrice: 0 }])
    setInvDiscount("0")
    setInvOpen(true)
  }

  const onInvSave = async () => {
    if (invItems.some((it) => !it.description.trim())) {
      toast.error("Mỗi dòng dịch vụ phải có mô tả")
      return
    }
    setInvSaving(true)
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: invCustomer?.value,
          branchId: currentBranchId,
          discount: Number(invDiscount || 0),
          items: invItems.map((it) => ({
            description: it.description,
            quantity: Number(it.quantity),
            unitPrice: Number(it.unitPrice),
          })),
        }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.message)
      }
      toast.success("Đã tạo hóa đơn")
      setInvOpen(false)
      fetchInvoices()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra")
    } finally {
      setInvSaving(false)
    }
  }

  const openPayModal = (inv: Invoice) => {
    setPayInvoice(inv)
    const remaining = inv.totalAmount - inv.paidAmount
    payForm.reset({
      amount: String(remaining > 0 ? remaining : 0),
      paymentMethod: "CASH",
      note: "",
    })
    setPayOpen(true)
  }

  const onPaySave = async (data: PaymentForm) => {
    if (!payInvoice) return
    setPaySaving(true)
    try {
      const res = await fetch(`/api/invoices/${payInvoice.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(data.amount),
          paymentMethod: data.paymentMethod,
          note: data.note,
        }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.message)
      }
      toast.success("Đã ghi nhận thanh toán")
      setPayOpen(false)
      fetchInvoices()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra")
    } finally {
      setPaySaving(false)
    }
  }

  const openCreateExpense = () => {
    expForm.reset({
      category: "OTHER",
      description: "",
      amount: "",
      paidAt: todayISO(),
    })
    setExpOpen(true)
  }

  const onExpSave = async (data: ExpenseForm) => {
    setExpSaving(true)
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          amount: Number(data.amount),
          branchId: currentBranchId,
        }),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.message)
      }
      toast.success("Đã ghi nhận chi phí")
      setExpOpen(false)
      fetchExpenses()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Có lỗi xảy ra")
    } finally {
      setExpSaving(false)
    }
  }

  const invPages = Math.max(1, Math.ceil(invTotal / PAGE_SIZE))
  const expPages = Math.max(1, Math.ceil(expTotal / PAGE_SIZE))

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Tabs defaultValue="invoices">
        <TabList>
          <Tab value="invoices">
            <Receipt size={15} style={{ marginRight: 6 }} />
            Hóa đơn
          </Tab>
          <Tab value="expenses">
            <CreditCard size={15} style={{ marginRight: 6 }} />
            Chi phí
          </Tab>
          <Tab value="report">
            <BarChart2 size={15} style={{ marginRight: 6 }} />
            Báo cáo
          </Tab>
        </TabList>

        {/* ── Hóa đơn tab ───────────────────────────────────────────────── */}
        <TabPanel value="invoices" style={{ paddingTop: 16 }}>
          <SectionHeader>
            <FilterBar>
              <SearchWrap>
                <Search />
                <SearchInput
                  placeholder="Tìm theo số HĐ, khách hàng..."
                  value={invSearchInput}
                  onChange={(e) => handleInvSearch(e.target.value)}
                />
              </SearchWrap>
              <Select
                compact
                value={invStatus}
                onChange={(v) => setInvStatus(v as string)}
                options={[
                  { value: "", label: "Tất cả trạng thái" },
                  { value: "UNPAID", label: "Chưa thanh toán" },
                  { value: "PARTIAL", label: "Thanh toán 1 phần" },
                  { value: "PAID", label: "Đã thanh toán" },
                  { value: "CANCELLED", label: "Đã huỷ" },
                ]}
              />
            </FilterBar>
            <Button appearance="primary" onClick={openCreateInvoice}>
              <Plus size={14} /> Tạo hóa đơn
            </Button>
          </SectionHeader>
          <TableContainer>
            <Table>
              <TableHeader>
                <tr>
                  <Th>Số HĐ</Th>
                  <Th>Khách hàng</Th>
                  <Th>Chi nhánh</Th>
                  <Th>Ngày</Th>
                  <Th align="right">Tổng tiền</Th>
                  <Th align="right">Đã trả</Th>
                  <Th>Trạng thái</Th>
                  <Th />
                </tr>
              </TableHeader>
              <TableBody>
                {invLoading ? null : invoices.length === 0 ? (
                  <TableEmpty
                    colSpan={8}
                    icon={<Receipt size={32} />}
                    message="Chưa có hóa đơn nào"
                  />
                ) : (
                  invoices.map((inv) => (
                    <Tr key={inv.id}>
                      <Td>
                        <strong style={{ fontFamily: t.fontFamily }}>
                          {inv.invoiceNumber}
                        </strong>
                      </Td>
                      <Td>
                        {inv.customer
                          ? `${inv.customer.fullName}${inv.customer.phone ? ` – ${inv.customer.phone}` : ""}`
                          : "Khách vãng lai"}
                      </Td>
                      <Td>{inv.branch.name}</Td>
                      <Td>{fmtDate(inv.invoiceDate)}</Td>
                      <Td align="right">{fmtCurrency(inv.totalAmount)}</Td>
                      <Td align="right">{fmtCurrency(inv.paidAmount)}</Td>
                      <Td>
                        <Badge
                          appearance={
                            INVOICE_STATUS_APPEARANCE[inv.status] ?? "neutral"
                          }
                        >
                          {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                        </Badge>
                      </Td>
                      <Td>
                        {inv.status !== "PAID" &&
                          inv.status !== "CANCELLED" && (
                            <Button
                              appearance="primary"
                              spacing="compact"
                              onClick={() => openPayModal(inv)}
                            >
                              <CheckCircle2 size={14} /> Thanh toán
                            </Button>
                          )}
                      </Td>
                    </Tr>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination>
            <span>
              Trang {invPage} / {invPages} &bull; {invTotal} hóa đơn
            </span>
            <PageBtn
              disabled={invPage <= 1}
              onClick={() => setInvPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </PageBtn>
            <PageBtn
              disabled={invPage >= invPages}
              onClick={() => setInvPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </PageBtn>
          </Pagination>
        </TabPanel>

        {/* ── Chi phí tab ───────────────────────────────────────────────── */}
        <TabPanel value="expenses" style={{ paddingTop: 16 }}>
          <SectionHeader>
            <div
              style={{
                fontFamily: t.fontFamily,
                fontSize: t.fontSizeMd,
                fontWeight: 600,
                color: t.colorText,
              }}
            >
              Chi phí ({expTotal})
            </div>
            <Button appearance="primary" onClick={openCreateExpense}>
              <Plus size={14} /> Ghi chi phí
            </Button>
          </SectionHeader>
          <TableContainer>
            <Table>
              <TableHeader>
                <tr>
                  <Th>Danh mục</Th>
                  <Th>Mô tả</Th>
                  <Th>Chi nhánh</Th>
                  <Th>Người ghi</Th>
                  <Th>Ngày chi</Th>
                  <Th align="right">Số tiền</Th>
                </tr>
              </TableHeader>
              <TableBody>
                {expLoading ? null : expenses.length === 0 ? (
                  <TableEmpty
                    colSpan={6}
                    icon={<CreditCard size={32} />}
                    message="Chưa có chi phí nào"
                  />
                ) : (
                  expenses.map((ex) => (
                    <Tr key={ex.id}>
                      <Td>
                        <Badge appearance="neutral">{ex.category}</Badge>
                      </Td>
                      <Td>{ex.description ?? "–"}</Td>
                      <Td>{ex.branch.name}</Td>
                      <Td>{ex.createdBy.fullName}</Td>
                      <Td>{fmtDate(ex.paidAt)}</Td>
                      <Td align="right">
                        <strong style={{ fontFamily: t.fontFamily }}>
                          {fmtCurrency(ex.amount)}
                        </strong>
                      </Td>
                    </Tr>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Pagination>
            <span>
              Trang {expPage} / {expPages} &bull; {expTotal} khoản chi
            </span>
            <PageBtn
              disabled={expPage <= 1}
              onClick={() => setExpPage((p) => p - 1)}
            >
              <ChevronLeft size={16} />
            </PageBtn>
            <PageBtn
              disabled={expPage >= expPages}
              onClick={() => setExpPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </PageBtn>
          </Pagination>
        </TabPanel>

        {/* ── Báo cáo tab ───────────────────────────────────────────────── */}
        <TabPanel value="report">
          {/* Filter bar */}
          <ReportFilterBar>
            <PresetBtn
              $active={reportPreset === "thisMonth"}
              onClick={() => applyPreset("thisMonth")}
            >
              Tháng này
            </PresetBtn>
            <PresetBtn
              $active={reportPreset === "lastMonth"}
              onClick={() => applyPreset("lastMonth")}
            >
              Tháng trước
            </PresetBtn>
            <PresetBtn
              $active={reportPreset === "thisYear"}
              onClick={() => applyPreset("thisYear")}
            >
              Năm nay
            </PresetBtn>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginLeft: 8,
              }}
            >
              <DateInput
                type="date"
                value={reportFrom}
                onChange={(e) => {
                  setReportFrom(e.target.value)
                  setReportPreset("custom")
                }}
              />
              <span
                style={{
                  fontFamily: t.fontFamily,
                  fontSize: t.fontSizeSm,
                  color: t.colorTextSubtle,
                }}
              >
                →
              </span>
              <DateInput
                type="date"
                value={reportTo}
                onChange={(e) => {
                  setReportTo(e.target.value)
                  setReportPreset("custom")
                }}
              />
            </div>
            <Button
              appearance="primary"
              spacing="compact"
              isDisabled={reportLoading}
              onClick={() => fetchReport(reportFrom, reportTo)}
            >
              {reportLoading ? "Đang tải..." : "Xem báo cáo"}
            </Button>
          </ReportFilterBar>

          {reportData === null ? (
            <ReportEmpty>
              Chọn kỳ báo cáo và nhấn <strong>Xem báo cáo</strong>
            </ReportEmpty>
          ) : (
            <>
              {/* Summary cards */}
              <StatGrid>
                <StatCard $variant="success">
                  <StatLabel>
                    <TrendingUp size={14} /> Doanh thu đã thu
                  </StatLabel>
                  <StatValue $variant="success">
                    {fmtCurrency(reportData.totalRevenue)}
                  </StatValue>
                  <div
                    style={{
                      fontFamily: t.fontFamily,
                      fontSize: t.fontSizeSm,
                      color: t.colorTextSubtle,
                    }}
                  >
                    {reportData.paymentCount} lần thanh toán
                  </div>
                </StatCard>

                <StatCard $variant="danger">
                  <StatLabel>
                    <TrendingDown size={14} /> Chi phí
                  </StatLabel>
                  <StatValue $variant="danger">
                    {fmtCurrency(reportData.totalExpenses)}
                  </StatValue>
                  <div
                    style={{
                      fontFamily: t.fontFamily,
                      fontSize: t.fontSizeSm,
                      color: t.colorTextSubtle,
                    }}
                  >
                    {reportData.expenseCount} khoản chi
                  </div>
                </StatCard>

                <StatCard
                  $variant={
                    reportData.profit >= 0 ? "success" : "danger"
                  }
                >
                  <StatLabel>
                    <Minus size={14} /> Lợi nhuận
                  </StatLabel>
                  <StatValue
                    $variant={
                      reportData.profit >= 0 ? "success" : "danger"
                    }
                  >
                    {fmtCurrency(reportData.profit)}
                  </StatValue>
                  <div
                    style={{
                      fontFamily: t.fontFamily,
                      fontSize: t.fontSizeSm,
                      color: t.colorTextSubtle,
                    }}
                  >
                    {reportData.totalRevenue > 0
                      ? `Tỉ suất: ${Math.round((reportData.profit / reportData.totalRevenue) * 100)}%`
                      : "–"}
                  </div>
                </StatCard>
              </StatGrid>

              {/* Breakdown tables */}
              <ReportSection>
                {/* Thanh toán theo phương thức */}
                <ReportBox>
                  <ReportBoxTitle>Doanh thu theo phương thức</ReportBoxTitle>
                  {reportData.paymentsByMethod.length === 0 ? (
                    <ReportEmpty>Không có dữ liệu</ReportEmpty>
                  ) : (
                    (() => {
                      const maxAmt = Math.max(
                        ...reportData.paymentsByMethod.map((p) => p.amount),
                        1,
                      )
                      return reportData.paymentsByMethod.map((p) => (
                        <BreakdownRow key={p.method}>
                          <div>
                            <div
                              style={{
                                fontFamily: t.fontFamily,
                                fontSize: t.fontSizeSm,
                                color: t.colorText,
                                fontWeight: 500,
                              }}
                            >
                              {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
                            </div>
                            <BarTrack>
                              <BarFill
                                $pct={(p.amount / maxAmt) * 100}
                                $color={t.colorBrand}
                              />
                            </BarTrack>
                          </div>
                          <div
                            style={{
                              fontFamily: t.fontFamily,
                              fontSize: t.fontSizeSm,
                              fontWeight: 600,
                              color: t.colorTextSuccess,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {fmtCurrency(p.amount)}
                          </div>
                        </BreakdownRow>
                      ))
                    })()
                  )}
                </ReportBox>

                {/* Chi phí theo danh mục */}
                <ReportBox>
                  <ReportBoxTitle>Chi phí theo danh mục</ReportBoxTitle>
                  {reportData.expensesByCategory.length === 0 ? (
                    <ReportEmpty>Không có dữ liệu</ReportEmpty>
                  ) : (
                    (() => {
                      const maxAmt = Math.max(
                        ...reportData.expensesByCategory.map((e) => e.amount),
                        1,
                      )
                      return reportData.expensesByCategory.map((e) => (
                        <BreakdownRow key={e.category}>
                          <div>
                            <div
                              style={{
                                fontFamily: t.fontFamily,
                                fontSize: t.fontSizeSm,
                                color: t.colorText,
                                fontWeight: 500,
                              }}
                            >
                              {EXPENSE_CATEGORY_LABELS[e.category] ??
                                e.category}
                            </div>
                            <BarTrack>
                              <BarFill
                                $pct={(e.amount / maxAmt) * 100}
                                $color={t.colorTextDanger}
                              />
                            </BarTrack>
                          </div>
                          <div
                            style={{
                              fontFamily: t.fontFamily,
                              fontSize: t.fontSizeSm,
                              fontWeight: 600,
                              color: t.colorTextDanger,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {fmtCurrency(e.amount)}
                          </div>
                        </BreakdownRow>
                      ))
                    })()
                  )}
                </ReportBox>

                {/* Hóa đơn theo trạng thái */}
                <ReportBox style={{ gridColumn: "1 / -1" }}>
                  <ReportBoxTitle>Hóa đơn tạo trong kỳ</ReportBoxTitle>
                  {reportData.invoicesByStatus.length === 0 ? (
                    <ReportEmpty>Không có hóa đơn nào trong kỳ</ReportEmpty>
                  ) : (
                    <Table>
                      <TableHeader>
                        <tr>
                          <Th>Trạng thái</Th>
                          <Th align="right">Số lượng</Th>
                          <Th align="right">Giá trị hóa đơn</Th>
                        </tr>
                      </TableHeader>
                      <TableBody>
                        {reportData.invoicesByStatus.map((s) => (
                          <Tr key={s.status}>
                            <Td>
                              <Badge
                                appearance={
                                  INVOICE_STATUS_APPEARANCE[s.status] ??
                                  "neutral"
                                }
                              >
                                {INVOICE_STATUS_LABELS[s.status] ?? s.status}
                              </Badge>
                            </Td>
                            <Td align="right">{s.count}</Td>
                            <Td align="right">{fmtCurrency(s.amount)}</Td>
                          </Tr>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ReportBox>
              </ReportSection>
            </>
          )}
        </TabPanel>
      </Tabs>

      {/* ── Create Invoice Modal ─────────────────────────────────────────── */}
      <Modal
        open={invOpen}
        onOpenChange={setInvOpen}
        title="Tạo hóa đơn mới"
        size="lg"
      >
        <ModalBody>
          <Field label="Khách hàng (tùy chọn)">
            <Autocomplete
              placeholder="Tìm khách hàng..."
              options={custOptions}
              value={invCustomer?.value ?? ""}
              onChange={(v) => {
                const opt = custOptions.find((c) => c.value === v) ?? null
                setInvCustomer(opt)
              }}
              onSearch={searchCustomers}
            />
          </Field>

          <div
            style={{
              marginTop: 16,
              marginBottom: 6,
              fontFamily: t.fontFamily,
              fontWeight: 600,
              fontSize: t.fontSizeMd,
              color: t.colorText,
            }}
          >
            Dịch vụ / sản phẩm
          </div>
          {invItems.map((item, i) => (
            <ItemRow key={i}>
              <Field label={i === 0 ? "Mô tả" : ""}>
                <TextField
                  value={item.description}
                  onChange={(e) => updateItem(i, "description", e.target.value)}
                  placeholder="Tên dịch vụ / sản phẩm"
                />
              </Field>
              <Field label={i === 0 ? "SL" : ""}>
                <TextField
                  type="number"
                  min={1}
                  step={1}
                  value={String(item.quantity)}
                  onChange={(e) =>
                    updateItem(i, "quantity", Number(e.target.value))
                  }
                />
              </Field>
              <Field label={i === 0 ? "Đơn giá" : ""}>
                <TextField
                  type="number"
                  min={0}
                  value={String(item.unitPrice)}
                  onChange={(e) =>
                    updateItem(i, "unitPrice", Number(e.target.value))
                  }
                />
              </Field>
              <div
                style={{
                  paddingBottom: 2,
                  display: "flex",
                  alignItems: "flex-end",
                }}
              >
                {invItems.length > 1 && (
                  <Button
                    appearance="danger"
                    spacing="compact"
                    type="button"
                    onClick={() => removeItem(i)}
                  >
                    ×
                  </Button>
                )}
              </div>
            </ItemRow>
          ))}
          <Button
            type="button"
            appearance="subtle"
            spacing="compact"
            onClick={addItem}
            style={{ marginTop: 4 }}
          >
            <Plus size={13} /> Thêm dòng
          </Button>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              marginTop: 16,
              alignItems: "center",
            }}
          >
            <Field label="Giảm giá (VND)" style={{ maxWidth: 160, margin: 0 }}>
              <TextField
                type="number"
                min={0}
                value={invDiscount}
                onChange={(e) => setInvDiscount(e.target.value)}
              />
            </Field>
            <div
              style={{
                fontFamily: t.fontFamily,
                fontSize: t.fontSizeLg,
                fontWeight: 700,
                color: t.colorText,
              }}
            >
              Tổng: {fmtCurrency(invTotal2)}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            appearance="subtle"
            onClick={() => setInvOpen(false)}
          >
            Huỷ
          </Button>
          <Button
            type="button"
            appearance="primary"
            isDisabled={invSaving}
            onClick={onInvSave}
          >
            Tạo hóa đơn
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Payment Modal ────────────────────────────────────────────────── */}
      <Modal
        open={payOpen}
        onOpenChange={setPayOpen}
        title="Ghi nhận thanh toán"
        size="sm"
      >
        {payInvoice && (
          <form onSubmit={payForm.handleSubmit(onPaySave)}>
            <ModalBody>
              <div
                style={{
                  fontFamily: t.fontFamily,
                  fontSize: t.fontSizeSm,
                  color: t.colorTextSubtle,
                  marginBottom: 14,
                }}
              >
                HĐ: <strong>{payInvoice.invoiceNumber}</strong> &nbsp;|&nbsp;
                Tổng: <strong>{fmtCurrency(payInvoice.totalAmount)}</strong>{" "}
                &nbsp;|&nbsp; Còn lại:{" "}
                <strong style={{ color: t.colorTextDanger }}>
                  {fmtCurrency(payInvoice.totalAmount - payInvoice.paidAmount)}
                </strong>
              </div>
              <Field
                label="Số tiền thanh toán *"
                error={payErrors.amount?.message}
              >
                <TextField
                  {...payForm.register("amount")}
                  type="number"
                  min={1}
                />
              </Field>
              <Field
                label="Phương thức thanh toán *"
                error={payErrors.paymentMethod?.message}
                style={{ marginTop: 12 }}
              >
                <Select
                  value={payForm.watch("paymentMethod")}
                  onChange={(v) =>
                    payForm.setValue(
                      "paymentMethod",
                      v as "CASH" | "BANK" | "CARD" | "OTHER",
                    )
                  }
                  options={PAYMENT_METHOD_OPTIONS}
                />
              </Field>
              <Field label="Ghi chú" style={{ marginTop: 12 }}>
                <TextField
                  {...payForm.register("note")}
                  placeholder="Ghi chú (tùy chọn)"
                />
              </Field>
            </ModalBody>
            <ModalFooter>
              <Button
                type="button"
                appearance="subtle"
                onClick={() => setPayOpen(false)}
              >
                Huỷ
              </Button>
              <Button type="submit" appearance="primary" isDisabled={paySaving}>
                Lưu thanh toán
              </Button>
            </ModalFooter>
          </form>
        )}
      </Modal>

      {/* ── Create Expense Modal ─────────────────────────────────────────── */}
      <Modal
        open={expOpen}
        onOpenChange={setExpOpen}
        title="Ghi nhận chi phí"
        size="sm"
      >
        <form onSubmit={expForm.handleSubmit(onExpSave)}>
          <ModalBody>
            <Field label="Danh mục *" error={expErrors.category?.message}>
              <Select
                value={expForm.watch("category")}
                onChange={(v) => expForm.setValue("category", v as string)}
                options={EXPENSE_CATEGORY_OPTIONS}
              />
            </Field>
            <Field label="Mô tả" style={{ marginTop: 12 }}>
              <TextField
                {...expForm.register("description")}
                placeholder="Diễn giải chi phí"
              />
            </Field>
            <Field
              label="Số tiền (VND) *"
              error={expErrors.amount?.message}
              style={{ marginTop: 12 }}
            >
              <TextField
                {...expForm.register("amount")}
                type="number"
                min={0}
                placeholder="0"
              />
            </Field>
            <Field
              label="Ngày chi *"
              error={expErrors.paidAt?.message}
              style={{ marginTop: 12 }}
            >
              <TextField {...expForm.register("paidAt")} type="date" />
            </Field>
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              appearance="subtle"
              onClick={() => setExpOpen(false)}
            >
              Huỷ
            </Button>
            <Button type="submit" appearance="primary" isDisabled={expSaving}>
              Lưu chi phí
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  )
}
