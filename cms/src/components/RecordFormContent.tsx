import { useCreate, useOne, useUpdate } from "@refinedev/core"
import {
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  InboxOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons"
import {
  Alert,
  Avatar,
  Button,
  Checkbox,
  Empty,
  Form,
  Grid,
  Image,
  Input,
  InputNumber,
  List,
  Col,
  DatePicker,
  Modal,
  Row,
  Select,
  Space,
  Tabs,
  Table,
  Tree,
  TreeSelect,
  Typography,
} from "antd"
import { UserOutlined } from "@ant-design/icons"
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react"
import dayjs from "dayjs"
import InputMask from "react-input-mask"
import { api, resolveFileUrl } from "../api"
import { hasActionAccess } from "../access"
import { controlHeightBySize, useAppUi } from "../app-ui"
import { FileUploadPanel } from "./FileUploadPanel"
import { CustomField, entityLabels, FieldSpec, RelationSpec, relationFields } from "../models"
import { getRelationMetaMap, loadFileLibraryRows, loadRelationOptions, LookupMap, RelationLookupRecord } from "../relations"
import { getCachedMasterData } from "../utils/masterDataCache"
import { getApiErrorMessage } from "../utils/apiError"
import { formatNumberInput, parseNumberInput } from "../utils/numberInput"
import { getFirstLookupValue } from "../utils/branchDefaults"
import { getInputPatternConfig, isInputPatternComplete } from "../input-patterns"
import { toastError, toastSuccess } from "../toast"
import { buildLocalDateTime, currentLocalDate, currentLocalDateTime, formatClinicDateTimeForApi, normalizeDateTimeValueForInput, normalizeDateValueForInput, parseClinicDateTime } from "../utils/datetime"
import { buildFolderPathMap, buildFolderTree, FolderTreeNode, normalizeFileFolderRows } from "../utils/fileFolders"
import { VietnamAddressFields } from './VietnamAddressFields'
import { PrintTinyMceEditor } from './PrintTinyMceEditor'
import {
  getFieldCatalog,
  groupFieldsByTab,
  getStoredUserRole,
  getVisibleFieldConfigs,
  FieldLayoutConfig,
  ViewSettingRecord,
} from "../view-settings"

interface RecordFormContentProps {
  resource: string
  id?: string
  compact?: boolean
  initialValues?: Record<string, unknown>
  hiddenFieldKeys?: string[]
  onCancel?: () => void
  onSuccess?: () => void
  notifyOnSuccess?: boolean
  /** Renders the create form without allowing records or related data to be created. */
  preview?: boolean
  /** Optional role used by the settings preview to resolve the same inherited layout. */
  viewRole?: string
}

type RecordDraft = {
  id: string
  title?: string
  payload: Record<string, unknown>
  updatedAt: string
}

const APPOINTMENT_DURATION_OPTIONS = [
  { value: 15, label: "15 phút" },
  { value: 30, label: "30 phút" },
  { value: 45, label: "45 phút" },
  { value: 60, label: "60 phút" },
  { value: 90, label: "90 phút" },
  { value: 120, label: "120 phút" },
  { value: "custom", label: "Nhập giờ kết thúc" },
]

function toSlug(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function RecordFormContent({
  resource,
  id,
  compact,
  initialValues,
  hiddenFieldKeys = [],
  onCancel,
  onSuccess,
  notifyOnSuccess = true,
  preview = false,
  viewRole,
}: RecordFormContentProps) {
  const editing = Boolean(id)
  const [form] = Form.useForm()
  const [fields, setFields] = useState<FieldLayoutConfig[]>([])
  const [lookups, setLookups] = useState<LookupMap>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string | undefined>()
  const [draftsOpen, setDraftsOpen] = useState(false)
  const [drafts, setDrafts] = useState<RecordDraft[]>([])
  const [draftBusy, setDraftBusy] = useState(false)
  const [branchRoleOptions, setBranchRoleOptions] = useState<Array<{ value: string; label: string }>>([])
  const [systemRoleOptions, setSystemRoleOptions] = useState<Array<{ value: string; label: string }>>([])
  const [quickCreateRelationResource, setQuickCreateRelationResource] = useState<string | null>(null)
  const [relationReloadKey, setRelationReloadKey] = useState(0)
  const autoFocusedFormKey = useRef<string | null>(null)
  const slugWasEdited = useRef(false)
  const { mutate: create } = useCreate()
  const { mutate: update } = useUpdate()
  const { settings } = useAppUi()
  const stockMovementType = Form.useWatch("movementType", form) as string | undefined
  const isAppointmentForm = resource === "appointments"
  const isWorkScheduleForm = resource === "work-schedules"
  const isAddressForm = resource === "customers" || resource === "leads"
  const slugSourceField = resource === "doctors" ? "fullName" : ["services", "posts", "news", "videos"].includes(resource) ? resource === "services" ? "name" : "title" : undefined
  const recordQuery = useOne({
    resource,
    id: id || "",
    queryOptions: { enabled: editing },
  }) as any

  useEffect(() => {
    Promise.all([
      getCachedMasterData(`form-config:custom-fields:${resource}`, () => api.get("/settings/custom-fields", { params: { entityType: resource } }).then((response) => response.data)),
      getCachedMasterData(`form-config:views:${resource}`, () => api.get("/settings/views", { params: { entityType: resource } }).then((response) => response.data)),
      getCachedMasterData("form-config:custom-tables", () => api.get("/settings/custom-tables", { params: { includeRows: true } }).then((response) => response.data)),
      resource === "leave-requests" || resource === "leave-allocations"
        ? getCachedMasterData("relation:leave-types", () => api.get("/records/leave-types", { params: { pageSize: 100 } }).then((response) => response.data))
        : Promise.resolve({ data: [] }),
    ])
      .then(async ([fieldResponse, viewResponse, tableResponse, leaveTypesResponse]) => {
        const tables = new Map((tableResponse.data || []).map((table: Record<string, unknown>) => [String(table.id), table]))
        const customFields = fieldResponse.data.filter(
          (field: CustomField) => field.isActive,
        ).map((field: CustomField) => {
          if (field.dataType !== "dynamic-table") return field
          const table = tables.get(String(field.customTableId)) as Record<string, unknown> | undefined
          const columns = (table?.columns || []) as Array<Record<string, unknown>>
          const rows = (table?.rows || []) as Array<Record<string, unknown>>
          return {
            ...field,
            options: rows.map((row) => {
              const values = (row.values || {}) as Record<string, unknown>
              return { value: String(row.id), label: columns.map((column) => String(values[String(column.key)] || "")).filter(Boolean).join(" · ") || String(row.id) }
            }),
          }
        })
        const leaveTypeOptions = (Array.isArray(leaveTypesResponse.data) ? leaveTypesResponse.data : [])
          .filter((item: Record<string, unknown>) => item.isActive !== false)
          .map((item: Record<string, unknown>) => ({ value: String(item.code), label: String(item.name || item.code) }))
        const nextFields = getVisibleFieldConfigs(
          getFieldCatalog(resource, customFields),
          viewResponse.data as ViewSettingRecord[],
          "FORM",
          viewRole || getStoredUserRole(),
        )
        // Built-in and custom select fields share Master Data. Static options
        // remain as a fallback until the corresponding group is seeded.
        const masterFields = nextFields.filter((field: FieldSpec) =>
          !field.relation && (field.type === "select" || field.type === "multi-select"),
        )
        const masterOptions = await Promise.all(masterFields.map(async (field) => {
          const rows = await getCachedMasterData(`master-data:${resource}.${field.key}`, () => api.get("/master-data", { params: { group: `${resource}.${field.key}` } }).then((response) => response.data.data || []))
          return [field.key, rows.filter((item: Record<string, unknown>) => item.isActive !== false).map((item: Record<string, unknown>) => ({ value: String(item.value), label: String(item.name) }))] as const
        }))
        const masterOptionMap = new Map(masterOptions)
        const fieldsWithMasterData = nextFields.map((field) => {
          const options = masterOptionMap.get(field.key)
          if (!options || options.length === 0) return field
          return {
            ...field,
            options: Array.isArray(field.visibleOptionValues)
              ? options.filter((option: { value: string }) => field.visibleOptionValues!.includes(option.value))
              : options,
          }
        })
        const fieldsWithLeaveTypes = resource === "leave-requests" || resource === "leave-allocations"
          ? fieldsWithMasterData.map((field) => field.key === "leaveType" || field.key === "leaveTypeCode" ? { ...field, options: leaveTypeOptions } : field)
          : fieldsWithMasterData
        setFields(fieldsWithLeaveTypes)
        // Staff can be very large; its picker searches remotely and resolves only selected IDs.
        return loadRelationOptions(fieldsWithLeaveTypes.filter((field) => (field.relation || relationFields[field.key])?.resource !== "staff"))
      })
      .then(setLookups)
  }, [relationReloadKey, resource, viewRole])

  useEffect(() => {
    if (resource !== "user-accounts") return
    Promise.all([
      api.get("/records/branches", { params: { pageSize: 200 } }),
      api.get("/settings/dynamic-roles"),
      editing ? api.get("/settings/branch-role-assignments") : Promise.resolve({ data: { data: [] } }),
    ]).then(([branches, roles, assignments]) => {
      setBranchRoleOptions((branches.data.data || []).map((row: Record<string, unknown>) => ({ value: String(row.id), label: String(row.name || row.id) })))
      setSystemRoleOptions((roles.data.data || []).filter((row: Record<string, unknown>) => row.isActive).map((row: Record<string, unknown>) => ({ value: String(row.key), label: `${row.name} (${row.key})` })))
      if (editing) {
        const rows = (assignments.data.data || []).filter((row: Record<string, unknown>) => String(row.userId) === String(id))
          .map((row: Record<string, unknown>) => ({ branchId: row.branchId, roleKeys: row.roleKeys || [], isActive: row.isActive !== false }))
        form.setFieldValue("branchRoleAssignments", rows)
      }
    })
  }, [editing, form, id, resource])

  useEffect(() => {
    const data =
      recordQuery.result?.data ||
      recordQuery.query?.data?.data ||
      recordQuery.data?.data?.data
      if (data) {
      const normalizedData = { ...data, ...(data.customFields || {}) } as Record<string, unknown>
      fields.forEach((field) => {
        if (field.type === "date" && normalizedData[field.key]) {
          normalizedData[field.key] = normalizeDateValueForInput(normalizedData[field.key])
        }
        if (field.type === "datetime" && normalizedData[field.key]) {
          normalizedData[field.key] = normalizeDateTimeValueForInput(normalizedData[field.key])
        }
      })
      if (isAppointmentForm) {
        Object.assign(normalizedData, buildAppointmentEditorValues(normalizedData))
      }
      if (isWorkScheduleForm) {
        Object.assign(normalizedData, buildWorkScheduleEditorValues(normalizedData))
      }
      form.setFieldsValue(normalizedData)
      return
    }
    if (!editing && fields.length > 0) {
      const todayDate = currentLocalDate()
      const todayDatetime = currentLocalDateTime()
      const defaultValues = {
          ...Object.fromEntries(
            fields
              .filter((field) => field.type === "date")
              .map((field) => [field.key, todayDate]),
          ),
          ...Object.fromEntries(
            fields
              .filter((field) => field.type === "datetime")
              .map((field) => [field.key, todayDatetime]),
          ),
          ...Object.fromEntries(
            fields
              .filter((field) => field.defaultValue !== undefined)
              .map((field) => [field.key, field.defaultValue]),
          ),
          ...(initialValues || {}),
        }
      const nextDefaults = isAppointmentForm
        ? { ...defaultValues, ...buildAppointmentEditorValues(defaultValues) }
        : isWorkScheduleForm
          ? { ...defaultValues, ...buildWorkScheduleEditorValues(defaultValues) }
          : defaultValues
      form.setFieldsValue(nextDefaults)
    }
  }, [editing, fields, form, initialValues, isAppointmentForm, isWorkScheduleForm, recordQuery.result, recordQuery.query?.data, recordQuery.data?.data?.data])

  useEffect(() => {
    if (editing || fields.length === 0) return
    const defaultBranchId = getFirstLookupValue(lookups.branches)
    if (!defaultBranchId) return
    const nextValues: Record<string, string> = {}
    ;["branchId", "defaultBranchId"].forEach((key) => {
      const fieldExists = fields.some((field) => field.key === key)
      const currentValue = form.getFieldValue(key)
      const initialValue = initialValues?.[key]
      if (fieldExists && !currentValue && !initialValue) {
        nextValues[key] = defaultBranchId
      }
    })
    if (Object.keys(nextValues).length > 0) {
      form.setFieldsValue(nextValues)
    }
  }, [editing, fields, form, initialValues, lookups])

  function buildPayload(values: Record<string, unknown>) {
    const mergedValues = { ...(initialValues || {}), ...values }
    delete mergedValues.branchRoleAssignments
    delete mergedValues.branchRoleSummary
    if (isAppointmentForm) {
      applyAppointmentDateTimeValues(mergedValues)
    }
    if (isWorkScheduleForm) {
      applyWorkScheduleEditorValues(mergedValues)
    }
    const fieldCatalog = getFieldCatalog(resource, [])
    const baseKeys = new Set(fieldCatalog.map((field) => field.key))
    const datetimeKeys = new Set(fieldCatalog.filter((field) => field.type === "datetime").map((field) => field.key))
    if (isAddressForm) ["countryCode", "provinceCode", "provinceName", "wardCode", "wardName", "addressLine", "address"].forEach((key) => baseKeys.add(key))
    if (isAddressForm) {
      const province = String(mergedValues.provinceName || "").trim()
      const ward = String(mergedValues.wardName || "").trim()
      const line = String(mergedValues.addressLine || "").trim()
      mergedValues.address = [line, ward, province, "Việt Nam"].filter(Boolean).join(", ")
    }
    if (isWorkScheduleForm) {
      ;["seriesId", "recurrenceType", "recurrenceInterval", "recurrenceWeekdays", "recurrenceUntil"].forEach((key) => baseKeys.add(key))
    }
    const payload: Record<string, unknown> = { customFields: {} }
    Object.entries(mergedValues).forEach(([key, value]) => {
      if (baseKeys.has(key)) payload[key] = datetimeKeys.has(key) ? formatClinicDateTimeForApi(value) : value
      else (payload.customFields as Record<string, unknown>)[key] = value
    })
    return payload
  }

  async function syncBranchRoles(userId: string, rows: Array<{ branchId?: string; roleKeys?: string[]; isActive?: boolean }>) {
    if (resource !== "user-accounts") return
    const existing = (await api.get("/settings/branch-role-assignments")).data.data || []
    const next = rows.filter((row) => row.branchId && (row.roleKeys || []).length)
    for (const assignment of existing.filter((row: Record<string, unknown>) => String(row.userId) === userId)) {
      const replacement = next.find((row) => row.branchId === assignment.branchId)
      if (replacement) await api.patch(`/settings/branch-role-assignments/${assignment.id}`, { ...replacement, userId })
      else await api.delete(`/settings/branch-role-assignments/${assignment.id}`)
    }
    for (const row of next.filter((row) => !existing.some((item: Record<string, unknown>) => String(item.userId) === userId && item.branchId === row.branchId))) {
      await api.post("/settings/branch-role-assignments", { ...row, userId })
    }
  }

  function submit(values: Record<string, unknown>) {
    const payload = buildPayload(values)
    const done = async (result?: any) => {
      const userId = editing ? id : result?.data?.id
      if (resource === "user-accounts" && userId && !isSystemAdminAccount) await syncBranchRoles(String(userId), (values.branchRoleAssignments || []) as Array<{ branchId?: string; roleKeys?: string[]; isActive?: boolean }>)
      setSubmitError(null)
      if (notifyOnSuccess) toastSuccess("Đã lưu dữ liệu")
      onSuccess?.()
    }
    if (resource === "stock-batches" && !editing) {
      const stockItems = Array.isArray(payload.items) ? payload.items as Array<Record<string, unknown>> : []
      const isExport = payload.movementType === "EXPORT" || payload.movementType === "WASTE" || payload.movementType === "TRANSFER"
      const isTransfer = payload.movementType === "TRANSFER"
      const normalizedItems = stockItems
        .map((item) => isExport
          ? { batchId: item.batchId ? String(item.batchId) : undefined, productId: item.productId ? String(item.productId) : undefined, quantity: Number(item.quantity || 0) }
          : { productId: item.productId ? String(item.productId) : undefined, batchNumber: item.batchNumber ? String(item.batchNumber) : undefined, expiryDate: item.expiryDate, quantity: Number(item.quantity || 0), transferUnitId: item.transferUnitId ? String(item.transferUnitId) : undefined, supplierId: item.supplierId ? String(item.supplierId) : undefined })
        .filter((item) => isExport ? Boolean(item.batchId || item.productId) : Boolean(item.productId))
      if (!normalizedItems.length || normalizedItems.some((item) => item.quantity <= 0)) {
        const errorMessage = isExport ? "Chọn ít nhất một sản phẩm/lô hàng và số lượng xuất hợp lệ" : "Chọn ít nhất một sản phẩm và số lượng nhập hợp lệ"
        setSubmitError(errorMessage)
        toastError(errorMessage)
        return
      }
      void api.post(isTransfer ? "/records/stock-batches/transfer" : isExport ? "/records/stock-batches/issue" : "/records/stock-batches/receipt", {
        ...payload,
        items: normalizedItems,
      }).then(done).catch((error) => {
        const errorMessage = getApiErrorMessage(error, "Không thể lưu phiếu kho")
        setSubmitError(errorMessage)
        toastError(errorMessage)
      })
      return
    }
    if (editing)
      update(
        { resource, id: id!, values: payload },
        {
          onSuccess: done,
          onError: (error) => {
            const errorMessage = getApiErrorMessage(error, "Không thể lưu dữ liệu")
            setSubmitError(errorMessage)
            toastError(errorMessage)
          },
        },
      )
    else
      create(
        { resource, values: payload },
        {
          onSuccess: done,
          onError: (error) => {
            const errorMessage = getApiErrorMessage(error, "Không thể lưu dữ liệu")
            setSubmitError(errorMessage)
            toastError(errorMessage)
          },
        },
      )
  }

  async function loadDrafts() {
    setDraftBusy(true)
    try {
      const response = await api.get(`/records/${resource}/drafts`)
      setDrafts(Array.isArray(response.data?.data) ? response.data.data : [])
    } catch (error) {
      toastError(getApiErrorMessage(error, "Không thể tải bản nháp"))
    } finally {
      setDraftBusy(false)
    }
  }

  async function saveDraft() {
    setDraftBusy(true)
    try {
      const response = await api.post(`/records/${resource}/drafts`, buildPayload(form.getFieldsValue(true)))
      const draft = response.data?.data as RecordDraft | undefined
      if (draft) setDrafts((current) => [draft, ...current])
      toastSuccess("Đã lưu bản nháp")
    } catch (error) {
      toastError(getApiErrorMessage(error, "Không thể lưu bản nháp"))
    } finally {
      setDraftBusy(false)
    }
  }

  async function openDrafts() {
    setDraftsOpen(true)
    await loadDrafts()
  }

  function restoreDraft(draft: RecordDraft) {
    const restored = { ...draft.payload, ...((draft.payload.customFields || {}) as Record<string, unknown>) }
    if (isAppointmentForm) Object.assign(restored, buildAppointmentEditorValues(restored))
    if (isWorkScheduleForm) Object.assign(restored, buildWorkScheduleEditorValues(restored))
    form.setFieldsValue(restored)
    setDraftsOpen(false)
    setSubmitError(null)
    toastSuccess("Đã mở bản nháp")
  }

  async function removeDraft(id: string) {
    setDraftBusy(true)
    try {
      await api.delete(`/records/${resource}/drafts/${id}`)
      setDrafts((current) => current.filter((draft) => draft.id !== id))
    } catch (error) {
      toastError(getApiErrorMessage(error, "Không thể xóa bản nháp"))
    } finally {
      setDraftBusy(false)
    }
  }

  const visibleFields = useMemo(
    () => fields.filter((field) => {
      if (isAppointmentForm && (field.key === "startTime" || field.key === "endTime")) return false
      if (isWorkScheduleForm && (field.key === "workDate" || field.key === "startTime" || field.key === "endTime" || field.key === "recurrenceUntil")) return false
      // The server derives this summary from the editable assignments below.
      if (resource === "user-accounts" && field.key === "branchRoleSummary") return false
      if (resource === "stock-batches" && field.key === "procedureReference" && !settings.clinicFeatures.procedureSupply) return false
      if (resource === "stock-batches" && ["destinationBranchId", "destinationWarehouseId"].includes(field.key) && stockMovementType !== "TRANSFER") return false
      if (hiddenFieldKeys.includes(field.key)) return false
      return true
    }),
    [fields, hiddenFieldKeys, isAddressForm, isAppointmentForm, isWorkScheduleForm, resource, settings.clinicFeatures.procedureSupply, settings.clinicFeatures.stockLocations, stockMovementType],
  )
  const isSystemAdminAccount = resource === "user-accounts"
    && ["admin", "admin-system"].includes(String(recordQuery.result?.data?.username || recordQuery.query?.data?.data?.username || recordQuery.data?.data?.data?.username || "").trim().toLowerCase())
  const formVisibleFields = useMemo(
    () => visibleFields.map((field) => isSystemAdminAccount && ["username", "role"].includes(field.key)
      ? { ...field, disabled: true }
      : field),
    [isSystemAdminAccount, visibleFields],
  )
  const fieldTabs = useMemo(() => groupFieldsByTab(formVisibleFields), [formVisibleFields])
  const usesTabs = fieldTabs.length > 1 || Boolean(fieldTabs[0]?.tab)

  useEffect(() => {
    const formKey = `${resource}:${id || "new"}`
    const firstEditableField = formVisibleFields.find((field) => !field.disabled)
    if (!firstEditableField || autoFocusedFormKey.current === formKey) return

    const frame = window.requestAnimationFrame(() => {
      const input = form.getFieldInstance(firstEditableField.key) as { focus?: () => void } | undefined
      if (!input?.focus) return
      input.focus()
      autoFocusedFormKey.current = formKey
    })
    return () => window.cancelAnimationFrame(frame)
  }, [form, formVisibleFields, id, resource])

  function showValidationError(errorInfo: { errorFields?: Array<{ name: Array<string | number>; errors: string[] }> }) {
    const firstError = errorInfo.errorFields?.[0]
    const fieldKey = String(firstError?.name?.[0] || "")
    const tabIndex = fieldTabs.findIndex((group) => group.fields.some((field) => field.key === fieldKey))
    const resolvedTabIndex = tabIndex >= 0 ? tabIndex : 0
    const tab = fieldTabs[resolvedTabIndex]

    if (usesTabs && tab) setActiveTab(tab.key)

    const errorMessage = Array.from(
      new Set(
        (errorInfo.errorFields || [])
          .flatMap((item) => item.errors)
          .filter(Boolean),
      ),
    ).join(" · ") || "Vui lòng kiểm tra các trường bắt buộc"
    setSubmitError(usesTabs && tab ? `Tab “${tab.tab || "Thông tin chung"}”: ${errorMessage}` : errorMessage)
  }

  const renderFieldGrid = (tabFields: FieldLayoutConfig[], includeSpecialFields: boolean) => (
    <Row gutter={[16, 0]}>
      {tabFields.map((field) => {
        if (field.layoutType === "title") {
          const titleSize = ({ sm: 16, md: 20, lg: 24 } as const)[field.titleSize || "md"]
          return <Col key={field.key} span={24}><Typography.Title level={4} style={{ margin: "8px 0 0", color: field.titleColor, fontSize: titleSize }}>{field.label}</Typography.Title>{field.description ? <Typography.Text type="secondary">{field.description}</Typography.Text> : null}</Col>
        }

        // `address` is represented by the province/ward/address-line controls.
        // Keep its configured slot so the special control follows the saved form order.
        if (isAddressForm && field.key === "address") {
          return <VietnamAddressFields key={field.key} form={form} />
        }

        return (
          <Col key={field.key} xs={24} md={widthToSpan(field.width)}>
            <Form.Item
              label={field.description ? (
                <Space direction="vertical" size={0}>
                  <span>{field.label}</span>
                  <Typography.Text type="secondary">{field.description}</Typography.Text>
                </Space>
              ) : field.key === "code" && !editing ? `${field.label} (tự sinh nếu để trống)` : field.label}
              name={field.key}
              rules={[
                { required: Boolean(field.required && !field.disabled && !(field.key === "code" && !editing)), message: `Nhập ${field.label}` },
                ...(field.inputPattern ? [{
                  validator: (_rule: unknown, value: unknown) => isInputPatternComplete(field.inputPattern, value)
                    ? Promise.resolve()
                    : Promise.reject(new Error(`${field.label} không đúng mẫu nhập`)),
                }] : []),
              ]}
            >
              <FieldInput
                field={field}
                lookups={lookups}
                resource={resource}
                onCreateRelation={preview ? undefined : setQuickCreateRelationResource}
              />
            </Form.Item>
          </Col>
        )
      })}
      {includeSpecialFields && isAppointmentForm ? <AppointmentDateTimeFields form={form} /> : null}
      {includeSpecialFields && isWorkScheduleForm ? <WorkSchedulePeriodFields /> : null}
    </Row>
  )

  return (
    <>
      {!compact && (
          <Typography.Title level={3}>
            {editing ? "Cập nhật" : "Thêm"} {entityLabels[resource] || resource}
          </Typography.Title>
      )}
      <Form
        className={`record-form${compact ? " record-form--compact" : ""}`}
        form={form}
        layout="vertical"
        disabled={preview}
        onKeyDownCapture={(event) => {
          if (preview) return
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault()
            form.submit()
          }
        }}
        onValuesChange={(changedValues) => {
          if (submitError) setSubmitError(null)
          if (editing || !slugSourceField || !fields.some((field) => field.key === "slug")) return
          if (Object.prototype.hasOwnProperty.call(changedValues, "slug")) {
            slugWasEdited.current = true
            return
          }
          if (!slugWasEdited.current && Object.prototype.hasOwnProperty.call(changedValues, slugSourceField)) {
            form.setFieldValue("slug", toSlug(changedValues[slugSourceField]))
          }
        }}
        onFinish={(values) => { if (!preview) submit(values) }}
        onFinishFailed={preview ? undefined : showValidationError}
      >
        {usesTabs ? (
          <Tabs
            activeKey={activeTab || fieldTabs[0]?.key}
            items={fieldTabs.map((group, index) => ({
              key: group.key,
              label: group.tab || "Thông tin chung",
              children: renderFieldGrid(group.fields, index === 0),
            }))}
            onChange={setActiveTab}
          />
        ) : renderFieldGrid(formVisibleFields, true)}
        {!preview && resource === "user-accounts" ? (
          <Form.List name="branchRoleAssignments">
            {(items, { add, remove }) => (
              <div style={{ marginBottom: 16 }}>
                <Typography.Title level={5}>Phân quyền theo chi nhánh</Typography.Title>
                {items.map(({ key, name }) => (
                  <Space key={key} align="start" style={{ display: "flex", marginBottom: 8 }}>
                    <Form.Item name={[name, "branchId"]} rules={[{ required: true, message: "Chọn chi nhánh" }]}><Select disabled={isSystemAdminAccount} style={{ minWidth: 210 }} options={branchRoleOptions} placeholder="Chi nhánh" /></Form.Item>
                    <Form.Item name={[name, "roleKeys"]} rules={[{ required: true, message: "Chọn vai trò" }]}><Select disabled={isSystemAdminAccount} mode="multiple" style={{ minWidth: 280 }} options={systemRoleOptions} placeholder="Vai trò" /></Form.Item>
                    <Button danger disabled={isSystemAdminAccount} onClick={() => remove(name)}>Bỏ</Button>
                  </Space>
                ))}
                <Button disabled={isSystemAdminAccount} onClick={() => add({ isActive: true, roleKeys: [] })}>+ Thêm chi nhánh / role</Button>
              </div>
            )}
          </Form.List>
        ) : null}
        {!preview && submitError ? (
          <Alert
            closable
            message={submitError}
            showIcon
            style={{ marginBottom: 16 }}
            type="error"
            onClose={() => setSubmitError(null)}
          />
        ) : null}
        {!preview && <div className="record-form-actions">
          <Space>
            {!editing ? <Button loading={draftBusy} onClick={() => void saveDraft()}>Lưu nháp</Button> : null}
            {!editing ? <Button onClick={() => void openDrafts()}>Bản nháp{drafts.length ? ` (${drafts.length})` : ""}</Button> : null}
            <Button onClick={onCancel}>Hủy</Button>
          </Space>
          <Button className="primary-glow" htmlType="submit" title="Ctrl/⌘ + Enter" type="primary">
            Lưu
          </Button>
        </div>}
      </Form>
      {!preview && !editing ? (
        <Modal footer={null} onCancel={() => setDraftsOpen(false)} open={draftsOpen} title={`Bản nháp ${entityLabels[resource] || resource}`}>
          <List
            dataSource={drafts}
            loading={draftBusy}
            locale={{ emptyText: "Chưa có bản nháp nào" }}
            renderItem={(draft) => (
              <List.Item
                actions={[
                  <Button key="open" size="small" type="primary" onClick={() => restoreDraft(draft)}>Mở</Button>,
                  <Button icon={<InboxOutlined />} key="delete" size="small" onClick={() => void removeDraft(draft.id)}>Lưu trữ</Button>,
                ]}
              >
                <List.Item.Meta
                  title={draft.title || "Bản nháp chưa đặt tên"}
                  description={`Cập nhật ${dayjs(draft.updatedAt).format("DD/MM/YYYY HH:mm")}`}
                />
              </List.Item>
            )}
          />
        </Modal>
      ) : null}
      {!preview && <Modal
        destroyOnHidden
        footer={null}
        open={Boolean(quickCreateRelationResource)}
        title={quickCreateRelationResource ? `Thêm ${entityLabels[quickCreateRelationResource] || quickCreateRelationResource}` : "Thêm mới"}
        width={760}
        onCancel={() => setQuickCreateRelationResource(null)}
      >
        {quickCreateRelationResource ? (
          <RecordFormContent
            compact
            resource={quickCreateRelationResource}
            notifyOnSuccess={false}
            onCancel={() => setQuickCreateRelationResource(null)}
            onSuccess={() => {
              setQuickCreateRelationResource(null)
              setRelationReloadKey((current) => current + 1)
            }}
          />
        ) : null}
      </Modal>}
    </>
  )
}

function WorkSchedulePeriodFields() {
  return (
    <>
      <Col xs={24} md={12}>
        <Form.Item
          label="Ngày làm việc"
          name="scheduleDate"
          rules={[{ required: true, message: "Chọn ngày làm việc" }]}
        >
          <ClinicDateInput />
        </Form.Item>
      </Col>
      <Col xs={24} md={6}>
        <Form.Item
          label="Giờ bắt đầu"
          name="scheduleStartTime"
          rules={timeInputRules("giờ bắt đầu")}
        >
          <TimeInput />
        </Form.Item>
      </Col>
      <Col xs={24} md={6}>
        <Form.Item
          label="Giờ kết thúc"
          name="scheduleEndTime"
          rules={timeInputRules("giờ kết thúc")}
        >
          <TimeInput />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item label="Ngày kết thúc" name="recurrenceUntil" rules={[{ required: true, message: "Chọn ngày kết thúc" }]}>
          <ClinicDateInput />
        </Form.Item>
      </Col>
    </>
  )
}

function AppointmentDateTimeFields({ form }: { form: ReturnType<typeof Form.useForm>[0] }) {
  const appointmentDate = Form.useWatch("appointmentDate", form) as string | undefined
  const appointmentStartTime = Form.useWatch("appointmentStartTime", form) as string | undefined
  const durationMode = Form.useWatch("appointmentDurationMinutes", form) as number | "custom" | undefined
  const useCustomEndTime = durationMode === "custom"

  useEffect(() => {
    if (useCustomEndTime) return
    if (!appointmentDate || !appointmentStartTime || !durationMode) return
    const start = dayjs(`${appointmentDate}T${appointmentStartTime}`)
    if (!start.isValid()) return
    const end = start.add(Number(durationMode), "minute")
    const nextEndTime = end.format("HH:mm")
    if (form.getFieldValue("appointmentEndTime") !== nextEndTime) {
      form.setFieldsValue({ appointmentEndTime: nextEndTime })
    }
  }, [appointmentDate, appointmentStartTime, durationMode, form, useCustomEndTime])

  return (
    <>
      <Col xs={24} md={12}>
        <Form.Item
          label="Ngày hẹn"
          name="appointmentDate"
          rules={[{ required: true, message: "Chọn ngày hẹn" }]}
        >
          <ClinicDateInput />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item
          label="Giờ bắt đầu"
          name="appointmentStartTime"
          rules={timeInputRules("giờ bắt đầu")}
        >
          <TimeInput />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item
          label="Thời lượng"
          name="appointmentDurationMinutes"
          rules={[{ required: true, message: "Chọn thời lượng" }]}
        >
          <Select options={APPOINTMENT_DURATION_OPTIONS} placeholder="Chọn thời lượng" />
        </Form.Item>
      </Col>
      <Col xs={24} md={12}>
        <Form.Item
          label="Giờ kết thúc"
          name="appointmentEndTime"
          rules={useCustomEndTime ? timeInputRules("giờ kết thúc") : []}
        >
          <TimeInput disabled={!useCustomEndTime} />
        </Form.Item>
      </Col>
    </>
  )
}

function TimeInput({
  disabled,
  value,
  onChange,
}: {
  disabled?: boolean
  value?: string
  onChange?: (value: string) => void
}) {
  const inputPattern = getInputPatternConfig("time-hh-mm")
  if (!inputPattern) return null

  return (
    <InputMask
      className="ant-input record-form-mask-input"
      disabled={disabled}
      mask={inputPattern.mask}
      placeholder="HH:MM"
      maskPlaceholder="_"
      alwaysShowMask
      value={value || ""}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange?.(event.target.value)}
    />
  )
}

