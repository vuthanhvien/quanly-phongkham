import { useDelete, useList } from "@refinedev/core"
import {
  AppstoreOutlined,
  AuditOutlined,
  CopyOutlined,
  ClearOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FullscreenOutlined,
  ImportOutlined,
  MoreOutlined,
  PhoneOutlined,
  PrinterOutlined,
  SwapOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserAddOutlined,
} from "@ant-design/icons"
import {
  Button,
  Card,
  Checkbox,
  Dropdown,
  Form,
  Grid,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Typography,
  message,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { useEffect, useMemo, useState, type Key } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { api } from "../api"
import { printHtmlInPlace } from "../utils/printHtml"
import { hasActionAccess, hasResourceAccess } from "../access"
import { FileUploadPanel } from "../components/FileUploadPanel"
import { RecordFormContent } from "../components/RecordFormContent"
import { RecordValueView } from "../components/RecordValueView"
import { ServiceOrderForm } from "../components/ServiceOrderForm"
import { ProductForm } from "../components/ProductForm"
import { StockBatchForm } from "../components/StockBatchForm"
import { CustomField, entityLabels, normalizeSelectOption } from "../models"
import { RecordDetailPage } from "./RecordDetailPage"
import { displayValue, FileLookupMap, getRelationSpec, hasFileField, loadFileLookupMap, LookupMap, resolveRecordFieldValue } from "../relations"
import { getApiErrorMessage } from "../utils/apiError"
import { CMS_DATA_REFRESH_EVENT, type CmsDataRefreshDetail } from "../utils/dataRefresh"
import * as XLSX from "xlsx"
import {
  FieldLayoutConfig,
  getFieldCatalog,
  getStoredUserRole,
  getVisibleFieldConfigs,
  ViewSettingRecord,
} from "../view-settings"

export function RecordListPage() {
  const screens = Grid.useBreakpoint()
  const { resource = "customers" } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState("")
  const [advancedSearch, setAdvancedSearch] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, { operator: string; value?: string | number }>>({})
  const [recordStatus, setRecordStatus] = useState<"active" | "archived">("active")
  const [detailRefreshKey, setDetailRefreshKey] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [displayFields, setDisplayFields] = useState<FieldLayoutConfig[]>([])
  const [templates, setTemplates] = useState<
    Array<{ id: string; name: string; templateType?: string; isActive?: boolean }>
  >([])
  const [printTarget, setPrintTarget] = useState<{ recordId: string; templateId?: string } | null>(null)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [duplicateValues, setDuplicateValues] = useState<Record<string, unknown> | undefined>(undefined)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)
  const [lookups, setLookups] = useState<LookupMap>({})
  const [fileLookups, setFileLookups] = useState<FileLookupMap>({})
  const [relatedQuickView, setRelatedQuickView] = useState<{ resource: string; id: string } | null>(null)
  const [doctorFilter, setDoctorFilter] = useState<string | undefined>(undefined)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [archiveSelectedOpen, setArchiveSelectedOpen] = useState(false)
  const [archivingSelected, setArchivingSelected] = useState(false)
  const [cloningSelected, setCloningSelected] = useState(false)
  const [staffAccountStaff, setStaffAccountStaff] = useState<Record<string, any> | null>(null)
  const [staffAccountSubmitting, setStaffAccountSubmitting] = useState(false)
  const [staffAccountForm] = Form.useForm()
  const advancedFilterPayload = useMemo(() => {
    const filters = Object.entries(advancedFilters)
      .filter(([, filter]) => filter.value !== undefined && filter.value !== null && String(filter.value).trim() !== "")
      .map(([field, filter]) => ({ field, operator: filter.operator, value: filter.value }))
    return filters.length > 0 ? JSON.stringify(filters) : ""
  }, [advancedFilters])
  const query = useList({
    resource,
    pagination: { currentPage, pageSize },
    filters: [
      { field: "search", operator: "contains" as const, value: search },
      ...(advancedSearch && advancedFilterPayload ? [{ field: "advanced", operator: "eq" as const, value: advancedFilterPayload }] : []),
      { field: "isArchived", operator: "eq" as const, value: recordStatus === "archived" },
      ...(resource === "appointments" && doctorFilter ? [{ field: "doctorStaffId", operator: "eq" as const, value: doctorFilter }] : []),
    ],
  }) as any
  const response = query.query?.data || query.data?.data || query.result
  const rows = response?.data || []
  const total = response?.total || 0
  const loading = query.query?.isLoading || query.isLoading
  const detailId = searchParams.get("detail")
  const { mutate: deleteRecord } = useDelete()
  const refresh = () => query.query?.refetch?.() || query.refetch?.()
  const refreshData = () => {
    void refresh()
    if (detailId) setDetailRefreshKey((value) => value + 1)
  }

  useEffect(() => {
    const onDataRefresh = (event: Event) => {
      const targetResource = (event as CustomEvent<CmsDataRefreshDetail>).detail?.resource
      if (targetResource && targetResource !== resource) return
      refreshData()
    }
    window.addEventListener(CMS_DATA_REFRESH_EVENT, onDataRefresh)
    return () => window.removeEventListener(CMS_DATA_REFRESH_EVENT, onDataRefresh)
  }, [resource, detailId, query])
  const tableRows = useMemo(
    () => resource === "units" ? buildUnitTree(rows as Record<string, any>[]) : rows,
    [resource, rows],
  )

  useEffect(() => {
    setCurrentPage(1)
    setCreating(false)
    setEditingId(null)
    setDuplicateValues(undefined)
    setDuplicatingId(null)
    setDoctorFilter(undefined)
    setRecordStatus("active")
    setAdvancedSearch(false)
    setAdvancedFilters({})
    setSelectedRowKeys([])
    if (detailId) {
      const nextParams = new URLSearchParams(searchParams)
      nextParams.delete("detail")
      setSearchParams(nextParams, { replace: true })
    }
  }, [resource])

  function updateAdvancedFilter(field: FieldLayoutConfig, next: Partial<{ operator: string; value?: string | number }>) {
    setCurrentPage(1)
    setAdvancedFilters((current) => {
      const previous = current[field.key] || { operator: defaultAdvancedOperator(field) }
      const updated = { ...previous, ...next }
      if (updated.value === undefined || updated.value === null || String(updated.value).trim() === "") {
        const { [field.key]: _removed, ...rest } = current
        return rest
      }
      return { ...current, [field.key]: updated }
    })
  }

  function renderAdvancedFilter(field: FieldLayoutConfig) {
    const current = advancedFilters[field.key] || { operator: defaultAdvancedOperator(field) }
    const selectOptions = (field.options || []).map(normalizeSelectOption)
    const isOptionField = (field.type === "select" || field.type === "multi-select") && selectOptions.length > 0
    const isRelation = Boolean(getRelationSpec(field))

    return (
      <div className="advanced-column-filter" onClick={(event) => event.stopPropagation()}>
        {isOptionField ? (
          <Select
            allowClear
            aria-label={`Lọc ${field.label}`}
            className="advanced-column-value"
            options={selectOptions}
            placeholder="Chọn"
            size="small"
            value={current.value}
            onChange={(value) => updateAdvancedFilter(field, { operator: "eq", value })}
          />
        ) : field.type === "number" ? (
          <Input
            aria-label={`Lọc ${field.label}`}
            className="advanced-column-value"
            placeholder="> 12, >= 10"
            size="small"
            value={String(current.value || "")}
            onChange={(event) => updateAdvancedFilter(field, { operator: "number", value: event.target.value })}
          />
        ) : field.type === "date" || field.type === "datetime" ? (
          <Input
            aria-label={`Lọc ${field.label}`}
            className="advanced-column-value"
            size="small"
            type="date"
            value={String(current.value || "")}
            onChange={(event) => updateAdvancedFilter(field, { value: event.target.value })}
          />
        ) : (
          <Input
            allowClear
            aria-label={`Lọc ${field.label}`}
            className="advanced-column-value"
            placeholder={isRelation ? "Tên / mã" : "Tìm trong cột"}
            size="small"
            value={String(current.value || "")}
            onChange={(event) => updateAdvancedFilter(field, { value: event.target.value })}
          />
        )}
      </div>
    )
  }

  useEffect(() => {
    Promise.all([
      api.get("/settings/custom-fields", { params: { entityType: resource } }),
      api.get("/settings/views", { params: { entityType: resource } }),
      api.get("/settings/print-templates", {
        params: { entityType: resource },
      }),
    ])
      .then(([fields, views, prints]) => {
        const customFields = fields.data.data.filter(
          (field: CustomField) => field.isActive,
        )
        const catalog = getFieldCatalog(resource, customFields)
        const tableFields = getVisibleFieldConfigs(
          catalog,
          views.data.data as ViewSettingRecord[],
          "TABLE",
          getStoredUserRole(),
        )
        setDisplayFields(tableFields)
        setTemplates(
          (prints.data.data || []).filter(
            (template: { isActive?: boolean }) => template.isActive !== false,
          ),
        )
        return hasFileField(tableFields) ? loadFileLookupMap() : Promise.resolve({})
      })
      .then((nextFileLookups) => {
        setLookups({})
        setFileLookups(nextFileLookups)
      })
  }, [resource])

  const columns: ColumnsType<Record<string, any>> = useMemo(
    () => [
      ...displayFields.map((field) => ({
        title: advancedSearch ? (
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <span>{field.label}</span>
            {renderAdvancedFilter(field)}
          </Space>
        ) : field.label,
        dataIndex: field.key,
        key: field.key,
        width: field.tableWidth,
        render: (_: unknown, row: Record<string, any>) => (
          <Space size={4} wrap>
            <RecordValueView
              compact
              field={field}
              fileLookups={fileLookups}
              lookups={lookups}
              onRelationClick={(targetResource, id) => {
                if (!hasResourceAccess(targetResource)) return
                setRelatedQuickView({ resource: targetResource, id })
              }}
              value={resolveRecordFieldValue(row, field)}
            />
          </Space>
        ),
      })),
      ...(resource === "staff" ? [{
        title: "Tài khoản liên kết",
        key: "linkedAccount",
        width: 230,
        render: (_: unknown, row: Record<string, any>) => {
          const account = row.linkedAccount as { email?: string; username?: string; role?: string; isActive?: boolean } | undefined
          return account ? (
            <Space direction="vertical" size={0}>
              <Typography.Text>{account.email || account.username}</Typography.Text>
              <Tag color={account.isActive === false ? "default" : "green"}>{account.role || "STAFF"}{account.isActive === false ? " · Tạm khóa" : ""}</Tag>
            </Space>
          ) : <Typography.Text type="secondary">Chưa có tài khoản</Typography.Text>
        },
      }] : []),
      {
        title: "",
        key: "action",
        fixed: "right" as const,
        width: screens.md ? (resource === "units" ? 168 : 200) : 56,
        render: (_: unknown, row: Record<string, any>) => {
          const recordId = String(row.id)
          const isUnitRoot = resource === "units" && !row.baseUnitId
          const menuItems: any[] = []
          if (hasActionAccess(resource, "view")) menuItems.push({ key: "quick-view", icon: <EyeOutlined />, label: "Xem chi tiết", onClick: () => openDetail(recordId) })
          if (resource === "projects" && recordStatus === "active") menuItems.push({ key: "board", icon: <AppstoreOutlined />, label: "Mở Kanban", onClick: () => navigate(`/projects/${recordId}/board`) })
          if (hasActionAccess(resource, "view")) menuItems.push({ key: "full-view", icon: <FullscreenOutlined />, label: "Xem đầy đủ", onClick: () => navigate(`/${resource}/${recordId}/full`) })
          if (recordStatus === "active" && hasActionAccess(resource, "update")) menuItems.push({ key: "edit", icon: <EditOutlined />, label: "Chỉnh sửa", onClick: () => setEditingId(recordId) })
          if (isUnitRoot && recordStatus === "active" && hasActionAccess(resource, "create")) menuItems.push({ key: "add-child", icon: <PlusOutlined />, label: "Thêm đơn vị quy đổi", onClick: () => createChildUnit(recordId) })
          if (recordStatus === "active" && hasActionAccess(resource, "create") && resource !== "files") menuItems.push({ key: "copy", icon: <CopyOutlined />, label: "Nhân bản", onClick: () => void duplicateRecord(recordId) })
          if (resource === "customers" && hasActionAccess(resource, "reveal-phone")) menuItems.push({ key: "phone", icon: <PhoneOutlined />, label: "Xem số điện thoại", onClick: () => void revealPhone(recordId) })
          if (resource === "leads" && !row.convertedCustomerId && hasActionAccess(resource, "convert-to-customer")) menuItems.push({ key: "convert", icon: <SwapOutlined />, label: "Chuyển thành khách hàng", onClick: () => void convertLead(recordId) })
          if (resource === "staff" && !row.linkedAccount && recordStatus === "active" && hasActionAccess("user-accounts", "create")) menuItems.push({ key: "create-account", icon: <UserAddOutlined />, label: "Tạo tài khoản", onClick: () => openStaffAccountModal(row) })
          if (["invoices", "expenses", "payrolls"].includes(resource) && hasActionAccess(resource, "generate-accounting-voucher")) menuItems.push({ key: "voucher", icon: <AuditOutlined />, label: "Tạo chứng từ kế toán", onClick: () => void generateAccountingVoucher(resource, recordId) })
          if (resource === "accounting-vouchers" && row.status !== "POSTED" && hasActionAccess(resource, "post")) menuItems.push({ key: "post", icon: <AuditOutlined />, label: "Ghi sổ", onClick: () => void postAccountingVoucher(recordId) })
          if (resource === "accounting-vouchers" && row.status === "POSTED" && hasActionAccess(resource, "unpost")) menuItems.push({ key: "unpost", icon: <SwapOutlined />, label: "Bỏ ghi sổ", onClick: () => void unpostAccountingVoucher(recordId) })
          if (templates.length > 0 && hasActionAccess(resource, "print")) menuItems.push({ key: "print", icon: <PrinterOutlined />, label: "In biểu mẫu", onClick: () => openPrintTemplatePicker(recordId) })
          if (recordStatus === "active" && hasActionAccess(resource, "delete")) menuItems.push({ key: "archive", danger: true, icon: <DeleteOutlined />, label: "Lưu trữ", onClick: () => Modal.confirm({ title: "Lưu trữ bản ghi này?", content: "Bản ghi sẽ được chuyển vào tab Lưu trữ.", okText: "Lưu trữ", okButtonProps: { danger: true }, onOk: () => new Promise<void>((resolve) => deleteRecord({ resource, id: row.id }, { onSuccess: () => { message.success("Đã lưu trữ"); refresh(); resolve() }, onError: () => resolve() })) }) })
          return <>
          <span className="record-row-actions-mobile"><Dropdown menu={{ items: menuItems }} trigger={["click"]}><Button type="text" icon={<MoreOutlined />} aria-label="Thao tác" /></Dropdown></span>
          <Space className="record-row-actions-desktop" size={2}>
            {hasActionAccess(resource, "view") && (
              <Tooltip title="Xem chi tiết">
                <Button icon={<EyeOutlined />} type="text" onClick={() => openDetail(recordId)} />
              </Tooltip>
            )}
            {resource === "projects" && recordStatus === "active" && (
              <Tooltip title="Mở Kanban">
                <Button icon={<AppstoreOutlined />} type="text" onClick={() => navigate(`/projects/${recordId}/board`)} />
              </Tooltip>
            )}
            {hasActionAccess(resource, "view") && (
              <Tooltip title="Xem đầy đủ">
                <Button icon={<FullscreenOutlined />} type="text" onClick={() => navigate(`/${resource}/${recordId}/full`)} />
              </Tooltip>
            )}
            {recordStatus === "active" && hasActionAccess(resource, "update") && (
              <Tooltip title="Chỉnh sửa">
                <Button icon={<EditOutlined />} type="text" onClick={() => setEditingId(recordId)} />
              </Tooltip>
            )}
            {isUnitRoot && recordStatus === "active" && hasActionAccess(resource, "create") && (
              <Tooltip title="Thêm đơn vị quy đổi">
                <Button icon={<PlusOutlined />} type="text" onClick={() => createChildUnit(recordId)} />
              </Tooltip>
            )}
            {recordStatus === "active" && hasActionAccess(resource, "create") && resource !== "files" && (
              <Tooltip title="Nhân bản">
                <Button
                  icon={<CopyOutlined />}
                  loading={duplicatingId === recordId}
                  type="text"
                  onClick={() => void duplicateRecord(recordId)}
                />
              </Tooltip>
            )}
            {resource === "customers" && hasActionAccess(resource, "reveal-phone") && (
              <Tooltip title="Xem số điện thoại">
                <Button icon={<PhoneOutlined />} type="text" onClick={() => revealPhone(row.id)} />
              </Tooltip>
            )}
            {resource === "leads" && !row.convertedCustomerId && hasActionAccess(resource, "convert-to-customer") && (
              <Tooltip title="Chuyển thành khách hàng">
                <Button icon={<SwapOutlined />} type="text" onClick={() => convertLead(row.id)} />
              </Tooltip>
            )}
            {resource === "staff" && !row.linkedAccount && recordStatus === "active" && hasActionAccess("user-accounts", "create") && (
              <Tooltip title="Tạo tài khoản liên kết">
                <Button icon={<UserAddOutlined />} type="text" onClick={() => openStaffAccountModal(row)} />
              </Tooltip>
            )}
            {["invoices", "expenses", "payrolls"].includes(resource) && hasActionAccess(resource, "generate-accounting-voucher") && (
              <Tooltip title="Tạo chứng từ kế toán">
                <Button icon={<AuditOutlined />} type="text" onClick={() => generateAccountingVoucher(resource, row.id)} />
              </Tooltip>
            )}
            {resource === "accounting-vouchers" && row.status !== "POSTED" && hasActionAccess(resource, "post") && (
              <Tooltip title="Ghi sổ">
                <Button icon={<AuditOutlined />} type="text" onClick={() => postAccountingVoucher(row.id)} />
              </Tooltip>
            )}
            {resource === "accounting-vouchers" && row.status === "POSTED" && hasActionAccess(resource, "unpost") && (
              <Tooltip title="Bỏ ghi sổ">
                <Button icon={<SwapOutlined />} type="text" onClick={() => unpostAccountingVoucher(row.id)} />
              </Tooltip>
            )}
            {templates.length > 0 && hasActionAccess(resource, "print") && (
              <Tooltip title="In biểu mẫu">
                <Button
                  icon={<PrinterOutlined />}
                  type="text"
                  onClick={() => openPrintTemplatePicker(recordId)}
                />
              </Tooltip>
            )}
            {recordStatus === "active" && hasActionAccess(resource, "delete") && (
              <Popconfirm
                title="Lưu trữ bản ghi này? Bản ghi chỉ bị ẩn trên giao diện này, không bị xóa khỏi cơ sở dữ liệu."
                onConfirm={() =>
                  deleteRecord(
                    { resource, id: row.id },
                    {
                      onSuccess: () => {
                        message.success("Đã lưu trữ")
                        refresh()
                      },
                    },
                  )
                }
              >
                <Tooltip title="Lưu trữ bản ghi">
                  <Button danger icon={<DeleteOutlined />} type="text" />
                </Tooltip>
              </Popconfirm>
            )}
          </Space></>
        },
      },
    ],
    [advancedFilters, advancedSearch, displayFields, resource, recordStatus, templates, lookups, fileLookups, screens.md],
  )

  const doctorOptions = useMemo(
    () =>
      Object.entries(lookups["staff-doctor"] || {}).map(([value, label]) => ({
        value,
        label,
      })),
    [lookups],
  )

  async function printRecord(template: { id: string; templateType?: string }, recordId: string) {
    if (template.templateType === "DOCX") {
      const response = await api.get(`/settings/print-templates/${template.id}/docx/${recordId}`, { responseType: "blob" })
      const url = URL.createObjectURL(response.data)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = "mau-in.docx"
      anchor.click()
      URL.revokeObjectURL(url)
      return
    }
    if (template.templateType === "PDF") {
      const response = await api.get(`/settings/print-templates/${template.id}/pdf/${recordId}`, { responseType: "blob" })
      const url = URL.createObjectURL(response.data)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = "mau-in.pdf"
      anchor.click()
      URL.revokeObjectURL(url)
      return
    }
    const html = (
      await api.get(
        `/settings/print-templates/${template.id}/render/${recordId}`,
        { responseType: "text" },
      )
    ).data
    printHtmlInPlace(html, "Mẫu in")
  }

  function openPrintTemplatePicker(recordId: string) {
    if (templates.length === 0) {
      message.info("Chưa có mẫu in đang sử dụng")
      return
    }
    setPrintTarget({ recordId, templateId: templates[0].id })
  }

  function confirmPrintTemplate() {
    if (!printTarget?.templateId) return
    const template = templates.find((item) => item.id === printTarget.templateId)
    if (!template) {
      message.error("Không tìm thấy mẫu in đã chọn")
      return
    }
    const recordId = printTarget.recordId
    setPrintTarget(null)
    void printRecord(template, recordId)
  }

  async function revealPhone(recordId: string) {
    const response = await api.post(
      `/records/customers/${recordId}/reveal-phone`,
    )
    message.info(`Số điện thoại: ${response.data.data.phone}`)
  }

  async function convertLead(recordId: string) {
    const response = await api.post(`/records/leads/${recordId}/convert-to-customer`)
    message.success("Đã chuyển khách tiềm năng thành khách hàng")
    refresh()
    navigate(`/customers?detail=${response.data.data.id}`)
  }

  function openStaffAccountModal(staff: Record<string, any>) {
    setStaffAccountStaff(staff)
    staffAccountForm.setFieldsValue({
      email: staff.email || "",
      username: String(staff.code || "").toLowerCase(),
      role: ["ADMIN", "DOCTOR", "STAFF"].includes(String(staff.type || "").toUpperCase()) ? String(staff.type).toUpperCase() : "STAFF",
      password: "",
    })
  }

  async function createStaffAccount(values: { email: string; username?: string; password: string; role: string }) {
    if (!staffAccountStaff) return
    setStaffAccountSubmitting(true)
    try {
      await api.post(`/records/staff/${staffAccountStaff.id}/create-account`, values)
      message.success("Đã tạo tài khoản liên kết")
      setStaffAccountStaff(null)
      staffAccountForm.resetFields()
      refresh()
    } finally {
      setStaffAccountSubmitting(false)
    }
  }

  async function duplicateRecord(recordId: string) {
    setDuplicatingId(recordId)
    try {
      const response = await api.get(`/records/${resource}/${recordId}`, { params: { include: '*' } })
      const preparedValues = buildDuplicateValues(response.data.data)
      setEditingId(null)
      setDuplicateValues(preparedValues)
      setCreating(true)
    } catch (error: any) {
      message.error(getApiErrorMessage(error, "Không thể nhân bản bản ghi"))
    } finally {
      setDuplicatingId(null)
    }
  }

  function createChildUnit(baseUnitId: string) {
    setEditingId(null)
    setDuplicateValues({ baseUnitId, conversionFactor: 1 })
    setCreating(true)
  }

  async function generateAccountingVoucher(currentResource: string, recordId: string) {
    await api.post(`/records/${currentResource}/${recordId}/generate-accounting-voucher`)
    message.success("Đã tạo chứng từ kế toán")
  }

  async function postAccountingVoucher(recordId: string) {
    await api.post(`/records/accounting-vouchers/${recordId}/post`)
    message.success("Đã ghi sổ chứng từ")
    refresh()
  }

  async function unpostAccountingVoucher(recordId: string) {
    await api.post(`/records/accounting-vouchers/${recordId}/unpost`)
    message.success("Đã bỏ ghi sổ chứng từ")
    refresh()
  }

  async function archiveSelected() {
    const ids = selectedRowKeys.map(String)
    if (!ids.length) return
    setArchivingSelected(true)
    try {
      const results = await Promise.allSettled(ids.map((id) => api.delete(`/records/${resource}/${id}`)))
      const failedIds = ids.filter((_id, index) => results[index].status === "rejected")
      const archivedCount = ids.length - failedIds.length
      setSelectedRowKeys(failedIds)
      if (archivedCount > 0) {
        message.success(`Đã lưu trữ ${archivedCount} bản ghi`)
        refresh()
      }
      if (failedIds.length > 0) {
        message.error(`Không thể lưu trữ ${failedIds.length} bản ghi. Vui lòng thử lại.`)
      }
      if (failedIds.length === 0) setArchiveSelectedOpen(false)
    } finally {
      setArchivingSelected(false)
    }
  }

  async function exportSelectedRecords() {
    const visibleRowsById = new Map(rows.map((row: Record<string, any>) => [String(row.id), row]))
    const selectedRows = await Promise.all(selectedRowKeys.map(async (selectedId) => {
      const id = String(selectedId)
      if (visibleRowsById.has(id)) return visibleRowsById.get(id)!
      return (await api.get(`/records/${resource}/${id}`, { params: { include: '*' } })).data.data
    }))
    const exportRows = selectedRows.map((row: Record<string, any>) =>
      Object.fromEntries(displayFields.map((field) => [field.label, displayValue(field, resolveRecordFieldValue(row, field), lookups)])),
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(exportRows), entityLabels[resource] || resource)
    XLSX.writeFile(workbook, `${resource}-selected.xlsx`)
  }

  async function cloneSelectedRecords() {
    const ids = selectedRowKeys.map(String)
    if (!ids.length) return
    setCloningSelected(true)
    try {
      const results = await Promise.allSettled(ids.map(async (id) => {
        const response = await api.get(`/records/${resource}/${id}`, { params: { include: '*' } })
        await api.post(`/records/${resource}`, buildDuplicateValues(response.data.data))
      }))
      const succeeded = results.filter((result) => result.status === "fulfilled").length
      if (succeeded > 0) {
        message.success(`Đã clone ${succeeded} bản ghi`)
        refresh()
      }
      if (succeeded < ids.length) message.error(`Không thể clone ${ids.length - succeeded} bản ghi`)
    } finally {
      setCloningSelected(false)
    }
  }

  function openDetail(recordId: string) {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set("detail", recordId)
    setSearchParams(nextParams, { replace: true })
  }

  function closeDetail() {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete("detail")
    setSearchParams(nextParams, { replace: true })
  }

  return (
    <>
      <div className="page-header record-list-page-header">
        <div>
          <Typography.Title level={3}>
            {entityLabels[resource] || resource}
          </Typography.Title>
        </div>
        <Space wrap className="page-header-actions record-list-actions">
          <Button icon={<ReloadOutlined />} onClick={refreshData}>
            Làm mới dữ liệu
          </Button>
          <Input.Search
            allowClear
            className="page-search"
            placeholder="Tìm kiếm"
            onSearch={(value) => {
              setCurrentPage(1)
              setSearch(value)
            }}
          />
          <Checkbox
            checked={advancedSearch}
            onChange={(event) => {
              setAdvancedSearch(event.target.checked)
              if (!event.target.checked) setAdvancedFilters({})
              setCurrentPage(1)
            }}
          >
            Tìm kiếm nâng cao
          </Checkbox>
          {resource === "appointments" ? (
            <Select
              allowClear
              options={doctorOptions}
              placeholder="Lọc bác sĩ"
              style={{ minWidth: 220 }}
              value={doctorFilter}
              onChange={(value) => {
                setCurrentPage(1)
                setDoctorFilter(value)
              }}
            />
          ) : null}
          {recordStatus === "active" && hasActionAccess(resource, "delete") && selectedRowKeys.length > 0 ? (
            <Dropdown
              menu={{
                items: [
                  { key: "archive", danger: true, icon: <DeleteOutlined />, label: "Lưu trữ" },
                  { key: "export", icon: <DownloadOutlined />, label: "Xuất Excel" },
                  ...(hasActionAccess(resource, "create") ? [{ key: "clone", icon: <CopyOutlined />, label: "Nhân bản" }] : []),
                  { type: "divider" },
                  { key: "clear", icon: <ClearOutlined />, label: "Bỏ chọn tất cả" },
                ],
                onClick: ({ key }) => {
                  if (key === "archive") setArchiveSelectedOpen(true)
                  if (key === "export") void exportSelectedRecords()
                  if (key === "clone") void cloneSelectedRecords()
                  if (key === "clear") setSelectedRowKeys([])
                },
              }}
              trigger={["click"]}
            >
              <Button aria-label="Bản ghi đã chọn" className="mobile-icon-button" danger icon={<MoreOutlined />} loading={cloningSelected}>
                Đã chọn ({selectedRowKeys.length})
              </Button>
            </Dropdown>
          ) : null}
          {hasActionAccess(resource, "create") && !["files", "service-orders"].includes(resource) && (
            <Tooltip title="Mở màn hình import">
              <Button
                icon={<ImportOutlined />}
                className="mobile-icon-button"
                onClick={() => navigate(`/${resource}/import`)}
              >
                Import
              </Button>
            </Tooltip>
          )}
          {hasActionAccess(resource, "create") && (
            <Tooltip title="Tạo bản ghi mới">
              <Button
                className="primary-glow mobile-icon-button"
                aria-label={resource === "files" ? "Tải tệp lên" : "Thêm nhanh"}
                icon={<PlusOutlined />}
                type="primary"
                onClick={() => setCreating(true)}
              >
                {resource === "files" ? "Tải tệp lên" : "Thêm nhanh"}
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>
      <Tabs
        activeKey={recordStatus}
        className="record-status-tabs"
        items={[
          { key: "active", label: "Đang hoạt động" },
          { key: "archived", label: "Lưu trữ" },
        ]}
        onChange={(key) => {
          setRecordStatus(key as "active" | "archived")
          setCurrentPage(1)
          setSelectedRowKeys([])
        }}
      />
      <Card className="table-card">
        <Table
          columns={columns}
          dataSource={tableRows}
          key={`${resource}-${recordStatus}`}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100, 200],
            showTotal: (value) => `${value.toLocaleString("vi-VN")} bản ghi`,
            onChange: (page, nextPageSize) => {
              setCurrentPage(page)
              setPageSize(nextPageSize)
            },
          }}
          rowKey="id"
          expandable={resource === "units" ? { defaultExpandAllRows: true } : undefined}
          indentSize={28}
          rowSelection={recordStatus === "active" && hasActionAccess(resource, "delete") ? {
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            preserveSelectedRowKeys: true,
          } : undefined}
          scroll={{ x: "max-content" }}
        />
      </Card>
      <Modal
        destroyOnHidden
        okButtonProps={{ className: "primary-glow", type: "primary" }}
        okText="Tạo tài khoản"
        open={Boolean(staffAccountStaff)}
        title={`Tạo tài khoản${staffAccountStaff ? ` cho ${staffAccountStaff.fullName || staffAccountStaff.code}` : ""}`}
        confirmLoading={staffAccountSubmitting}
        onCancel={() => { setStaffAccountStaff(null); staffAccountForm.resetFields() }}
        onOk={() => void staffAccountForm.submit()}
      >
        <Form form={staffAccountForm} layout="vertical" onFinish={(values: { email: string; username?: string; password: string; role: string }) => void createStaffAccount(values)}>
          <Form.Item label="Email đăng nhập" name="email" rules={[{ required: true, type: "email", message: "Nhập email hợp lệ" }]}>
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item label="Tên đăng nhập" name="username">
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item label="Mật khẩu ban đầu" name="password" rules={[{ required: true, min: 6, message: "Mật khẩu tối thiểu 6 ký tự" }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item label="Vai trò hệ thống" name="role" rules={[{ required: true }]}>
            <Select options={[{ value: "STAFF", label: "Nhân viên" }, { value: "DOCTOR", label: "Bác sĩ" }, { value: "ADMIN", label: "Quản trị" }]} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        cancelText="Hủy"
        confirmLoading={archivingSelected}
        okButtonProps={{ danger: true }}
        okText="Lưu trữ"
        open={archiveSelectedOpen}
        title={`Lưu trữ ${selectedRowKeys.length} bản ghi đã chọn?`}
        onCancel={() => setArchiveSelectedOpen(false)}
        onOk={() => void archiveSelected()}
      >
        Các bản ghi chỉ bị ẩn, không bị xóa khỏi cơ sở dữ liệu.
      </Modal>
      <Modal
        destroyOnHidden
        open={Boolean(printTarget)}
        title="Chọn mẫu in"
        okText="In biểu mẫu"
        okButtonProps={{ disabled: !printTarget?.templateId }}
        onCancel={() => setPrintTarget(null)}
        onOk={confirmPrintTemplate}
      >
        <Typography.Paragraph type="secondary">
          Chọn biểu mẫu muốn in cho bản ghi này.
        </Typography.Paragraph>
        <Select
          showSearch
          optionFilterProp="label"
          placeholder="Chọn mẫu in"
          style={{ width: "100%" }}
          value={printTarget?.templateId}
          onChange={(templateId) =>
            setPrintTarget((current) =>
              current ? { ...current, templateId } : current,
            )
          }
          options={templates.map((template) => ({
            value: template.id,
            label: `${template.name}${["DOCX", "PDF"].includes(template.templateType || "") ? ` (${template.templateType})` : ""}`,
          }))}
        />
      </Modal>
      <Modal
        className="quick-drawer"
        centered
        destroyOnHidden
        maskClosable={false}
        open={Boolean(detailId)}
        title={
          <div className="quick-drawer-titlebar">
            <Typography.Text strong>{`Chi tiết ${entityLabels[resource] || resource}`}</Typography.Text>
            {detailId ? (
              <Space size={8}>
                <Tooltip title="Xem đầy đủ">
                  <Button ghost icon={<FullscreenOutlined />} onClick={() => navigate(`/${resource}/${detailId}/full`)} />
                </Tooltip>
                <Tooltip title="Làm mới dữ liệu">
                  <Button icon={<ReloadOutlined />} onClick={() => {
                    refreshData()
                  }} />
                </Tooltip>
                {hasActionAccess(resource, "update") && (
                  <Button
                    className="primary-glow"
                    icon={<EditOutlined />}
                    type="primary"
                    onClick={() => {
                      closeDetail()
                      setEditingId(detailId)
                    }}
                  >
                    Sửa hồ sơ
                  </Button>
                )}
              </Space>
            ) : null}
          </div>
        }
        footer={null}
        width={screens.md ? (resource === "service-orders" ? 1100 : 900) : "calc(100vw - 16px)"}
        onCancel={closeDetail}
      >
        {detailId ? (
          <RecordDetailPage
            embedded
            id={detailId}
            refreshKey={detailRefreshKey}
            resource={resource}
            onClose={closeDetail}
          />
        ) : null}
      </Modal>
      <Modal
        className="quick-drawer"
        destroyOnHidden
        maskClosable={false}
        open={Boolean(relatedQuickView)}
        title={
          <div className="quick-drawer-titlebar">
            <Typography.Text strong>{relatedQuickView ? `Chi tiết ${entityLabels[relatedQuickView.resource] || relatedQuickView.resource}` : "Chi tiết liên kết"}</Typography.Text>
            {relatedQuickView ? (
              <Space size={8}>
                <Tooltip title="Xem đầy đủ">
                  <Button ghost icon={<FullscreenOutlined />} onClick={() => navigate(`/${relatedQuickView.resource}/${relatedQuickView.id}/full`)} />
                </Tooltip>
                {hasActionAccess(relatedQuickView.resource, "update") && (
                  <Button
                    className="primary-glow"
                    icon={<EditOutlined />}
                    type="primary"
                    onClick={() => {
                      setEditingId(null)
                      setCreating(false)
                      navigate(`/${relatedQuickView.resource}/${relatedQuickView.id}/edit`)
                    }}
                  >
                    Sửa hồ sơ
                  </Button>
                )}
              </Space>
            ) : null}
          </div>
        }
        footer={null}
        width={screens.md ? 900 : "calc(100vw - 16px)"}
        onCancel={() => setRelatedQuickView(null)}
      >
        {relatedQuickView ? (
          <RecordDetailPage
            embedded
            id={relatedQuickView.id}
            resource={relatedQuickView.resource}
            onClose={() => setRelatedQuickView(null)}
          />
        ) : null}
      </Modal>
      <Modal
        className="quick-drawer"
        centered
        destroyOnHidden
        maskClosable={false}
        open={creating || Boolean(editingId)}
        title={editingId ? `Chỉnh sửa ${entityLabels[resource] || resource}` : `Thêm nhanh ${entityLabels[resource] || resource}`}
        width={screens.md ? (["service-orders", "stock-batches"].includes(resource) ? 1100 : 760) : "calc(100vw - 16px)"}
        footer={null}
        onCancel={() => {
          setCreating(false)
          setEditingId(null)
          setDuplicateValues(undefined)
        }}
      >
        {resource === "files" && !editingId ? (
          <FileUploadPanel
            onCancel={() => setCreating(false)}
            onSuccess={() => {
              setCreating(false)
              refresh()
            }}
          />
        ) : resource === "service-orders" ? (
          <ServiceOrderForm
            compact
            id={editingId || undefined}
            initialValues={editingId ? undefined : duplicateValues}
            onCancel={() => {
              setCreating(false)
              setEditingId(null)
              setDuplicateValues(undefined)
            }}
            onSuccess={() => {
              setCreating(false)
              setEditingId(null)
              setDuplicateValues(undefined)
              refresh()
            }}
          />
        ) : resource === "products" ? (
          <ProductForm
            compact
            id={editingId || undefined}
            initialValues={editingId ? undefined : duplicateValues}
            onCancel={() => { setCreating(false); setEditingId(null); setDuplicateValues(undefined) }}
            onSuccess={() => { setCreating(false); setEditingId(null); setDuplicateValues(undefined); refresh() }}
          />
        ) : resource === "stock-batches" && !editingId ? (
          <StockBatchForm
            compact
            onCancel={() => {
              setCreating(false)
              setEditingId(null)
              setDuplicateValues(undefined)
            }}
            onSuccess={() => {
              setCreating(false)
              setEditingId(null)
              setDuplicateValues(undefined)
              refresh()
            }}
          />
        ) : (
          <RecordFormContent
            compact
            id={editingId || undefined}
            initialValues={editingId ? undefined : duplicateValues}
            resource={resource}
            onCancel={() => {
              setCreating(false)
              setEditingId(null)
              setDuplicateValues(undefined)
            }}
            onSuccess={() => {
              setCreating(false)
              setEditingId(null)
              setDuplicateValues(undefined)
              refresh()
            }}
          />
        )}
      </Modal>
    </>
  )
}

function buildDuplicateValues(record: Record<string, unknown>) {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    deletedAt: _deletedAt,
    createdById: _createdById,
    updatedById: _updatedById,
    customFields,
    ...rest
  } = record

  const nextValues: Record<string, unknown> = {
    ...rest,
    ...((customFields as Record<string, unknown> | undefined) || {}),
  }

  if (typeof nextValues.code === "string" && nextValues.code.trim()) {
    nextValues.code = `${nextValues.code}-COPY`
  }
  if (typeof nextValues.slug === "string" && nextValues.slug.trim()) {
    nextValues.slug = `${nextValues.slug}-copy`
  }

  return nextValues
}

function defaultAdvancedOperator(field: FieldLayoutConfig) {
  if (field.type === 'number') return 'number'
  if (field.type === 'date' || field.type === 'datetime') return 'eq'
  return 'contains'
}

function buildUnitTree(rows: Record<string, any>[]) {
  const nodes = new Map<string, Record<string, any>>()
  rows.forEach((row) => nodes.set(String(row.id), { ...row, children: [] }))

  const roots: Record<string, any>[] = []
  rows.forEach((row) => {
    const node = nodes.get(String(row.id))!
    const parentId = String(row.baseUnitId || "")
    const parent = parentId ? nodes.get(parentId) : undefined
    if (parent && parent !== node) parent.children.push(node)
    else roots.push(node)
  })

  const byName = (left: Record<string, any>, right: Record<string, any>) =>
    String(left.name || left.id || "").localeCompare(String(right.name || right.id || ""), "vi")
  roots.sort(byName)
  nodes.forEach((node) => {
    if (node.children.length === 0) delete node.children
    else node.children.sort(byName)
  })
  return roots
}
