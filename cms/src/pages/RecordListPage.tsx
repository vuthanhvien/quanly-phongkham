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
  InboxOutlined,
  MinusCircleOutlined,
  MoreOutlined,
  PhoneOutlined,
  PrinterOutlined,
  SwapOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserAddOutlined,
  UserOutlined,
} from "@ant-design/icons"
import {
  Avatar,
  AutoComplete,
  Badge,
  Button,
  Card,
  Checkbox,
  Dropdown,
  Form,
  Grid,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tabs,
  Tooltip,
  Typography,
  message,
  type InputRef,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { useEffect, useMemo, useRef, useState, type Key } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { api, resolveFileUrl } from "../api"
import { printHtmlInPlace } from "../utils/printHtml"
import { hasActionAccess, hasResourceAccess, isCurrentUserAdmin } from "../access"
import { FileUploadPanel } from "../components/FileUploadPanel"
import { RecordFormContent } from "../components/RecordFormContent"
import { RecordValueView } from "../components/RecordValueView"
import { ServiceOrderForm } from "../components/ServiceOrderForm"
import { menuIcons } from "../components/Shell"
import { ProductForm } from "../components/ProductForm"
import { StockBatchForm } from "../components/StockBatchForm"
import { CustomField, entityLabels, normalizeSelectOption } from "../models"
import { RecordDetailPage } from "./RecordDetailPage"
import { displayValue, FileLookupMap, getRelationMetaMap, getRelationSpec, hasFileField, loadFileLookupMap, loadRelationOptions, LookupMap, resolveRecordFieldValue } from "../relations"
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

type SavedTableTab = {
  key: string
  label: string
  filters: Array<{ field: string; operator: string; value: string | number | string[] }>
}

function isSavedTableTab(value: unknown): value is SavedTableTab {
  if (!value || typeof value !== "object") return false
  const tab = value as Partial<SavedTableTab>
  return typeof tab.key === "string" && typeof tab.label === "string" && Array.isArray(tab.filters)
}

export function RecordListPage() {
  const screens = Grid.useBreakpoint()
  const { resource = "customers" } = useParams()
  const canManageTableTabs = isCurrentUserAdmin()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState("")
  const [advancedSearch, setAdvancedSearch] = useState(false)
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, { operator: string; value?: string | number }>>({})
  const [recordStatus, setRecordStatus] = useState<"active" | "archived">("active")
  const [tableTabs, setTableTabs] = useState<SavedTableTab[]>([])
  const [tableTabCounts, setTableTabCounts] = useState<Record<string, number>>({})
  const [tableTabsLoaded, setTableTabsLoaded] = useState(false)
  const initializedTableTabResource = useRef<string | undefined>(undefined)
  const [tableTabKey, setTableTabKey] = useState(() => searchParams.get("tab") || "active")
  const [tableTabModalOpen, setTableTabModalOpen] = useState(false)
  const [editingTableTab, setEditingTableTab] = useState<SavedTableTab | null>(null)
  const [tableTabForm] = Form.useForm<SavedTableTab>()
  const tableTabFilters = Form.useWatch("filters", tableTabForm) || []
  const [detailRefreshKey, setDetailRefreshKey] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sortField, setSortField] = useState(() => searchParams.get("sort") || "")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(() => searchParams.get("order") === "asc" ? "asc" : "desc")
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
  const [productCategoryNames, setProductCategoryNames] = useState<Record<string, string>>({})
  const [relatedQuickView, setRelatedQuickView] = useState<{ resource: string; id: string } | null>(null)
  const [doctorFilter, setDoctorFilter] = useState<string | undefined>(undefined)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [archiveSelectedOpen, setArchiveSelectedOpen] = useState(false)
  const [archivingSelected, setArchivingSelected] = useState(false)
  const [cloningSelected, setCloningSelected] = useState(false)
  const [staffAccountStaff, setStaffAccountStaff] = useState<Record<string, any> | null>(null)
  const [staffAccountSubmitting, setStaffAccountSubmitting] = useState(false)
  const [shortcutModifierHeld, setShortcutModifierHeld] = useState(false)
  const [staffAccountForm] = Form.useForm()
  const searchInputRef = useRef<InputRef>(null)
  const selectedTableTab = useMemo(() => tableTabs.find((tab) => tab.key === tableTabKey), [tableTabKey, tableTabs])
  const advancedFilterPayload = useMemo(() => {
    const filters = [
      ...(selectedTableTab?.filters || []),
      ...Object.entries(advancedFilters)
      .filter(([, filter]) => filter.value !== undefined && filter.value !== null && String(filter.value).trim() !== "")
      .map(([field, filter]) => ({ field, operator: filter.operator, value: filter.value })),
    ]
    return filters.length > 0 ? JSON.stringify(filters) : ""
  }, [advancedFilters, selectedTableTab])
  const query = useList({
    resource,
    pagination: { currentPage, pageSize },
    filters: [
      { field: "search", operator: "contains" as const, value: search },
      ...((advancedSearch || selectedTableTab) && advancedFilterPayload ? [{ field: "advanced", operator: "eq" as const, value: advancedFilterPayload }] : []),
      { field: "isArchived", operator: "eq" as const, value: recordStatus === "archived" },
      ...(sortField ? [{ field: "sort", operator: "eq" as const, value: sortField }, { field: "order", operator: "eq" as const, value: sortOrder }] : []),
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
  const canCreateRecord = hasActionAccess(resource, "create")
  const canImportRecords = canCreateRecord && !["files", "service-orders"].includes(resource)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  useEffect(() => {
    const setModifierState = (event: KeyboardEvent) => {
      setShortcutModifierHeld(event.ctrlKey || event.metaKey)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      setModifierState(event)
      if (!event.ctrlKey && !event.metaKey) return

      const key = event.key.toLowerCase()
      if (key === "b" && !event.altKey) {
        event.preventDefault()
        if (canCreateRecord && !creating && !editingId) setCreating(true)
        return
      }
      if (event.altKey) return
      if (key === "r") {
        event.preventDefault()
        refreshData()
        return
      }
      if (key === "f") {
        event.preventDefault()
        searchInputRef.current?.focus()
        return
      }
      if (key === "i" && canImportRecords) {
        event.preventDefault()
        navigate(`/${resource}/import`)
        return
      }
      if (event.key === ">" && currentPage < totalPages) {
        event.preventDefault()
        setCurrentPage((page) => Math.min(page + 1, totalPages))
        return
      }
      if (event.key === "<" && currentPage > 1) {
        event.preventDefault()
        setCurrentPage((page) => Math.max(page - 1, 1))
      }
    }
    const clearModifierState = () => setShortcutModifierHeld(false)

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", setModifierState)
    window.addEventListener("blur", clearModifierState)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", setModifierState)
      window.removeEventListener("blur", clearModifierState)
    }
  }, [canCreateRecord, canImportRecords, creating, currentPage, detailId, editingId, navigate, query, resource, totalPages])

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

  useEffect(() => {
    let active = true
    const countRequests = [
      { key: "active", filters: [] as SavedTableTab["filters"] },
      ...tableTabs,
    ]
    Promise.all(countRequests.map(async (tab) => {
      const response = await api.get(`/records/${resource}`, {
        params: {
          page: 1,
          pageSize: 1,
          include: "*",
          isArchived: false,
          advanced: tab.filters.length ? JSON.stringify(tab.filters) : undefined,
        },
      }).catch(() => ({ data: { total: 0 } }))
      return [tab.key, Number(response.data?.total || 0)] as const
    })).then((entries) => {
      if (active) setTableTabCounts(Object.fromEntries(entries))
    })
    return () => { active = false }
  }, [resource, tableTabs])

  useEffect(() => {
    if (resource !== "products") {
      setProductCategoryNames({})
      return
    }
    api.get("/product-categories")
      .then((response) => setProductCategoryNames(Object.fromEntries((response.data?.data || []).map((row: Record<string, unknown>) => [String(row.id), String(row.name || row.code || row.id)]))))
      .catch(() => setProductCategoryNames({}))
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
    setTableTabsLoaded(false)
    initializedTableTabResource.current = undefined
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
        const savedTabConfig = (views.data.data as ViewSettingRecord[]).find((view) => view.viewType === "TABLE_TABS" && view.role === "ALL")?.config?.tabs
        setTableTabs(Array.isArray(savedTabConfig) ? savedTabConfig.filter(isSavedTableTab) : [])
        setTableTabsLoaded(true)
        setTemplates(
          (prints.data.data || []).filter(
            (template: { isActive?: boolean }) => template.isActive !== false,
          ),
        )
        return Promise.all([
          hasFileField(tableFields) ? loadFileLookupMap() : Promise.resolve({}),
          loadRelationOptions(tableFields),
        ])
      })
      .then(([nextFileLookups, nextLookups]) => {
        setLookups(nextLookups)
        setFileLookups(nextFileLookups)
      })
  }, [resource])

  useEffect(() => {
    if (tableTabsLoaded && tableTabKey !== "active" && !tableTabs.some((tab) => tab.key === tableTabKey)) setTableTabKey("active")
  }, [tableTabKey, tableTabs, tableTabsLoaded])

  useEffect(() => {
    if (!tableTabsLoaded || initializedTableTabResource.current === resource) return
    initializedTableTabResource.current = resource
    const tabFromUrl = searchParams.get("tab") || "active"
    if (tabFromUrl !== "active" && tableTabs.some((tab) => tab.key === tabFromUrl)) setTableTabKey(tabFromUrl)
  }, [resource, searchParams, tableTabs, tableTabsLoaded])

  function selectTableTab(key: string) {
    setTableTabKey(key)
    setRecordStatus("active")
    setCurrentPage(1)
    setSelectedRowKeys([])
    const nextParams = new URLSearchParams(searchParams)
    if (key === "active") nextParams.delete("tab")
    else nextParams.set("tab", key)
    setSearchParams(nextParams, { replace: true })
  }

  function updateTableSort(field?: string, order?: "ascend" | "descend" | null) {
    const nextField = field && order ? field : ""
    const nextOrder: "asc" | "desc" = order === "ascend" ? "asc" : "desc"
    setSortField(nextField)
    setSortOrder(nextOrder)
    setCurrentPage(1)
    const nextParams = new URLSearchParams(searchParams)
    if (!nextField) {
      nextParams.delete("sort")
      nextParams.delete("order")
    } else {
      nextParams.set("sort", nextField)
      nextParams.set("order", nextOrder)
    }
    setSearchParams(nextParams, { replace: true })
  }

  async function saveTableTab(values: SavedTableTab) {
    const key = String(values.key || "").trim().replace(/[^a-zA-Z0-9_-]/g, "_")
    const label = String(values.label || "").trim()
    if (!key || !label) return
    if (key === "active" || key === "archived" || tableTabs.some((tab) => tab.key === key && tab.key !== editingTableTab?.key)) {
      message.error("Key tab đã tồn tại hoặc là key hệ thống")
      return
    }
    const filters = (values.filters || []).filter((filter) => filter.field && filter.operator && filter.value !== undefined && String(filter.value).trim() !== "")
    const nextTab = { key, label, filters }
    const nextTabs = editingTableTab
      ? tableTabs.map((tab) => tab.key === editingTableTab.key ? nextTab : tab)
      : [...tableTabs, nextTab]
    await api.put(`/settings/views/${resource}/TABLE_TABS`, { role: "ALL", config: { tabs: nextTabs } })
    setTableTabs(nextTabs)
    selectTableTab(key)
    setTableTabModalOpen(false)
    setEditingTableTab(null)
    tableTabForm.resetFields()
    message.success(editingTableTab ? "Đã cập nhật tab lọc" : "Đã tạo tab lọc")
  }

  const columns: ColumnsType<Record<string, any>> = useMemo(
    () => [
      ...displayFields.map((field) => ({
        title: advancedSearch ? (
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Tooltip title={field.label}>
              <span className="record-table-column-title">{field.label}</span>
            </Tooltip>
            {renderAdvancedFilter(field)}
          </Space>
        ) : (
          <Tooltip title={field.label}>
            <span className="record-table-column-title">{field.label}</span>
          </Tooltip>
        ),
        dataIndex: field.key,
        key: field.key,
        width: field.tableWidth,
        align: field.type === "number" ? "right" as const : undefined,
        sorter: true,
        sortOrder: (sortField === field.key ? (sortOrder === "asc" ? "ascend" : "descend") : undefined) as "ascend" | "descend" | undefined,
        render: (_: unknown, row: Record<string, any>) => {
          if (field.key === "code") {
            const code = resolveRecordFieldValue(row, field)
            return code ? (
              <Button
                className="record-code-link"
                type="link"
                onClick={() => openDetail(String(row.id))}
              >
                {String(code)}
              </Button>
            ) : "—"
          }
          return (
            <Space size={4} wrap>
              {resource === "projects" && field.key === "memberStaffIds"
              ? <ProjectMemberAvatars memberIds={resolveRecordFieldValue(row, field)} lookups={lookups} />
              : resource === "products" && field.key === "category"
              ? (productCategoryNames[String(resolveRecordFieldValue(row, field) || "")] || "—")
              : <RecordValueView
              compact
              field={field}
              fileLookups={fileLookups}
              lookups={lookups}
              onRelationClick={(targetResource, id) => {
                if (!hasResourceAccess(targetResource)) return
                setRelatedQuickView({ resource: targetResource, id })
              }}
              value={resolveRecordFieldValue(row, field)}
            />}
            </Space>
          )
        },
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
        width: screens.md ? 120 : 56,
        render: (_: unknown, row: Record<string, any>) => {
          const recordId = String(row.id)
          const isUnitRoot = resource === "units" && !row.baseUnitId
          const isSystemAdminAccount = resource === "user-accounts" && String(row.username || "").toLowerCase() === "admin-system"
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
          if (recordStatus === "active" && !isSystemAdminAccount && hasActionAccess(resource, "delete")) menuItems.push({ key: "archive", danger: true, icon: <DeleteOutlined />, label: "Lưu trữ", onClick: () => Modal.confirm({ title: "Lưu trữ bản ghi này?", content: "Bản ghi sẽ được chuyển vào tab Lưu trữ.", okText: "Lưu trữ", okButtonProps: { danger: true }, onOk: () => new Promise<void>((resolve) => deleteRecord({ resource, id: row.id }, { onSuccess: () => { message.success("Đã lưu trữ"); refresh(); resolve() }, onError: () => resolve() })) }) })
          const overflowMenuItems = menuItems.filter((item) => !["full-view", "edit"].includes(String(item.key)))
          return <>
          <span className="record-row-actions-mobile"><Dropdown menu={{ items: menuItems }} trigger={["click"]}><Button type="text" icon={<MoreOutlined />} aria-label="Thao tác" /></Dropdown></span>
          <Space className="record-row-actions-desktop" size={2}>
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
            {overflowMenuItems.length > 0 && (
              <Dropdown menu={{ items: overflowMenuItems }} trigger={["click"]}>
                <Tooltip title="Thao tác khác">
                  <Button icon={<MoreOutlined />} type="text" aria-label="Thao tác khác" />
                </Tooltip>
              </Dropdown>
            )}
          </Space></>
        },
      },
    ],
    [advancedFilters, advancedSearch, displayFields, resource, recordStatus, templates, lookups, fileLookups, productCategoryNames, screens.md],
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
      password: "123@123",
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
          <div className="record-list-title-row">
            <Typography.Title className="record-list-title" level={3}>
              {menuIcons[resource] || <AppstoreOutlined />}
              <span>{entityLabels[resource] || resource}</span>
            </Typography.Title>
            <div className="record-list-title-actions">
              <Tooltip title={shortcutModifierHeld ? "Ctrl/⌘ + R" : "Làm mới dữ liệu"}>
                <Button aria-label="Làm mới dữ liệu" className="title-icon-action" icon={<ReloadOutlined />} size="small" type="text" onClick={refreshData}>
                  {shortcutModifierHeld ? "Ctrl/⌘ + R" : null}
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
        <Space wrap className="page-header-actions record-list-actions">
          <Tooltip title="Tìm kiếm nâng cao"><Checkbox aria-label="Tìm kiếm nâng cao" checked={advancedSearch} className="title-advanced-toggle" onChange={(event) => {
            setAdvancedSearch(event.target.checked)
            if (!event.target.checked) setAdvancedFilters({})
            setCurrentPage(1)
          }} /></Tooltip>
          <Input.Search
            allowClear
            className="page-search"
            placeholder={shortcutModifierHeld ? "Ctrl/⌘ + F" : "Tìm kiếm"}
            ref={searchInputRef}
            onSearch={(value) => {
              setCurrentPage(1)
              setSearch(value)
            }}
          />
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
          {canImportRecords && (
            <Tooltip title={shortcutModifierHeld ? "Ctrl/⌘ + I" : "Mở màn hình import"}>
              <Button
                icon={<ImportOutlined />}
                className="mobile-icon-button"
                onClick={() => navigate(`/${resource}/import`)}
              >
                {shortcutModifierHeld ? "Ctrl/⌘ + I" : "Import"}
              </Button>
            </Tooltip>
          )}
          {canCreateRecord && (
            <Tooltip title={shortcutModifierHeld ? "Ctrl/⌘ + B" : "Tạo bản ghi mới"}>
              <Button
                className="primary-glow mobile-icon-button"
                aria-label={resource === "files" ? "Tải tệp lên" : "Thêm nhanh"}
                icon={<PlusOutlined />}
                type="primary"
                onClick={() => setCreating(true)}
              >
                {shortcutModifierHeld ? "Ctrl/⌘ + B" : resource === "files" ? "Tải tệp lên" : "Thêm nhanh"}
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>
      <Tabs
        activeKey={tableTabKey}
        className="record-status-tabs"
        items={[
          { key: "active", label: <span>Tất cả{tableTabCounts.active > 0 ? <Badge count={tableTabCounts.active} overflowCount={999} style={{ marginLeft: 8, backgroundColor: "var(--app-primary)", color: "#fff" }} /> : null}</span> },
          ...tableTabs.map((tab) => ({
            key: tab.key,
            label: canManageTableTabs ? <span className="custom-table-tab-label"><span>{tab.label}{tableTabCounts[tab.key] > 0 ? <Badge count={tableTabCounts[tab.key]} overflowCount={999} style={{ marginLeft: 8, backgroundColor: "var(--app-primary)", color: "#fff" }} /> : null}</span><Tooltip title="Sửa tab"><button aria-label={`Sửa tab ${tab.label}`} className="edit-table-tab-button" onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setEditingTableTab(tab)
              tableTabForm.setFieldsValue(tab)
              setTableTabModalOpen(true)
            }}><EditOutlined /></button></Tooltip></span> : <span>{tab.label}{tableTabCounts[tab.key] > 0 ? ` (${tableTabCounts[tab.key]})` : ""}</span>,
          })),
          ...(canManageTableTabs ? [{ key: "__add_tab", label: <button className="add-table-tab-button" onClick={(event) => {
            event.preventDefault()
            event.stopPropagation()
            setEditingTableTab(null)
            tableTabForm.setFieldsValue({ filters: [{ operator: "eq" }] })
            setTableTabModalOpen(true)
          }}><PlusOutlined />Thêm tab</button> }] : []),
        ]}
        tabBarExtraContent={{
          right: <button className={`archived-tab-button${recordStatus === "archived" ? " is-active" : ""}`} onClick={() => {
            setRecordStatus("archived")
            setCurrentPage(1)
            setSelectedRowKeys([])
          }}><InboxOutlined />Lưu trữ</button>,
        }}
        onChange={(key) => {
          if (key === "__add_tab") return
          selectTableTab(key)
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
            showTotal: (value) => shortcutModifierHeld
              ? `Ctrl/⌘ + < / > để chuyển trang · ${value.toLocaleString("vi-VN")} bản ghi`
              : `${value.toLocaleString("vi-VN")} bản ghi`,
            onChange: (page, nextPageSize) => {
              setCurrentPage(page)
              setPageSize(nextPageSize)
            },
          }}
          onChange={(_pagination, _filters, sorter) => {
            const currentSorter = Array.isArray(sorter) ? sorter[0] : sorter
            updateTableSort(String(currentSorter?.field || "") || undefined, currentSorter?.order)
          }}
          rowKey="id"
          onRow={(row) => ({
            onClick: (event) => {
              const target = event.target as HTMLElement
              if (target.closest("button, a, input, label, .ant-checkbox-wrapper, .ant-dropdown-trigger")) return
              openDetail(String(row.id))
            },
          })}
          tableLayout="fixed"
          expandable={resource === "units" ? { defaultExpandAllRows: true } : undefined}
          indentSize={28}
          rowSelection={recordStatus === "active" && hasActionAccess(resource, "delete") ? {
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            preserveSelectedRowKeys: true,
          } : undefined}
          scroll={{
            x: "max-content",
            y: screens.md ? (advancedSearch ? "calc(100vh - 308px)" : "calc(100vh - 260px)") : undefined,
          }}
        />
      </Card>
      <Modal
        cancelText="Hủy"
        destroyOnHidden
        okText="Lưu tab"
        open={tableTabModalOpen}
        title={editingTableTab ? "Chỉnh sửa tab lọc" : "Tạo tab lọc cho bảng"}
        width={860}
        onCancel={() => { setTableTabModalOpen(false); setEditingTableTab(null); tableTabForm.resetFields() }}
        onOk={() => void tableTabForm.submit()}
      >
        <Form form={tableTabForm} layout="vertical" onFinish={(values) => void saveTableTab(values)}>
          <Form.Item label="Tên tab" name="label" rules={[{ required: true, message: "Nhập tên tab" }]}>
            <Input placeholder="Ví dụ: Khách hàng tiềm năng" />
          </Form.Item>
          <Form.Item extra="Chỉ dùng chữ, số, dấu gạch ngang hoặc gạch dưới." label="Key tab" name="key" rules={[{ required: true, message: "Nhập key tab" }]}>
            <Input placeholder="leads" />
          </Form.Item>
          <Typography.Text strong>Bộ lọc</Typography.Text>
          <Form.List name="filters">
            {(fields, { add, remove }) => <div className="table-tab-filter-list">
              {fields.map((field) => {
                const filter = tableTabFilters[field.name] || {}
                const selectedField = displayFields.find((item) => item.key === filter.field)
                const relation = selectedField ? getRelationSpec(selectedField) : undefined
                const isOptionField = Boolean(selectedField && (selectedField.type === "select" || selectedField.type === "multi-select") && selectedField.options?.length)
                const isListValue = isOptionField || Boolean(relation)
                const valueOptions = isOptionField
                  ? (selectedField?.options || []).map(normalizeSelectOption)
                  : relation ? Object.entries(lookups[relation.lookupKey || relation.resource] || {}).map(([value, label]) => ({ value, label })) : []
                const noValueNeeded = ["is_empty", "is_present"].includes(String(filter.operator || ""))
                return <div className="table-tab-filter-row" key={field.key}>
                <Form.Item name={[field.name, "field"]} rules={[{ required: true, message: "Chọn trường" }]}>
                  <Select options={displayFields.map((item) => ({ value: item.key, label: item.label }))} placeholder="Trường" />
                </Form.Item>
                <Form.Item name={[field.name, "operator"]} rules={[{ required: true }]}>
                  <Select options={[{ value: "eq", label: "Bằng" }, { value: "ne", label: "Khác" }, { value: "contains", label: "Chứa" }, { value: "in", label: "Trong" }, { value: "not_in", label: "Không trong" }, { value: "is_empty", label: "Rỗng" }, { value: "is_present", label: "Có giá trị" }, { value: "gt", label: ">" }, { value: "gte", label: "≥" }, { value: "lt", label: "<" }, { value: "lte", label: "≤" }]} />
                </Form.Item>
                <Form.Item hidden={noValueNeeded} name={[field.name, "value"]} rules={noValueNeeded ? [] : [{ required: true, message: "Nhập giá trị" }]}>
                  {isListValue ? <Select mode={["in", "not_in"].includes(String(filter.operator)) ? "multiple" : undefined} options={valueOptions} optionFilterProp="label" placeholder="Chọn giá trị" showSearch /> :
                  <AutoComplete
                    options={[
                      { value: "__YESTERDAY__", label: "Hôm qua" },
                      { value: "__TODAY__", label: "Hôm nay" },
                      { value: "__TOMORROW__", label: "Ngày mai" },
                      { value: "__THIS_WEEK__", label: "Tuần này" },
                      { value: "__THIS_MONTH__", label: "Tháng này" },
                      { value: "__THIS_YEAR__", label: "Năm nay" },
                    ]}
                    placeholder="Giá trị hoặc chọn ngày động"
                  />}
                </Form.Item>
                <Button aria-label="Xóa bộ lọc" danger icon={<MinusCircleOutlined />} type="text" onClick={() => remove(field.name)} />
              </div>})}
              <Button icon={<PlusOutlined />} type="dashed" onClick={() => add({ operator: "eq" })}>Thêm điều kiện lọc</Button>
            </div>}
          </Form.List>
        </Form>
      </Modal>
      <Modal
        cancelText="Hủy"
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
          <Form.Item label="Email đăng nhập (không bắt buộc)" name="email" rules={[{ type: "email", message: "Nhập email hợp lệ" }]}>
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item label="Tên đăng nhập" name="username" rules={[{ required: true, whitespace: true, message: "Nhập tên đăng nhập" }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item label="Mật khẩu ban đầu" name="password" rules={[{ required: true, min: 6, message: "Mật khẩu tối thiểu 6 ký tự" }]}>
            <Input autoComplete="new-password" />
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

function ProjectMemberAvatars({ memberIds, lookups }: { memberIds: unknown; lookups: LookupMap }) {
  const ids = Array.isArray(memberIds) ? memberIds.map(String).filter(Boolean) : []
  if (ids.length === 0) return <span>—</span>
  const staffMeta = getRelationMetaMap(lookups, "staff")
  return (
    <Avatar.Group max={{ count: 5 }} size="small">
      {ids.map((id) => {
        const member = staffMeta[id]
        const label = String(member?.fullName || member?.label || lookups.staff?.[id] || "Thành viên")
        return (
          <Tooltip key={id} title={label}>
            <Avatar icon={<UserOutlined />} src={member?.avatarUrl ? resolveFileUrl(String(member.avatarUrl)) : undefined}>
              {label.slice(0, 1).toUpperCase()}
            </Avatar>
          </Tooltip>
        )
      })}
    </Avatar.Group>
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