function timeInputRules(label: string, required = true) {
  return [
    { required, message: `Nhập ${label}` },
    {
      validator: (_rule: unknown, value: unknown) => isInputPatternComplete("time-hh-mm", value)
        ? Promise.resolve()
        : Promise.reject(new Error(`${label} phải đúng định dạng HH:MM`)),
    },
  ]
}

function buildAppointmentEditorValues(values: Record<string, unknown>) {
  const start = parseClinicDateTime(values.startTime || values.appointmentDate || currentLocalDateTime())
  const end = parseClinicDateTime(values.endTime || values.startTime || currentLocalDateTime())
  const durationMinutes = Math.max(15, end.diff(start, "minute") || 60)
  const matchedDuration = APPOINTMENT_DURATION_OPTIONS.some((item) => item.value === durationMinutes)
  return {
    appointmentDate: start.isValid() ? start.format("YYYY-MM-DD") : currentLocalDate(),
    appointmentStartTime: start.isValid() ? start.format("HH:mm") : "09:00",
    appointmentDurationMinutes: matchedDuration ? durationMinutes : "custom",
    appointmentEndTime: end.isValid() ? end.format("HH:mm") : "10:00",
  }
}

function buildWorkScheduleEditorValues(values: Record<string, unknown>) {
  const workDate = normalizeDateValueForInput(values.workDate) || currentLocalDate()
  const start = values.startTime ? parseClinicDateTime(values.startTime) : null
  const end = values.endTime ? parseClinicDateTime(values.endTime) : null
  return {
    scheduleDate: workDate,
    scheduleStartTime: start?.isValid() ? start.format("HH:mm") : "08:00",
    scheduleEndTime: end?.isValid() ? end.format("HH:mm") : "17:00",
    recurrenceUntil: normalizeDateValueForInput(values.recurrenceUntil),
  }
}

function applyAppointmentDateTimeValues(values: Record<string, unknown>) {
  const dateText = String(values.appointmentDate || "").trim()
  const startText = String(values.appointmentStartTime || "").trim()
  if (!dateText || !startText) return

  const start = parseClinicDateTime(`${dateText}T${startText}`)
  if (!start.isValid()) return

  const useCustomEndTime = values.appointmentDurationMinutes === "custom"
  const durationMinutes = Number(values.appointmentDurationMinutes || 60)
  const customEndText = String(values.appointmentEndTime || "").trim()
  let end = useCustomEndTime && customEndText
    ? parseClinicDateTime(`${dateText}T${customEndText}`)
    : start.add(durationMinutes > 0 ? durationMinutes : 60, "minute")

  if (!end.isValid() || !end.isAfter(start)) {
    end = start.add(durationMinutes > 0 ? durationMinutes : 60, "minute")
  }

  values.startTime = formatClinicDateTimeForApi(start)
  values.endTime = formatClinicDateTimeForApi(end)

  delete values.appointmentDate
  delete values.appointmentStartTime
  delete values.appointmentDurationMinutes
  delete values.appointmentEndTime
}

function applyWorkScheduleEditorValues(values: Record<string, unknown>) {
  const scheduleDate = String(values.scheduleDate || "").trim()
  const scheduleStartTime = String(values.scheduleStartTime || "").trim()
  const scheduleEndTime = String(values.scheduleEndTime || "").trim()
  if (scheduleDate) values.workDate = scheduleDate
  if (scheduleDate && scheduleStartTime) values.startTime = formatClinicDateTimeForApi(`${scheduleDate}T${scheduleStartTime}`)
  if (scheduleDate && scheduleEndTime) values.endTime = formatClinicDateTimeForApi(`${scheduleDate}T${scheduleEndTime}`)

  values.recurrenceType = "DAILY"
  values.recurrenceInterval = 1
  values.recurrenceWeekdays = undefined

  delete values.scheduleDate
  delete values.scheduleStartTime
  delete values.scheduleEndTime
}

function widthToSpan(width?: FieldSpec["width"]) {
  switch (width) {
    case "25":
      return 6
    case "33":
      return 8
    case "50":
      return 12
    case "66":
      return 16
    case "75":
      return 18
    case "100":
    default:
      return 24
  }
}

function ClinicDateInput({
  value,
  onChange,
  disabled,
  placeholder,
  showTime = false,
}: {
  value?: string
  onChange?: (value: string | undefined) => void
  disabled?: boolean
  placeholder?: string
  showTime?: boolean
}) {
  const parsedValue = value ? (showTime ? parseClinicDateTime(value) : dayjs(value)) : null
  return (
    <DatePicker
      allowClear
      disabled={disabled}
      format={showTime ? "DD/MM/YYYY HH:mm" : "DD/MM/YYYY"}
      placeholder={placeholder}
      showTime={showTime ? { format: "HH:mm" } : undefined}
      style={{ width: "100%" }}
      value={parsedValue?.isValid() ? parsedValue : null}
      onChange={(date) => onChange?.(date ? (showTime ? formatClinicDateTimeForApi(date) : date.format("YYYY-MM-DD")) : undefined)}
    />
  )
}

function StaffRelationInput({
  relation,
  lookups,
  value,
  onChange,
  disabled,
  placeholder,
  multiple = false,
}: {
  relation: RelationSpec
  lookups: LookupMap
  value?: unknown
  onChange?: (value: unknown) => void
  disabled?: boolean
  placeholder?: string
  multiple?: boolean
}) {
  const lookupKey = relation.lookupKey || relation.resource
  const selectedIds = Array.isArray(value) ? value.map(String) : value ? [String(value)] : []
  const selectedSignature = selectedIds.join(",")
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const labels = lookups[lookupKey] || lookups.staff || {}
    const missingIds = selectedIds.filter((id) => !labels[id])
    const fromLookup = selectedIds.flatMap((id) => labels[id] ? [{ value: id, label: labels[id] }] : [])
    if (!missingIds.length) { setOptions((current) => [...fromLookup, ...current.filter((item) => !selectedIds.includes(item.value))]); return }
    void Promise.all(missingIds.map((id) => api.get(`/records/staff/${id}`).then((response) => response.data.data).catch(() => null))).then((rows) => {
      const resolved = rows.filter(Boolean).map((row: Record<string, unknown>) => ({ value: String(row.id), label: [row.code, row.fullName].filter(Boolean).join(" · ") || String(row.id) }))
      setOptions((current) => [...fromLookup, ...resolved, ...current.filter((item) => !selectedIds.includes(item.value))])
    })
  }, [lookupKey, lookups, selectedSignature])

  const search = async (keyword: string) => {
    setLoading(true)
    try {
      const response = await api.get("/records/staff", { params: { pageSize: 30, search: keyword, ...relation.params } })
      const rows = response.data.data || []
      const found = rows.map((row: Record<string, unknown>) => ({ value: String(row.id), label: [row.code, row.fullName].filter(Boolean).join(" · ") || String(row.id) }))
      setOptions((current) => [...current.filter((item) => selectedIds.includes(item.value)), ...found.filter((item: { value: string }) => !selectedIds.includes(item.value))])
    } finally { setLoading(false) }
  }

  return <Select allowClear disabled={disabled} filterOption={false} loading={loading} mode={multiple ? "multiple" : undefined} options={options} placeholder={placeholder} showSearch value={value as string | string[] | undefined} onChange={onChange} onSearch={(keyword) => void search(keyword)} />
}

function FieldInput({
  field,
  lookups,
  resource,
  value,
  onChange,
  onCreateRelation,
}: {
  field: FieldSpec
  lookups: LookupMap
  resource: string
  value?: unknown
  onChange?: (value: unknown) => void
  onCreateRelation?: (resource: string) => void
}) {
  const { settings } = useAppUi()
  const placeholder = field.placeholder?.trim() || getDefaultFieldPlaceholder(field)
  const relation = field.relation || relationFields[field.key]
  if (resource === "stock-batches" && field.key === "movementType") {
    const options = (field.options || []).filter((option) => {
      const value = typeof option === "string" ? option : option.value
      return settings.clinicFeatures.returnAndWaste || (value !== "RETURN" && value !== "WASTE")
    })
    return <Select disabled={field.disabled} options={options.map((option) => typeof option === "string" ? { value: option, label: option } : option)} placeholder={placeholder} value={value} onChange={onChange} />
  }
  if (resource === "products" && field.key === "categoryId") return <ProductCategoryInput disabled={field.disabled} value={value} onChange={onChange} />
  if (relation?.resource === "staff") return <StaffRelationInput disabled={field.disabled} lookups={lookups} multiple={field.type === "multi-select"} onChange={onChange} placeholder={placeholder} relation={relation} value={value} />
  if (field.type === "table") return <InlineTableInput columns={field.tableColumns || []} value={value} onChange={onChange} disabled={field.disabled} />
  if (field.type === "combo") return <ComboItemsInput disabled={field.disabled} value={value} onChange={onChange} />
  if (field.type === "service-order-items") return <ServiceOrderItemsInput disabled={field.disabled} resource={resource} value={value} onChange={onChange} />
  if (field.type === "number")
    return (
      <InputNumber
        disabled={field.disabled}
        formatter={field.key === "year" ? undefined : formatNumberInput}
        parser={field.key === "year" ? undefined : parseNumberInput}
        placeholder={placeholder}
        style={{ width: "100%", height: controlHeightBySize(settings.size) }}
        value={value as number | undefined}
        onChange={onChange}
      />
    )
  if (field.type === "select")
    return (
      <Select
        disabled={field.disabled}
        options={(field.options || []).map((opt) =>
          typeof opt === "string" ? { value: opt, label: opt } : opt,
        )}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    )
  if (field.type === "checkbox")
    return (
      <Checkbox
        checked={value === true || value === "true" || value === 1 || value === "1"}
        disabled={field.disabled}
        onChange={(event) => onChange?.(event.target.checked)}
      >
        {field.description || "Hiển thị nội dung này ở khu vực nổi bật"}
      </Checkbox>
    )
  if (field.type === "multi-select")
    return (
      <Select
        disabled={field.disabled}
        mode="multiple"
        options={relation
          ? buildRelationSelectOptions(lookups, relation.lookupKey || relation.resource, relation.resource)
          : (field.options || []).map((opt) => {
            const item = typeof opt === "string" ? { value: opt, label: opt } : opt
            return { ...item, searchLabel: String(item.label) }
          })}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    )
  if (field.type === "dynamic-table")
    return (
      <Select
        allowClear
        disabled={field.disabled}
        mode="multiple"
        options={(field.options || []).map((opt) => typeof opt === "string" ? { value: opt, label: opt } : opt)}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    )
  if (field.type === "file") {
    return (
      <FileSelectInput
        disabled={field.disabled}
        onChange={onChange}
        placeholder={placeholder}
        forceArray={field.key === "files"}
        value={value}
      />
    )
  }
  if (field.type === "video") {
    return (
      <VideoUploadInput
        disabled={field.disabled}
        onChange={onChange}
        placeholder={placeholder}
        value={value}
      />
    )
  }
  if (field.type === "image" || field.key === "imageUrl") {
    return (
      <ImageLibrarySelectInput
        avatar={field.key === "avatarUrl"}
        disabled={field.disabled}
        onChange={onChange}
        placeholder={placeholder}
        value={value}
      />
    )
  }
  if (field.type === "images") {
    return (
      <ImageLibrarySelectInput
        disabled={field.disabled}
        multiple
        onChange={onChange}
        placeholder={placeholder}
        value={value}
      />
    )
  }
  if (relation) {
    if (relation.resource === "file-folders") {
      return (
        <FolderRelationInput
          disabled={field.disabled}
          onChange={onChange}
          placeholder={placeholder}
          value={value}
        />
      )
    }
    const isBaseUnitPicker = resource === "units" && field.key === "baseUnitId"
    const options = buildRelationSelectOptions(lookups, relation.lookupKey || relation.resource, relation.resource)
    const canCreateRelation = Boolean(
      onCreateRelation
      && relation.resource !== resource
      && hasActionAccess(relation.resource, "create"),
    )
    return (
      <Space.Compact block>
        <Select
          allowClear
          disabled={field.disabled}
          showSearch
          optionFilterProp="searchLabel"
          options={isBaseUnitPicker ? [{ value: "__BASE_UNIT__", label: "Đơn vị cơ sở (không quy đổi)" }, ...options] : options}
          placeholder={placeholder}
          value={isBaseUnitPicker && !value ? "__BASE_UNIT__" : value}
          onChange={(nextValue) => onChange?.(isBaseUnitPicker && nextValue === "__BASE_UNIT__" ? null : nextValue)}
        />
        {canCreateRelation ? (
          <Button
            aria-label={`Thêm ${entityLabels[relation.resource] || relation.resource}`}
            disabled={field.disabled}
            icon={<PlusOutlined />}
            title={`Thêm ${entityLabels[relation.resource] || relation.resource}`}
            onClick={() => onCreateRelation?.(relation.resource)}
          />
        ) : null}
      </Space.Compact>
    )
  }
  if (field.type === "textarea")
    return (
      <Input.TextArea
        disabled={field.disabled}
        placeholder={placeholder}
        rows={3}
        value={value as string | undefined}
        onChange={(e) => onChange?.(e.target.value)}
      />
    )
  if (field.type === "html")
    return (
      <PrintTinyMceEditor
        value={value as string | undefined}
        onChange={(nextValue) => onChange?.(nextValue)}
      />
    )
  if (field.type === "date")
    return (
      <ClinicDateInput
        disabled={field.disabled}
        placeholder={placeholder}
        value={value as string | undefined}
        onChange={onChange}
      />
    )
  if (field.type === "datetime")
    return (
      <ClinicDateInput
        disabled={field.disabled}
        showTime
        placeholder={placeholder}
        value={value as string | undefined}
        onChange={onChange}
      />
    )
  const inputPattern = getInputPatternConfig(field.inputPattern)
  if (inputPattern) {
    return (
      <InputMask
        className="ant-input record-form-mask-input"
        disabled={field.disabled}
        mask={inputPattern.mask}
        placeholder={placeholder}
        maskPlaceholder="_"
        alwaysShowMask
        value={String(value ?? "")}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange?.(event.target.value)}
      />
    )
  }
  return (
    <Input
      disabled={field.disabled}
      placeholder={placeholder}
      value={value as string | undefined}
      onChange={(e) => onChange?.(e.target.value)}
    />
  )
}

function InlineTableInput({ columns, value, onChange, disabled }: { columns: NonNullable<FieldSpec["tableColumns"]>; value?: unknown; onChange?: (value: unknown) => void; disabled?: boolean }) {
  const rows = Array.isArray(value) ? value as Array<Record<string, unknown>> : []
  const updateRow = (index: number, key: string, nextValue: unknown) => onChange?.(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: nextValue } : row))
  return <Space direction="vertical" size={8} style={{ width: "100%" }}>
    <Table size="small" bordered pagination={false} rowKey={(_, index) => String(index)} dataSource={rows} scroll={{ x: "max-content" }} columns={[
      ...columns.map((column) => ({ title: column.label, key: column.key, width: 180, render: (_: unknown, row: Record<string, unknown>, index: number) => {
        const current = row[column.key]
        if (column.dataType === "select") return <Select disabled={disabled} value={current as string | undefined} options={(column.options || []).map((item) => ({ value: item, label: item }))} onChange={(next) => updateRow(index, column.key, next)} style={{ width: "100%" }} />
        if (column.dataType === "number" || column.dataType === "money") return <InputNumber disabled={disabled} value={current as number | undefined} onChange={(next) => updateRow(index, column.key, next)} style={{ width: "100%" }} />
        return <Input disabled={disabled} type={column.dataType === "date" ? "date" : column.dataType === "time" ? "time" : "text"} value={current as string | undefined} onChange={(event) => updateRow(index, column.key, event.target.value)} />
      }})),
      { title: "", key: "remove", width: 64, fixed: "right" as const, render: (_: unknown, __: Record<string, unknown>, index: number) => <Button disabled={disabled} danger size="small" type="text" onClick={() => onChange?.(rows.filter((_, rowIndex) => rowIndex !== index))}>Xóa</Button> },
    ]} />
    <Button disabled={disabled || columns.length === 0} size="small" type="dashed" onClick={() => onChange?.([...rows, {}])}>Thêm dòng</Button>
  </Space>
}

function ComboItemsInput({ value, onChange, disabled }: { value?: unknown; onChange?: (value: unknown) => void; disabled?: boolean }) {
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([])
  const rows = Array.isArray(value) ? value as Array<{ productId?: string; quantity?: number }> : []

  useEffect(() => {
    api.get("/records/products", { params: { pageSize: 500 } })
      .then((response) => setOptions((response.data.data || [])
        .filter((item: Record<string, unknown>) => String(item.productType || "").toUpperCase() !== "COMBO")
        .map((item: Record<string, unknown>) => ({ value: String(item.id), label: [item.code, item.name].filter(Boolean).join(" · ") || String(item.id) }))))
      .catch(() => setOptions([]))
  }, [])

  const updateRow = (index: number, patch: Partial<{ productId: string; quantity: number }>) => onChange?.(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row))
  return <Space direction="vertical" size={8} style={{ width: "100%" }}>
    <Table
      size="small"
      dataSource={rows.map((row, index) => ({ ...row, key: index, index }))}
      pagination={false}
      scroll={{ x: 560 }}
      columns={[
        { title: "Sản phẩm / dịch vụ", dataIndex: "productId", render: (current: string | undefined, row: { index: number }) => <Select disabled={disabled} showSearch optionFilterProp="label" options={options} placeholder="Chọn sản phẩm / dịch vụ" style={{ width: "100%" }} value={current} onChange={(productId) => updateRow(row.index, { productId })} /> },
        { title: "Số lượng", dataIndex: "quantity", width: 140, render: (current: number | undefined, row: { index: number }) => <InputNumber disabled={disabled} min={1} style={{ width: "100%" }} value={current} onChange={(quantity) => updateRow(row.index, { quantity: Number(quantity || 0) })} /> },
        { title: "", width: 64, render: (_: unknown, row: { index: number }) => <Button aria-label="Xóa thành phần" danger disabled={disabled} type="text" onClick={() => onChange?.(rows.filter((_, rowIndex) => rowIndex !== row.index))}>Xóa</Button> },
      ]}
    />
    <Button disabled={disabled} icon={<PlusOutlined />} size="small" type="dashed" onClick={() => onChange?.([...rows, { quantity: 1 }])}>Thêm thành phần</Button>
  </Space>
}

function ProductCategoryInput({ value, onChange, disabled }: { value?: unknown; onChange?: (value: unknown) => void; disabled?: boolean }) {
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([])

  useEffect(() => {
    api.get("/product-categories").then((response) => {
      const rows = (response.data.data || []).filter((item: Record<string, unknown>) => item.isActive !== false)
      const byId = new Map(rows.map((item: Record<string, unknown>) => [String(item.id), item]))
      const labelFor = (item: Record<string, unknown>) => {
        const labels = [String(item.name || "")]
        const seen = new Set([String(item.id)])
        let parentId = item.parentId ? String(item.parentId) : ""
        while (parentId && !seen.has(parentId)) {
          seen.add(parentId)
          const parent = byId.get(parentId) as Record<string, unknown> | undefined
          if (!parent) break
          labels.unshift(String(parent.name || ""))
          parentId = parent.parentId ? String(parent.parentId) : ""
        }
        return labels.filter(Boolean).join(" / ")
      }
      setOptions(rows.map((item: Record<string, unknown>) => ({ value: String(item.id), label: labelFor(item) })).sort((left: { label: string }, right: { label: string }) => left.label.localeCompare(right.label, "vi")))
    }).catch(() => setOptions([]))
  }, [])

  return <Select allowClear disabled={disabled} showSearch optionFilterProp="label" options={options} placeholder="Chọn ngành / nhóm / loại" value={value as string | undefined} onChange={onChange} />
}

type ServiceOrderItemValue = { productId?: string; variantId?: string; variantCode?: string; variantAttributes?: Record<string, string>; itemName?: string; quantity?: number; unitPrice?: number; transferUnitId?: string; isComboComponent?: boolean; parentComboProductId?: string }
type ServiceOrderProductOption = { value: string; label: string; name: string; sellingPrice: number; productType: string; bundleItems: Array<{ productId: string; quantity: number }>; baseUnitId?: string; variantId?: string; variantCode?: string; variantAttributes?: Record<string, string> }

function ServiceOrderItemsInput({ resource, value, onChange, disabled }: { resource: string; value?: unknown; onChange?: (value: unknown) => void; disabled?: boolean }) {
  if (resource === "stock-batches") return <StockBatchItemsInput disabled={disabled} value={value} onChange={onChange} />
  const [products, setProducts] = useState<ServiceOrderProductOption[]>([])
  const [units, setUnits] = useState<Array<{ value: string; label: string }>>([])
  const rows = Array.isArray(value) ? value as ServiceOrderItemValue[] : []

  useEffect(() => {
    Promise.all([api.get("/records/service-orders/product-options"), api.get("/records/units", { params: { pageSize: 500 } })]).then(([productsResponse, unitsResponse]) => {
      setProducts((productsResponse.data.data || []).map((row: Record<string, unknown>) => ({
        value: String(row.id), label: `${row.code || ""}${row.variantCode ? ` / ${row.variantCode}` : ""} - ${row.name || row.id}${row.variantName ? ` - ${row.variantName}` : ""}`,
        name: String(row.variantName ? `${row.name || ""} - ${row.variantName}` : row.name || row.id), sellingPrice: Number(row.sellingPrice || 0), productType: String(row.productType || ""),
        bundleItems: Array.isArray(row.bundleItems) ? row.bundleItems as Array<{ productId: string; quantity: number }> : [], baseUnitId: row.baseUnitId ? String(row.baseUnitId) : undefined,
        variantId: row.variantId ? String(row.variantId) : undefined, variantCode: row.variantCode ? String(row.variantCode) : undefined, variantAttributes: row.variantAttributes as Record<string, string> | undefined,
      })))
      setUnits((unitsResponse.data.data || []).map((row: Record<string, unknown>) => ({ value: String(row.id), label: String(row.name || row.id) })))
    }).catch(() => { setProducts([]); setUnits([]) })
  }, [])

  const updateRows = (nextRows: ServiceOrderItemValue[]) => onChange?.(nextRows)
  const updateRow = (index: number, patch: Partial<ServiceOrderItemValue>) => updateRows(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row))
  const selectProduct = (index: number, productId?: string) => {
    const product = products.find((item) => item.value === productId)
    const selectedQuantity = Number(rows[index]?.quantity || 1)
    const nextRows = [...rows]
    nextRows[index] = { ...nextRows[index], productId, variantId: product?.variantId, variantCode: product?.variantCode, variantAttributes: product?.variantAttributes, itemName: product?.name, quantity: selectedQuantity, unitPrice: product ? Number(nextRows[index]?.unitPrice || product.sellingPrice) : nextRows[index]?.unitPrice, transferUnitId: product?.baseUnitId, isComboComponent: false, parentComboProductId: undefined }
    if (product?.productType === "COMBO" && product.bundleItems.length) {
      const components = product.bundleItems.flatMap((component) => {
        const componentProduct = products.find((item) => item.value === component.productId)
        return componentProduct ? [{ productId: componentProduct.value, variantId: componentProduct.variantId, variantCode: componentProduct.variantCode, variantAttributes: componentProduct.variantAttributes, itemName: componentProduct.name, quantity: selectedQuantity * Number(component.quantity || 1), unitPrice: 0, transferUnitId: componentProduct.baseUnitId, isComboComponent: true, parentComboProductId: product.value }] : []
      })
      nextRows.splice(index + 1, 0, ...components)
    }
    updateRows(nextRows)
  }
  const source = rows.length ? rows : []
  return <Space direction="vertical" size={8} style={{ width: "100%" }}>
    <Table size="small" dataSource={source.map((row, index) => ({ ...row, key: index, index }))} pagination={false} scroll={{ x: 900 }} columns={[
      { title: "Sản phẩm", dataIndex: "productId", width: 270, render: (current: string | undefined, row: ServiceOrderItemValue & { index: number }) => <Select disabled={disabled || row.isComboComponent} showSearch optionFilterProp="label" options={products} placeholder="Chọn sản phẩm" style={{ width: "100%" }} value={current} onChange={(next) => selectProduct(row.index, next)} /> },
      { title: "Đơn vị", dataIndex: "transferUnitId", width: 150, render: (current: string | undefined, row: ServiceOrderItemValue & { index: number }) => <Select disabled={disabled || row.isComboComponent} options={units} placeholder="Đơn vị" style={{ width: "100%" }} value={current} onChange={(next) => updateRow(row.index, { transferUnitId: next })} /> },
      { title: "SL", dataIndex: "quantity", width: 100, render: (current: number | undefined, row: ServiceOrderItemValue & { index: number }) => <InputNumber disabled={disabled} min={1} style={{ width: "100%" }} value={current} onChange={(next) => updateRow(row.index, { quantity: Number(next || 0) })} /> },
      { title: "Đơn giá", dataIndex: "unitPrice", width: 140, render: (current: number | undefined, row: ServiceOrderItemValue & { index: number }) => <InputNumber disabled={disabled || row.isComboComponent} min={0} style={{ width: "100%" }} value={current} onChange={(next) => updateRow(row.index, { unitPrice: Number(next || 0) })} /> },
      { title: "", width: 56, render: (_: unknown, row: ServiceOrderItemValue & { index: number }) => <Button aria-label="Xóa dòng" danger disabled={disabled} icon={<DeleteOutlined />} type="text" onClick={() => updateRows(rows.filter((_, rowIndex) => rowIndex !== row.index))} /> },
    ]} />
    <Button disabled={disabled} icon={<PlusOutlined />} size="small" type="dashed" onClick={() => updateRows([...rows, { quantity: 1 }])}>Thêm sản phẩm</Button>
  </Space>
}

type StockBatchItem = { productId?: string; batchNumber?: string; expiryDate?: string; batchId?: string; quantity?: number; transferUnitId?: string; supplierId?: string }

function StockBatchItemsInput({ value, onChange, disabled }: { value?: unknown; onChange?: (value: unknown) => void; disabled?: boolean }) {
  const { settings } = useAppUi()
  const movementType = Form.useWatch("movementType") as "IMPORT" | "EXPORT" | "TRANSFER" | undefined
  const branchId = Form.useWatch("branchId") as string | undefined
  const [products, setProducts] = useState<Array<{ value: string; label: string; baseUnitId?: string }>>([])
  const [units, setUnits] = useState<Array<{ value: string; label: string; baseUnitId?: string }>>([])
  const warehouseId = Form.useWatch("warehouseId") as string | undefined
  const [batches, setBatches] = useState<Array<{ value: string; label: string; branchId: string; warehouseId?: string }>>([])
  const rows = Array.isArray(value) ? value as StockBatchItem[] : []

  useEffect(() => {
    api.get("/records/stock-batches/form-options").then((response) => {
      const data = response.data.data || {}
      setProducts((data.products || []).map((row: Record<string, unknown>) => ({ value: String(row.id), label: `${row.code || ""} - ${row.name || row.id}`, baseUnitId: row.baseUnitId ? String(row.baseUnitId) : undefined })))
      setUnits((data.units || []).map((row: Record<string, unknown>) => ({ value: String(row.id), label: String(row.name || row.id), baseUnitId: row.baseUnitId ? String(row.baseUnitId) : undefined })))
      setBatches((data.batches || []).map((row: Record<string, unknown>) => ({ value: String(row.id), label: `${row.batchNumber || row.id} · tồn ${Number(row.remainingQuantity || 0).toLocaleString("vi-VN")} ${row.unit || ""}`, branchId: String(row.branchId || ""), warehouseId: row.warehouseId ? String(row.warehouseId) : undefined })))
    }).catch(() => { setProducts([]); setUnits([]); setBatches([]) })
  }, [])

  const updateRows = (nextRows: StockBatchItem[]) => onChange?.(nextRows)
  const updateRow = (index: number, patch: Partial<StockBatchItem>) => updateRows(rows.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row))
  const visibleBatches = batches.filter((batch) => (!branchId || batch.branchId === branchId) && (!warehouseId || batch.warehouseId === warehouseId))
  const isExport = movementType === "EXPORT" || movementType === "TRANSFER"
  const lotTracking = settings.clinicFeatures.lotTracking
  const addRow = () => updateRows([...rows, { quantity: 1 }])
  const removeRow = (index: number) => updateRows(rows.filter((_, rowIndex) => rowIndex !== index))
  const source = rows.map((row, index) => ({ ...row, key: index, index }))
  const columns = isExport ? (lotTracking ? [
    { title: "Lô hàng", dataIndex: "batchId", width: 410, render: (current: string | undefined, row: StockBatchItem & { index: number }) => <Select disabled={disabled} showSearch optionFilterProp="label" options={visibleBatches} placeholder="Chọn lô hàng để xuất" style={{ width: "100%" }} value={current} onChange={(next) => updateRow(row.index, { batchId: next })} /> },
    { title: "SL xuất", dataIndex: "quantity", width: 130, render: (current: number | undefined, row: StockBatchItem & { index: number }) => <InputNumber disabled={disabled} min={1} style={{ width: "100%" }} value={current} onChange={(next) => updateRow(row.index, { quantity: Number(next || 0) })} /> },
  ] : [
    { title: "SP", dataIndex: "productId", width: 410, render: (current: string | undefined, row: StockBatchItem & { index: number }) => <Select disabled={disabled} showSearch optionFilterProp="label" options={products} placeholder="Chọn SP để xuất" style={{ width: "100%" }} value={current} onChange={(next) => updateRow(row.index, { productId: next, batchId: undefined })} /> },
    { title: "SL xuất", dataIndex: "quantity", width: 130, render: (current: number | undefined, row: StockBatchItem & { index: number }) => <InputNumber disabled={disabled} min={1} style={{ width: "100%" }} value={current} onChange={(next) => updateRow(row.index, { quantity: Number(next || 0) })} /> },
  ]) : [
    { title: "Sản phẩm", dataIndex: "productId", width: 250, render: (current: string | undefined, row: StockBatchItem & { index: number }) => <Select disabled={disabled} showSearch optionFilterProp="label" options={products} placeholder="Chọn sản phẩm" style={{ width: "100%" }} value={current} onChange={(next) => { const product = products.find((item) => item.value === next); updateRow(row.index, { productId: next, transferUnitId: product?.baseUnitId }) }} /> },
    ...(lotTracking ? [
      { title: "Số lô", dataIndex: "batchNumber", width: 160, render: (current: string | undefined, row: StockBatchItem & { index: number }) => <Input disabled={disabled} placeholder="VD: LO-0627" value={current} onChange={(event) => updateRow(row.index, { batchNumber: event.target.value })} /> },
      { title: "Hạn dùng", dataIndex: "expiryDate", width: 155, render: (current: string | undefined, row: StockBatchItem & { index: number }) => <DatePicker disabled={disabled} format="DD/MM/YYYY" style={{ width: "100%" }} value={current ? dayjs(current) : null} onChange={(next) => updateRow(row.index, { expiryDate: next?.format("YYYY-MM-DD") })} /> },
    ] : []),
    { title: "SL nhập", dataIndex: "quantity", width: 120, render: (current: number | undefined, row: StockBatchItem & { index: number }) => <InputNumber disabled={disabled} min={1} style={{ width: "100%" }} value={current} onChange={(next) => updateRow(row.index, { quantity: Number(next || 0) })} /> },
    { title: "Đơn vị", dataIndex: "transferUnitId", width: 150, render: (current: string | undefined, row: StockBatchItem & { index: number }) => { const product = products.find((item) => item.value === row.productId); return <Select disabled={disabled || !product} options={units.filter((unit) => unit.value === product?.baseUnitId || unit.baseUnitId === product?.baseUnitId)} placeholder="Chọn đơn vị" style={{ width: "100%" }} value={current} onChange={(next) => updateRow(row.index, { transferUnitId: next })} /> } },
  ]
  return <Space direction="vertical" size={8} style={{ width: "100%" }}><Table size="small" dataSource={source} pagination={false} scroll={{ x: 880 }} columns={[...columns, { title: "", width: 56, render: (_: unknown, row: StockBatchItem & { index: number }) => <Button aria-label="Xóa dòng" danger disabled={disabled} icon={<DeleteOutlined />} type="text" onClick={() => removeRow(row.index)} /> }]} /><Button disabled={disabled} icon={<PlusOutlined />} size="small" type="dashed" onClick={addRow}>{movementType === "TRANSFER" ? "Thêm lô chuyển" : isExport ? "Thêm lô xuất" : "Thêm sản phẩm"}</Button></Space>
}

function getDefaultFieldPlaceholder(field: FieldSpec) {
  const label = field.label.trim().toLowerCase()
  if (field.type === "select" || field.type === "multi-select" || field.type === "dynamic-table" || field.type === "relative" || field.type === "file" || field.type === "image" || field.type === "images" || field.relation || relationFields[field.key] || field.key === "imageUrl") {
    return `Chọn ${label}`
  }
  if (field.type === "date" || field.type === "datetime") return `Chọn ${label}`
  return `Nhập ${label}`
}

function buildRelationSelectOptions(lookups: LookupMap, lookupKey: string, resource: string) {
  const labels = lookups[lookupKey] || {}
  const metaMap = getRelationMetaMap(lookups, lookupKey)
  const fallbackMetaMap = lookupKey === resource ? metaMap : getRelationMetaMap(lookups, resource)

  return Object.entries(labels).map(([value, label]) => {
    const meta = metaMap[value] || fallbackMetaMap[value]
    if (!meta || !["customers", "leads", "staff"].includes(resource)) {
      return { value, label, searchLabel: String(label) }
    }
    const primaryText = meta.fullName || meta.name || meta.display_title || String(label)
    const secondaryText = ""
    return {
      value,
      label: renderRelationSelectLabel(meta, primaryText, secondaryText),
      searchLabel: `${meta.code || ""} ${primaryText}`.trim(),
    }
  })
}

function renderRelationSelectLabel(meta: RelationLookupRecord, primaryText: string, secondaryText: string) {
  return (
    <span className="relation-entity-card compact">
      <Avatar
        className="relation-entity-card__avatar"
        icon={<UserOutlined />}
        size={24}
        src={meta.avatarUrl ? resolveFileUrl(String(meta.avatarUrl)) : undefined}
      />
      <span className="relation-entity-card__copy">
        <strong>{primaryText}</strong>
        {secondaryText ? <span>{secondaryText}</span> : null}
      </span>
    </span>
  )
}

interface LibraryImageOption {
  value: string
  title: string
  previewUrl: string
  fileId: string
  source?: "local" | "google"
  folderId?: string
  folderLabel?: string
}

interface FileLibraryOption {
  value: string
  title: string
  previewUrl: string
  fileId: string
  source?: "local" | "google"
  folderId?: string
  folderLabel?: string
  isImage: boolean
  mimeType: string
  extension: string
}

/** Stores the public URL, rather than an internal file id, so customer apps
 * can play the uploaded short video without accessing the CMS file library. */
function VideoUploadInput({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value?: unknown
  onChange?: (value: unknown) => void
  disabled?: boolean
  placeholder?: string
}) {
  const screens = Grid.useBreakpoint()
  const [openUpload, setOpenUpload] = useState(false)
  const videoUrl = typeof value === "string" ? value : ""

  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      {videoUrl ? (
        <video
          controls
          preload="metadata"
          src={resolveFileUrl(videoUrl)}
          style={{ width: "100%", maxHeight: 260, borderRadius: 8, background: "#101828" }}
        />
      ) : null}
      <Space.Compact style={{ width: "100%" }}>
        <Input disabled placeholder={placeholder} value={videoUrl || undefined} />
        <Button disabled={disabled} onClick={() => setOpenUpload(true)}>
          {videoUrl ? "Thay video" : "Upload video"}
        </Button>
      </Space.Compact>
      {videoUrl ? (
        <Button disabled={disabled} type="link" style={{ width: "fit-content", padding: 0 }} onClick={() => onChange?.(undefined)}>
          Bỏ video
        </Button>
      ) : null}
      <Modal
        destroyOnHidden
        footer={null}
        maskClosable={false}
        open={openUpload}
        title="Upload video ngắn"
        width={screens.md ? 620 : "calc(100vw - 16px)"}
        onCancel={() => setOpenUpload(false)}
      >
        <FileUploadPanel
          accept="video/*"
          multiple={false}
          onCancel={() => setOpenUpload(false)}
          onSuccess={(files) => {
            const uploadedUrl = resolveFileUrl(files[0]?.publicUrl)
            if (uploadedUrl) onChange?.(uploadedUrl)
            setOpenUpload(false)
          }}
        />
      </Modal>
    </Space>
  )
}

function FileSelectInput({
  value,
  onChange,
  disabled,
  placeholder,
  forceArray = false,
}: {
  value?: unknown
  onChange?: (value: unknown) => void
  disabled?: boolean
  placeholder?: string
  forceArray?: boolean
}) {
  const screens = Grid.useBreakpoint()
  const [openPicker, setOpenPicker] = useState(false)
  const [openUpload, setOpenUpload] = useState(false)
  const [options, setOptions] = useState<FileLibraryOption[]>([])
  const [googleOptions, setGoogleOptions] = useState<FileLibraryOption[]>([])
  const [treeData, setTreeData] = useState<FolderTreeNode[]>([])
  const [googleTreeData, setGoogleTreeData] = useState<FolderTreeNode[]>([])
  const [search, setSearch] = useState("")
  const [source, setSource] = useState<"local" | "google">("local")
  const [manualLink, setManualLink] = useState("")
  const [selectedFolderId, setSelectedFolderId] = useState<string>()
  const [selectedGoogleFolderId, setSelectedGoogleFolderId] = useState("root")
  const [draftValues, setDraftValues] = useState<string[]>([])
  const [folderChildrenMap, setFolderChildrenMap] = useState<Record<string, string[]>>({})
  const [folderPathMap, setFolderPathMap] = useState<Record<string, string>>({})
  const [googleFolderPathMap, setGoogleFolderPathMap] = useState<Record<string, string>>({ root: "Google Drive" })
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false)

  useEffect(() => {
    void loadOptions()
  }, [])

  useEffect(() => {
    if (openPicker) {
      setDraftValues(normalizeStringArray(value))
    }
  }, [openPicker, value])

  async function loadOptions() {
    const [fileRows, foldersResponse] = await Promise.all([
      loadFileLibraryRows(200),
      api.get("/records/file-folders", { params: { pageSize: 200 } }),
    ])
    const folderRows = normalizeFileFolderRows(foldersResponse.data.data || [])
    const folders = buildFolderPathMap(folderRows)
    setTreeData(buildFolderTree(folderRows))
    setFolderChildrenMap(buildFolderChildrenMap(folderRows))
    setFolderPathMap(folders)
    setOptions(
      fileRows.map((row: Record<string, unknown>) => ({
        value: String(row.id),
        title: String(row.title || row.originalName || row.id),
        previewUrl: resolveFileUrl(String(row.publicUrl || "")),
        fileId: String(row.id),
        folderId: row.folderId ? String(row.folderId) : undefined,
        folderLabel: folders[String(row.folderId)],
        isImage: isImageFile(row),
        mimeType: String(row.mimeType || ""),
        extension: String(row.extension || ""),
      })),
    )
    try {
      const statusResponse = await api.get("/settings/google-drive")
      setGoogleDriveConnected(Boolean(statusResponse.data?.data?.connected))
    } catch {
      setGoogleDriveConnected(false)
    }
  }

  async function loadGoogleDriveFiles(parentId = selectedGoogleFolderId) {
    try {
      const [filesResponse, foldersResponse] = await Promise.all([
        api.get("/settings/google-drive/files", { params: { q: search.trim() || undefined, parentId } }),
        api.get("/settings/google-drive/folders"),
      ])
      const googleFolders = [
        { id: "root", name: "Google Drive", parentId: null },
        ...((foldersResponse.data?.data?.folders || []) as Array<Record<string, unknown>>).map((folder) => ({
          id: String(folder.id || ""), name: String(folder.name || folder.id || ""), parentId: folder.parentId ? String(folder.parentId) : "root",
        })).filter((folder) => folder.id),
      ]
      const paths = buildFolderPathMap(googleFolders)
      setGoogleTreeData(buildFolderTree(googleFolders))
      setGoogleFolderPathMap({ root: "Google Drive", ...paths })
      setGoogleOptions(((filesResponse.data?.data?.files || []) as Array<Record<string, unknown>>).map((row) => {
        const publicUrl = String(row.publicUrl || "")
        const mimeType = String(row.mimeType || "")
        const title = String(row.title || row.originalName || row.id)
        return {
          value: publicUrl,
          title,
          previewUrl: String(row.thumbnailUrl || publicUrl),
          fileId: `google-${String(row.id || title)}`,
          source: "google" as const,
          folderId: parentId,
          folderLabel: parentId === "root" ? "Google Drive" : (paths[parentId] || "Google Drive"),
          isImage: mimeType.startsWith("image/"),
          mimeType,
          extension: title.includes(".") ? title.split(".").pop() || "" : "",
        }
      }).filter((option) => option.value))
    } catch (error) {
      setGoogleOptions([])
      toastError(getApiErrorMessage(error, "Không thể đọc Google Drive"))
    }
  }

  async function connectGoogleDrive() {
    try {
      const response = await api.post("/settings/google-drive/connect")
      const authorizationUrl = String(response.data?.data?.authorizationUrl || "")
      if (!authorizationUrl) throw new Error("Không lấy được đường dẫn xác thực Google")
      const popup = window.open(authorizationUrl, "company-google-drive", "popup=yes,width=620,height=720")
      if (!popup) throw new Error("Trình duyệt đang chặn popup")
      const timer = window.setInterval(() => {
        if (!popup.closed) return
        window.clearInterval(timer)
        void loadOptions()
        void loadGoogleDriveFiles()
      }, 800)
    } catch (error) {
      toastError(getApiErrorMessage(error, "Không thể kết nối Google Drive"))
    }
  }

  const optionByValue = new Map([...options, ...googleOptions].map((option) => [option.value, option]))
  const toFileOption = (item: string) => optionByValue.get(item) || buildExternalFileOption(item)
  const emitValue = (values: string[]) => onChange?.(forceArray ? (values.length > 0 ? values : undefined) : toSingleOrArray(values))
  const addManualLink = (rawValue: string) => {
    const nextValue = rawValue.trim()
    if (!nextValue) return
    setDraftValues((current) => Array.from(new Set([...current, nextValue])))
    setManualLink("")
  }

  const selectedValues = normalizeStringArray(value)
  const selectedItems = selectedValues.map(toFileOption)
  const selectedDraftItems = draftValues.map(toFileOption)
  const activeOptions = source === "google" ? googleOptions : options
  const visibleOptions = activeOptions.filter((option) => {
    const keyword = search.trim().toLowerCase()
    const matchesSearch = !keyword
      || option.title.toLowerCase().includes(keyword)
      || String(option.folderLabel || "").toLowerCase().includes(keyword)
      || option.extension.toLowerCase().includes(keyword)
    if (!matchesSearch) return false
    if (source === "google" || !selectedFolderId) return true
    const allowedFolders = new Set([selectedFolderId, ...(folderChildrenMap[selectedFolderId] || [])])
    return option.folderId ? allowedFolders.has(option.folderId) : false
  })
  const summaryValue = selectedItems.length === 0
    ? undefined
    : selectedItems.length === 1
      ? selectedItems[0].title
      : `${selectedItems.length} file đã chọn`

  return (
    <>
      <Space.Compact style={{ width: "100%" }}>
        <Input
          disabled
          placeholder={placeholder}
          style={{ width: "100%" }}
          value={summaryValue}
        />
        <Button disabled={disabled} onClick={() => setOpenPicker(true)}>
          Chọn file
        </Button>
      </Space.Compact>
      {selectedItems.length > 0 ? (
        <div className="file-selection-strip">
          {selectedItems.map((item) => (
            <div key={item.fileId} className="file-selection-pill">
              <span className="file-selection-pill-icon">{renderFileIcon(item)}</span>
              <span>{item.title}</span>
            </div>
          ))}
        </div>
      ) : null}
      <Modal
        destroyOnHidden
        maskClosable={false}
        open={openPicker}
        title="Thư viện file"
        width={screens.lg ? 1080 : "calc(100vw - 16px)"}
        onCancel={() => setOpenPicker(false)}
        footer={[
          <Button key="clear" onClick={() => { setDraftValues([]); emitValue([]) }}>
            Bỏ chọn
          </Button>,
          <Button key="cancel" onClick={() => setOpenPicker(false)}>
            Đóng
          </Button>,
          <Button
            key="select"
            className="primary-glow"
            disabled={draftValues.length === 0}
            type="primary"
            onClick={() => {
              emitValue(draftValues)
              setOpenPicker(false)
            }}
          >
            Chọn {draftValues.length > 0 ? draftValues.length : ""} file
          </Button>,
        ]}
      >
        <div className="image-library-picker">
          <div className="image-library-sidebar">
            <div className="image-library-sidebar-header">
              <Typography.Text className="eyebrow">Thư mục</Typography.Text>
              <Typography.Title level={5}>Cây thư mục</Typography.Title>
            </div>
            <Button block onClick={() => setSelectedFolderId(undefined)}>
              Tất cả folder
            </Button>
            <Tabs
              activeKey={source}
              items={[
                { key: "local", label: "Thư viện" },
                { key: "google", label: "Google Drive" },
              ]}
              onChange={(key) => {
                const nextSource = key === "google" ? "google" : "local"
                setSource(nextSource)
                if (nextSource === "google") void loadGoogleDriveFiles(selectedGoogleFolderId)
              }}
            />
            <Tree
              blockNode
              className="image-library-tree"
              defaultExpandAll
              filterTreeNode={(node) => String(node.title || "").toLowerCase().includes(search.trim().toLowerCase())}
              selectedKeys={source === "google" ? [selectedGoogleFolderId] : (selectedFolderId ? [selectedFolderId] : [])}
              treeData={source === "google" ? googleTreeData : treeData}
              onSelect={(keys) => {
                const folderId = keys[0] ? String(keys[0]) : undefined
                if (source === "google") {
                  const nextFolderId = folderId || "root"
                  setSelectedGoogleFolderId(nextFolderId)
                  void loadGoogleDriveFiles(nextFolderId)
                  return
                }
                setSelectedFolderId(folderId)
              }}
            />
          </div>
          <div className="image-library-browser">
            <div className="image-library-toolbar">
              <Input.Search
                allowClear
                placeholder="Tìm theo tên tệp, đuôi tệp hoặc thư mục"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onSearch={() => { if (source === "google") void loadGoogleDriveFiles(selectedGoogleFolderId) }}
              />
              {source === "local" ? <>
                <Input.Search
                  allowClear
                  enterButton="Thêm link"
                  placeholder="Dán link Google Drive/local"
                  value={manualLink}
                  onChange={(event) => setManualLink(event.target.value)}
                  onSearch={addManualLink}
                />
                <Button onClick={() => setOpenUpload(true)}>Tải tệp mới lên</Button>
              </> : null}
              {source === "google" && !googleDriveConnected ? <Button onClick={() => void connectGoogleDrive()}>Kết nối Google Drive</Button> : null}
            </div>
            <div className="image-library-current-folder">
              <Typography.Text type="secondary">
                {source === "google"
                  ? (googleFolderPathMap[selectedGoogleFolderId] || "Google Drive")
                  : (selectedFolderId ? folderPathMap[selectedFolderId] || "Thư mục đã chọn" : "Đang xem tất cả thư mục")}
              </Typography.Text>
            </div>
            <div className="image-library-content">
              <div className="image-library-grid">
                {visibleOptions.length === 0 ? (
                  <div className="image-library-empty">
                    <Empty description="Không có file phù hợp" />
                  </div>
                ) : (
                  visibleOptions.map((option) => {
                    const active = draftValues.includes(option.value)
                    return (
                      <button
                        key={option.fileId}
                        className={`image-library-card${active ? " active" : ""}`}
                        type="button"
                        onClick={() => setDraftValues((current) => toggleStringInList(current, option.value))}
                        onDoubleClick={() => {
                          const nextValues = toggleStringInList(draftValues, option.value)
                          emitValue(nextValues)
                          setOpenPicker(false)
                        }}
                      >
                        {option.isImage ? (
                          <img alt={option.title} src={option.previewUrl} />
                        ) : (
                          <div className="file-library-thumb">
                            <span className="file-library-icon">{renderFileIcon(option, true)}</span>
                            <span className="file-library-ext">{option.extension || "FILE"}</span>
                          </div>
                        )}
                        <div className="image-library-card-copy">
                          <strong>{option.title}</strong>
                          <span>{option.folderLabel || "Không có thư mục"}</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              <div className="image-library-preview">
                {selectedDraftItems.length > 0 ? (
                  <>
                    <Typography.Title level={5}>{selectedDraftItems.length} file đang chọn</Typography.Title>
                    <div className="file-preview-list">
                      {selectedDraftItems.map((item) => (
                        <div key={item.fileId} className="file-preview-row">
                          {item.isImage ? (
                            <img alt={item.title} src={item.previewUrl} className="file-preview-image" />
                          ) : (
                            <div className="file-preview-fallback">{renderFileIcon(item, true)}</div>
                          )}
                          <div className="file-preview-copy">
                            <strong>{item.title}</strong>
                            <span>{item.folderLabel || "Không có thư mục"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <Empty description="Chọn một hoặc nhiều tệp để xem trước" />
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <Modal
        destroyOnHidden
        footer={null}
        maskClosable={false}
        open={openUpload}
        title="Tải tệp lên thư mục"
        width={screens.md ? 620 : "calc(100vw - 16px)"}
        onCancel={() => setOpenUpload(false)}
      >
        <FileUploadPanel
          defaultFolderId={selectedFolderId}
          multiple
          onCancel={() => setOpenUpload(false)}
          onSuccess={(files) => {
            void loadOptions()
            const nextValues = Array.from(new Set([...draftValues, ...files.map((item) => item.id)]))
            setDraftValues(nextValues)
            emitValue(nextValues)
            setOpenUpload(false)
          }}
        />
      </Modal>
    </>
  )
}

function FolderRelationInput({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value?: unknown
  onChange?: (value: unknown) => void
  disabled?: boolean
  placeholder?: string
}) {
  const [treeData, setTreeData] = useState<FolderTreeNode[]>([])

  useEffect(() => {
    void loadFolders()
  }, [])

  async function loadFolders() {
    const response = await api.get("/records/file-folders", { params: { pageSize: 200 } })
    setTreeData(buildFolderTree(normalizeFileFolderRows(response.data.data || [])))
  }

  return (
    <TreeSelect
      allowClear
      disabled={disabled}
      placeholder={placeholder}
      showSearch
      treeData={treeData}
      treeDefaultExpandAll
      treeNodeFilterProp="title"
      value={value as string | undefined}
      onChange={onChange}
    />
  )
}

export function ImageLibrarySelectInput({
  value,
  onChange,
  disabled,
  placeholder,
  multiple = false,
  avatar = false,
}: {
  value?: unknown
  onChange?: (value: unknown) => void
  disabled?: boolean
  placeholder?: string
  multiple?: boolean
  avatar?: boolean
}) {
  const screens = Grid.useBreakpoint()
  const [openPicker, setOpenPicker] = useState(false)
  const [openUpload, setOpenUpload] = useState(false)
  const [options, setOptions] = useState<LibraryImageOption[]>([])
  const [googleOptions, setGoogleOptions] = useState<LibraryImageOption[]>([])
  const [treeData, setTreeData] = useState<FolderTreeNode[]>([])
  const [googleTreeData, setGoogleTreeData] = useState<FolderTreeNode[]>([])
  const [search, setSearch] = useState("")
  const [source, setSource] = useState<"local" | "google">("local")
  const [selectedFolderId, setSelectedFolderId] = useState<string>()
  const [selectedGoogleFolderId, setSelectedGoogleFolderId] = useState<string>("root")
  const [draftValues, setDraftValues] = useState<string[]>([])
  const [folderChildrenMap, setFolderChildrenMap] = useState<Record<string, string[]>>({})
  const [googleFolderChildrenMap, setGoogleFolderChildrenMap] = useState<Record<string, string[]>>({})
  const [folderPathMap, setFolderPathMap] = useState<Record<string, string>>({})
  const [googleFolderPathMap, setGoogleFolderPathMap] = useState<Record<string, string>>({ root: "Google Drive" })

  useEffect(() => {
    void loadOptions()
  }, [])

  useEffect(() => {
    if (openPicker) {
      setDraftValues(Array.isArray(value) ? value.map(String) : typeof value === "string" && value ? [value] : [])
    }
  }, [openPicker, value])

  async function loadOptions() {
    const [fileRows, foldersResponse] = await Promise.all([
      loadFileLibraryRows(200),
      api.get("/records/file-folders", { params: { pageSize: 200 } }),
    ])
    const folderRows = normalizeFileFolderRows(foldersResponse.data.data || [])
    const folders = buildFolderPathMap(folderRows)
    setTreeData(buildFolderTree(folderRows))
    setFolderChildrenMap(buildFolderChildrenMap(folderRows))
    setFolderPathMap(folders)
    const nextOptions = fileRows
      .filter((row: Record<string, unknown>) => isImageFile(row))
      .map((row: Record<string, unknown>) => {
        const title = String(row.title || row.originalName || row.id)
        const folderLabel = folders[String(row.folderId)]
        const previewUrl = resolveFileUrl(String(row.publicUrl || ""))
        return {
          value: previewUrl,
          title: `${title}${folderLabel ? ` ${folderLabel}` : ""}`,
          previewUrl,
          fileId: String(row.id),
          folderId: row.folderId ? String(row.folderId) : undefined,
          folderLabel,
        }
      })
    setOptions(nextOptions)
    await loadGoogleDriveImages()
  }

  async function loadGoogleDriveImages(parentId = selectedGoogleFolderId) {
    try {
      const [filesResponse, foldersResponse] = await Promise.all([
        api.get("/settings/google-drive/files", { params: { q: search.trim() || undefined, parentId } }),
        api.get("/settings/google-drive/folders"),
      ])
      const googleFolders = [
        { id: "root", name: "Google Drive", parentId: null },
        ...((foldersResponse.data?.data?.folders || []) as Array<Record<string, unknown>>).map((folder) => ({
          id: String(folder.id || ""),
          name: String(folder.name || folder.id || ""),
          parentId: folder.parentId ? String(folder.parentId) : "root",
        })).filter((folder) => folder.id),
      ]
      const googleFolderPaths = buildFolderPathMap(googleFolders)
      setGoogleTreeData(buildFolderTree(googleFolders))
      setGoogleFolderChildrenMap(buildFolderChildrenMap(googleFolders))
      setGoogleFolderPathMap({ root: "Google Drive", ...googleFolderPaths })
      setGoogleOptions(((filesResponse.data?.data?.files || []) as Array<Record<string, unknown>>)
        .filter((row) => isImageFile(row))
        .map((row) => {
          const title = String(row.title || row.originalName || row.id)
          const folderLabel = parentId === "root" ? "Google Drive" : (googleFolderPaths[parentId] || "Google Drive")
          const thumbnailUrl = String(row.thumbnailUrl || "")
          const publicUrl = String(row.publicUrl || "")
          const previewUrl = thumbnailUrl || publicUrl
          return {
            value: previewUrl || publicUrl,
            title: `${title}${folderLabel ? ` ${folderLabel}` : ""}`,
            previewUrl,
            fileId: `google-${String(row.id || title)}`,
            source: "google" as const,
            folderId: parentId,
            folderLabel,
          }
        }).filter((option) => option.value && option.previewUrl))
    } catch {
      setGoogleOptions([])
      setGoogleTreeData([{ key: "root", value: "root", title: "Google Drive" } as FolderTreeNode])
    }
  }

  const selectedValues = Array.isArray(value) ? value.map(String) : typeof value === "string" && value ? [value] : []
  const allOptions = [...options, ...googleOptions]
  const activeOptions = source === "google" ? googleOptions : options
  const selectedOptions = allOptions.filter((option) => selectedValues.includes(option.value))
  const selectedDraft = allOptions.find((option) => draftValues.includes(option.value))
  const visibleOptions = activeOptions.filter((option) => {
    const keyword = search.trim().toLowerCase()
    const matchesSearch = !keyword
      || option.title.toLowerCase().includes(keyword)
      || String(option.folderLabel || "").toLowerCase().includes(keyword)
    if (!matchesSearch) return false
    if (source === "google") return true
    const currentFolderId = selectedFolderId
    if (!currentFolderId) return true
    const allowedFolders = new Set([currentFolderId, ...(folderChildrenMap[currentFolderId] || [])])
    return option.folderId ? allowedFolders.has(option.folderId) : false
  })

  return (
    <Space direction={avatar ? "vertical" : "horizontal"} size={8} style={{ width: "100%" }} align="center">
      {avatar ? (
        <button
          aria-label={selectedValues.length ? "Thay avatar" : "Chọn avatar"}
          className="avatar-image-picker"
          disabled={disabled}
          title={selectedValues.length ? "Nhấp để thay avatar" : "Nhấp để chọn avatar"}
          type="button"
          onClick={() => setOpenPicker(true)}
        >
          {selectedValues.length ? (
            <img alt="Avatar" src={resolveFileUrl(selectedValues[0])} />
          ) : (
            <Avatar icon={<UserOutlined />} size={35} />
          )}
        </button>
      ) : selectedValues.length ? (
        <Image.PreviewGroup>
          <Space size={4}>
            {selectedValues.map((imageUrl) => {
              const selected = selectedOptions.find((option) => option.value === imageUrl)
              return <Image key={imageUrl} alt={selected?.title || "Hình ảnh đã chọn"} src={imageUrl} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 6 }} />
            })}
          </Space>
        </Image.PreviewGroup>
      ) : null}
      {!avatar ? (
        <Space.Compact style={{ flex: 1, minWidth: 0 }}>
          <Input
            disabled
            placeholder={placeholder}
            style={{ width: "100%" }}
            value={selectedValues.length ? `${selectedValues.length} hình ảnh đã chọn` : undefined}
          />
          <Button disabled={disabled} onClick={() => setOpenPicker(true)}>
            Chọn ảnh
          </Button>
        </Space.Compact>
      ) : null}
      <Modal
        destroyOnHidden
        maskClosable={false}
        open={openPicker}
        title="Thư viện hình ảnh"
        width={screens.lg ? 1080 : "calc(100vw - 16px)"}
        onCancel={() => setOpenPicker(false)}
        footer={[
          <Button key="clear" onClick={() => { setDraftValues([]); onChange?.(multiple ? [] : undefined) }}>
            Bỏ chọn
          </Button>,
          <Button key="cancel" onClick={() => setOpenPicker(false)}>
            Đóng
          </Button>,
          <Button
            key="select"
            className="primary-glow"
            disabled={!draftValues.length}
            type="primary"
            onClick={() => {
              onChange?.(multiple ? draftValues : draftValues[0])
              setOpenPicker(false)
            }}
          >
            Chọn ảnh này
          </Button>,
        ]}
      >
        <div className="image-library-picker">
          <div className="image-library-sidebar">
            <div className="image-library-sidebar-header">
              <Typography.Text className="eyebrow">Thư mục</Typography.Text>
              <Typography.Title level={5}>Cây thư mục</Typography.Title>
            </div>
            <Button block onClick={() => setSelectedFolderId(undefined)}>
              Tất cả folder
            </Button>
            <Tabs
              activeKey={source}
              items={[
                { key: "local", label: "Thư viện" },
                { key: "google", label: "Google Drive" },
              ]}
              onChange={(key) => {
                const nextSource = key === "google" ? "google" : "local"
                setSource(nextSource)
                if (nextSource === "google") void loadGoogleDriveImages(selectedGoogleFolderId)
              }}
            />
            <Tree
              blockNode
              className="image-library-tree"
              defaultExpandAll
              filterTreeNode={(node) => String(node.title || "").toLowerCase().includes(search.trim().toLowerCase())}
              selectedKeys={source === "google" ? [selectedGoogleFolderId] : (selectedFolderId ? [selectedFolderId] : [])}
              treeData={source === "google" ? googleTreeData : treeData}
              onSelect={(keys) => {
                const nextFolderId = keys[0] ? String(keys[0]) : undefined
                if (source === "google") {
                  const googleFolderId = nextFolderId || "root"
                  setSelectedGoogleFolderId(googleFolderId)
                  void loadGoogleDriveImages(googleFolderId)
                  return
                }
                setSelectedFolderId(nextFolderId)
              }}
            />
          </div>
          <div className="image-library-browser">
            <div className="image-library-toolbar">
              <Input.Search
                allowClear
                placeholder="Tìm theo tên ảnh hoặc thư mục"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onSearch={() => { if (source === "google") void loadGoogleDriveImages(selectedGoogleFolderId) }}
              />
              <Button disabled={source === "google"} onClick={() => setOpenUpload(true)}>Upload ảnh mới</Button>
            </div>
            <div className="image-library-current-folder">
              <Typography.Text type="secondary">
                {source === "google"
                  ? (googleFolderPathMap[selectedGoogleFolderId] || "Google Drive")
                  : (selectedFolderId ? folderPathMap[selectedFolderId] || "Thư mục đã chọn" : "Đang xem tất cả thư mục")}
              </Typography.Text>
            </div>
            <div className="image-library-content">
              <div className="image-library-grid">
                {visibleOptions.length === 0 ? (
                  <div className="image-library-empty">
                    <Empty description="Không có hình ảnh phù hợp" />
                  </div>
                ) : (
                  visibleOptions.map((option) => {
                    const active = draftValues.includes(option.value)
                    return (
                      <button
                        key={option.fileId}
                        className={`image-library-card${active ? " active" : ""}`}
                        type="button"
                        onClick={() => setDraftValues((current) => multiple ? (current.includes(option.value) ? current.filter((item) => item !== option.value) : [...current, option.value]) : [option.value])}
                        onDoubleClick={() => {
                          if (!multiple) {
                            onChange?.(option.value)
                            setOpenPicker(false)
                          }
                        }}
                      >
                        <img alt={option.title} src={option.previewUrl} />
                        <div className="image-library-card-copy">
                          <strong>{option.title.replace(` ${option.folderLabel || ""}`, "")}</strong>
                          <span>{option.folderLabel || "Không có thư mục"}</span>
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
              <div className="image-library-preview">
                {selectedDraft ? (
                  <>
                    <Image
                      alt={selectedDraft.title}
                      src={selectedDraft.previewUrl}
                      style={{
                        width: "100%",
                        maxHeight: 360,
                        objectFit: "contain",
                        borderRadius: "var(--app-radius)",
                      }}
                    />
                    <Typography.Title level={5}>{multiple ? `${draftValues.length} hình ảnh đang chọn` : selectedDraft.title.replace(` ${selectedDraft.folderLabel || ""}`, "")}</Typography.Title>
                    <Typography.Text type="secondary">{selectedDraft.folderLabel || "Không có thư mục"}</Typography.Text>
                  </>
                ) : (
                  <Empty description="Chọn một ảnh để xem trước" />
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <Modal
        destroyOnHidden
        footer={null}
        maskClosable={false}
        open={openUpload}
        title="Upload ảnh vào thư viện"
        width={screens.md ? 620 : "calc(100vw - 16px)"}
        onCancel={() => setOpenUpload(false)}
      >
        <FileUploadPanel
          defaultFolderId={selectedFolderId}
          accept="image/*"
          multiple={false}
          onCancel={() => setOpenUpload(false)}
          onSuccess={(files) => {
            const uploadedUrl = resolveFileUrl(files[0]?.publicUrl)
            void loadOptions()
            if (uploadedUrl) {
              setDraftValues((current) => multiple ? Array.from(new Set([...current, uploadedUrl])) : [uploadedUrl])
            }
            setOpenUpload(false)
          }}
        />
      </Modal>
    </Space>
  )
}

function isImageFile(row: Record<string, unknown>) {
  const mimeType = String(row.mimeType || "").toLowerCase()
  if (mimeType.startsWith("image/")) return true
  const extension = String(row.extension || "").toLowerCase()
  return ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(extension)
}

function buildFolderChildrenMap(rows: Array<{ id: string; parentId?: string | null }>) {
  const childrenByParent = new Map<string | null, string[]>()
  rows.forEach((row) => {
    const parentKey = row.parentId || null
    const list = childrenByParent.get(parentKey) || []
    list.push(row.id)
    childrenByParent.set(parentKey, list)
  })

  const descendantsById: Record<string, string[]> = {}
  const resolveChildren = (id: string): string[] => {
    if (descendantsById[id]) return descendantsById[id]
    const direct = childrenByParent.get(id) || []
    const all = direct.flatMap((childId) => [childId, ...resolveChildren(childId)])
    descendantsById[id] = Array.from(new Set(all))
    return descendantsById[id]
  }

  rows.forEach((row) => {
    resolveChildren(row.id)
  })

  return descendantsById
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String)
  if (value === undefined || value === null || value === "") return []
  return [String(value)]
}

function toSingleOrArray(values: string[]) {
  if (values.length === 0) return undefined
  if (values.length === 1) return values[0]
  return values
}

function toggleStringInList(values: string[], nextValue: string) {
  return values.includes(nextValue)
    ? values.filter((item) => item !== nextValue)
    : [...values, nextValue]
}

function buildExternalFileOption(value: string): FileLibraryOption {
  const title = getExternalFileTitle(value)
  const extension = getFileExtensionFromName(title || value)
  return {
    value,
    title,
    previewUrl: resolveFileUrl(value),
    fileId: value,
    folderLabel: "Link ngoài",
    isImage: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(extension),
    mimeType: "",
    extension,
  }
}

function getExternalFileTitle(value: string) {
  try {
    const url = new URL(value)
    const name = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "")
    return name || url.hostname || value
  } catch {
    const cleanValue = value.split(/[?#]/)[0]
    return decodeURIComponent(cleanValue.split("/").filter(Boolean).pop() || cleanValue || value)
  }
}

function getFileExtensionFromName(name: string) {
  const cleanName = name.split(/[?#]/)[0]
  const extension = cleanName.includes(".") ? cleanName.split(".").pop() || "" : ""
  return extension.toLowerCase()
}

function renderFileIcon(file: { mimeType?: string; extension?: string; isImage?: boolean }, large = false) {
  if (file.isImage) return <FileImageOutlined style={{ fontSize: large ? 42 : 16 }} />
  const mimeType = String(file.mimeType || "").toLowerCase()
  const extension = String(file.extension || "").toLowerCase()
  const iconStyle = { fontSize: large ? 42 : 16 }
  if (mimeType.includes("pdf") || extension === "pdf") return <FilePdfOutlined style={iconStyle} />
  if (mimeType.startsWith("text/") || ["doc", "docx", "txt", "rtf", "md", "xls", "xlsx", "csv"].includes(extension)) {
    return <FileTextOutlined style={iconStyle} />
  }
  return <FileOutlined style={iconStyle} />
}
