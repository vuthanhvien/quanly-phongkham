import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  DeleteOutlined,
  HolderOutlined,
  ItalicOutlined,
  FileTextOutlined,
  OrderedListOutlined,
  PlusOutlined,
  SettingOutlined,
  TableOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons"
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { api } from "../api"
import { getApiErrorMessage } from "../utils/apiError"
import { baseFields, CustomField, DynamicRole, entityLabels, FieldSpec, getResourceActionOptions, normalizeSelectOption, permissionLabels, relationFields, type SelectOption } from "../models"
import {
  buildFieldLayoutConfigs,
  DEFAULT_ROLE_SCOPE,
  FieldLayoutConfig,
  getFieldCatalog,
  getRoleInheritanceChain,
  getRoleOptions,
  getStoredUserRole,
  hasExactRoleSetting,
  normalizeRole,
  resolveAllowedActions,
  resolveViewSetting,
  resolveModuleEnabled,
  serializeViewConfig,
  ViewSettingRecord,
  ViewType,
  VIEW_TYPES,
} from "../view-settings"

interface Template {
  id: string
  name: string
  htmlTemplate: string
  templateType?: string
  originalFilename?: string
}

interface TemplatePreset {
  key: string
  entityType: string
  label: string
  description: string
  htmlTemplate: string
}

export interface TemplateVariableOption {
  key: string
  label: string
  description?: string
}

const DEFAULT_TEMPLATE_HTML = `<style>
  .print-root {
    color: #1f1720;
    font-family: Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  .print-root h1 {
    font-size: 24px;
    margin: 0 0 12px;
  }

  .print-kv {
    border: 1px solid #e7d8df;
    border-radius: 12px;
    padding: 14px;
  }
</style>

<section class="print-root">
  <h1>Phiếu điều trị</h1>
  <div class="print-kv">
    <p><strong>Khách hàng:</strong> {{fullName}}</p>
    <p><strong>Mã hồ sơ:</strong> {{code}}</p>
  </div>
</section>`

const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    key: "service-order-modern",
    entityType: "service-orders",
    label: "Đơn hàng hiện đại",
    description: "Mẫu in có header, khối thông tin và phần tổng tiền rõ ràng.",
    htmlTemplate: `<style>
  .print-root {
    color: #23171d;
    font-family: "Arial", sans-serif;
    font-size: 13px;
    line-height: 1.55;
  }

  .print-shell {
    border: 1px solid #eadbe1;
    border-radius: 18px;
    overflow: hidden;
  }

  .print-header {
    background: linear-gradient(135deg, #f7d9e6, #fff3e8);
    padding: 20px 24px;
  }

  .print-header h1 {
    font-size: 24px;
    margin: 0 0 4px;
  }

  .print-header p {
    color: #6f5963;
    margin: 0;
  }

  .print-body {
    padding: 18px 24px 24px;
  }

  .grid {
    display: grid;
    gap: 12px 18px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-bottom: 18px;
  }

  .box {
    background: #fffafb;
    border: 1px solid #eadbe1;
    border-radius: 14px;
    padding: 12px 14px;
  }

  .label {
    color: #8b6d78;
    display: block;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 0.08em;
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .value {
    font-size: 14px;
    font-weight: 600;
  }

  .summary {
    align-items: center;
    background: #23171d;
    border-radius: 16px;
    color: white;
    display: flex;
    justify-content: space-between;
    margin-top: 18px;
    padding: 16px 18px;
  }

  .summary strong {
    font-size: 22px;
  }
</style>

<section class="print-root">
  <div class="print-shell">
    <div class="print-header">
      <h1>Đơn hàng dịch vụ</h1>
      <p>Mã đơn {{code}} · Ngày {{orderDate}}</p>
    </div>
    <div class="print-body">
      <div class="grid">
        <div class="box">
          <span class="label">Khách hàng</span>
          <div class="value">{{customerId}}</div>
        </div>
        <div class="box">
          <span class="label">Chi nhánh</span>
          <div class="value">{{branchId}}</div>
        </div>
        <div class="box">
          <span class="label">Dịch vụ sử dụng</span>
          <div class="value">{{serviceName}}</div>
        </div>
        <div class="box">
          <span class="label">Nhân sự thực hiện</span>
          <div class="value">{{performerStaffId}}</div>
        </div>
        <div class="box">
          <span class="label">Trạng thái</span>
          <div class="value">{{status}}</div>
        </div>
        <div class="box">
          <span class="label">Ghi chú</span>
          <div class="value">{{note}}</div>
        </div>
      </div>
      <div class="summary">
        <span>Tổng thanh toán</span>
        <strong>{{totalAmount}}</strong>
      </div>
    </div>
  </div>
</section>`,
  },
  {
    key: "service-order-a4",
    entityType: "service-orders",
    label: "Phiếu A4 chuẩn",
    description: "Mẫu in rõ nét kiểu biểu mẫu nội bộ, phù hợp in A4.",
    htmlTemplate: `<style>
  .sheet {
    color: #1d161b;
    font-family: "Times New Roman", serif;
    font-size: 14px;
    line-height: 1.6;
  }

  .sheet h1 {
    font-size: 26px;
    margin: 0 0 4px;
    text-align: center;
    text-transform: uppercase;
  }

  .sheet .sub {
    margin-bottom: 20px;
    text-align: center;
  }

  .info-table {
    border-collapse: collapse;
    margin-bottom: 18px;
    width: 100%;
  }

  .info-table td {
    border: 1px solid #d8c8cf;
    padding: 10px 12px;
    vertical-align: top;
  }

  .note-box {
    border: 1px dashed #b69ea8;
    border-radius: 12px;
    min-height: 100px;
    padding: 12px;
  }

  .sign-row {
    display: grid;
    gap: 24px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-top: 26px;
    text-align: center;
  }
</style>

<section class="sheet">
  <h1>Phiếu xác nhận đơn hàng</h1>
  <div class="sub">Mã đơn: <strong>{{code}}</strong></div>

  <table class="info-table">
    <tr>
      <td><strong>Khách hàng</strong><br />{{customerId}}</td>
      <td><strong>Ngày đơn</strong><br />{{orderDate}}</td>
    </tr>
    <tr>
      <td><strong>Dịch vụ</strong><br />{{serviceName}}</td>
      <td><strong>Trạng thái</strong><br />{{status}}</td>
    </tr>
    <tr>
      <td><strong>Số lượng</strong><br />{{quantity}}</td>
      <td><strong>Đơn giá</strong><br />{{unitPrice}}</td>
    </tr>
    <tr>
      <td colspan="2"><strong>Tổng tiền</strong><br />{{totalAmount}}</td>
    </tr>
  </table>

  <div class="note-box">
    <strong>Ghi chú</strong><br />
    {{note}}
  </div>

  <div class="sign-row">
    <div>
      <strong>Khách hàng</strong>
      <p>(Ký và ghi rõ họ tên)</p>
    </div>
    <div>
      <strong>Nhân viên xác nhận</strong>
      <p>(Ký và ghi rõ họ tên)</p>
    </div>
  </div>
</section>`,
  },
  {
    key: "service-order-compact",
    entityType: "service-orders",
    label: "Đơn hàng compact",
    description: "Mẫu gọn, ít mực in, phù hợp phiếu xác nhận nhanh.",
    htmlTemplate: `<style>
  .ticket {
    color: #22181d;
    font-family: Arial, sans-serif;
    font-size: 13px;
    line-height: 1.5;
  }

  .ticket-header {
    border-bottom: 2px solid #22181d;
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 8px;
  }

  .ticket-title {
    font-size: 22px;
    font-weight: 700;
  }

  .ticket-row {
    display: flex;
    gap: 8px;
    margin-bottom: 6px;
  }

  .ticket-row strong {
    min-width: 120px;
  }

  .ticket-total {
    border-top: 1px solid #cab4be;
    margin-top: 16px;
    padding-top: 12px;
    text-align: right;
  }

  .ticket-total strong {
    font-size: 22px;
  }
</style>

<section class="ticket">
  <div class="ticket-header">
    <div>
      <div class="ticket-title">Đơn hàng dịch vụ</div>
      <div>{{code}}</div>
    </div>
    <div>{{orderDate}}</div>
  </div>

  <div class="ticket-row"><strong>Khách hàng</strong><span>{{customerId}}</span></div>
  <div class="ticket-row"><strong>Dịch vụ</strong><span>{{serviceName}}</span></div>
  <div class="ticket-row"><strong>Người thực hiện</strong><span>{{performerStaffId}}</span></div>
  <div class="ticket-row"><strong>Trạng thái</strong><span>{{status}}</span></div>
  <div class="ticket-row"><strong>Ghi chú</strong><span>{{note}}</span></div>

  <div class="ticket-total">
    Thành tiền: <strong>{{totalAmount}}</strong>
  </div>
</section>`,
  },
]

export const DEFAULT_PRINT_TEMPLATE_HTML = DEFAULT_TEMPLATE_HTML
export const PRINT_TEMPLATE_PRESETS = TEMPLATE_PRESETS

function formatSelectOptions(options?: SelectOption[]) {
  if (!Array.isArray(options) || options.length === 0) return ""
  return options
    .map((option) => {
      const normalized = normalizeSelectOption(option)
      return normalized.label === normalized.value
        ? normalized.value
        : `${normalized.value} | ${normalized.label}`
    })
    .join(", ")
}

function parseSelectOptions(raw: string): SelectOption[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      const [optionValue, ...labelParts] = value.split("|").map((item) => item.trim())
      const optionLabel = labelParts.join(" | ").trim()
      if (!optionLabel || optionLabel === optionValue) return optionValue
      return { value: optionValue, label: optionLabel }
    })
}

function normalizeEditableOptions(options?: SelectOption[]) {
  if (!Array.isArray(options)) return []
  return options.map((option) => normalizeSelectOption(option))
}

function buildNextOptionValue(options?: SelectOption[]) {
  return `OPTION_${(options?.length || 0) + 1}`
}

function updateSelectOptionAt(
  options: SelectOption[] | undefined,
  index: number,
  patch: Partial<{ value: string; label: string }>,
): SelectOption[] {
  return normalizeEditableOptions(options).map((option, optionIndex) => {
    if (optionIndex !== index) return option
    const next = {
      value: patch.value ?? option.value,
      label: patch.label ?? option.label,
    }
    return next.label.trim() && next.label !== next.value ? next : next.value
  })
}

function appendSelectOption(options?: SelectOption[]) {
  const nextValue = buildNextOptionValue(options)
  return [...normalizeEditableOptions(options), nextValue]
}

function removeSelectOptionAt(options: SelectOption[] | undefined, index: number) {
  return normalizeEditableOptions(options).filter((_, optionIndex) => optionIndex !== index)
}

function relationObjectKey(fieldKey: string) {
  return fieldKey.endsWith("Id") ? fieldKey.slice(0, -2) : fieldKey
}

function templateFieldKind(field: FieldSpec) {
  if (field.displayFormat === "currency" || field.displayFormat === "number" || field.displayFormat === "percent") return "number"
  if (field.type === "number") return "number"
  if (field.type === "date" || field.type === "datetime") return "date"
  return "string"
}

function formatVariableOptions(key: string, label: string, kind: string): TemplateVariableOption[] {
  if (kind === "number") {
    return [
      { key: `${key}_fm`, label: `${label} - định dạng số/tiền` },
    ]
  }
  if (kind === "date") {
    return [
      { key: `${key}_fm`, label: `${label} - ngày DD/MM/YYYY` },
      { key: `${key}_fm_mdy`, label: `${label} - ngày MM/DD/YYYY` },
      { key: `${key}_fm_ymd`, label: `${label} - ngày YYYY-MM-DD` },
      { key: `${key}_fm_dmy`, label: `${label} - ngày DD-MM-YYYY` },
    ]
  }
  return [
    { key: `${key}_up`, label: `${label} - chữ hoa` },
    { key: `${key}_cap`, label: `${label} - viết hoa đầu từ` },
  ]
}

export function buildTemplateVariableOptions(resource: string, catalog: FieldSpec[]): TemplateVariableOption[] {
  const options: TemplateVariableOption[] = []
  const pushField = (key: string, label: string, field: FieldSpec) => {
    options.push({ key, label })
    options.push(...formatVariableOptions(key, label, templateFieldKind(field)))
  }

  catalog.forEach((field) => {
    pushField(field.key, field.label, field)
    const relation = field.relation || relationFields[field.key]
    if (!relation) return
    const relationKey = relationObjectKey(field.key)
    const relatedFields = baseFields[relation.resource] || []
    relatedFields.forEach((relatedField) => {
      const relationLabel = `${field.label} / ${relatedField.label}`
      pushField(`${relationKey}.${relatedField.key}`, relationLabel, relatedField)
      if (relatedField.key === "fullName") {
        pushField(`${relationKey}.name`, `${field.label} / Tên`, relatedField)
      }
    })
  })

  const unique = new Map<string, TemplateVariableOption>()
  options.forEach((option) => {
    if (!unique.has(option.key)) unique.set(option.key, option)
  })
  return Array.from(unique.values()).sort((a, b) => a.key.localeCompare(b.key))
}

export function PrintHtmlEditor({
  value,
  onChange,
  variables,
}: {
  value?: string
  onChange?: (value: string) => void
  variables: TemplateVariableOption[]
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [sourceMode, setSourceMode] = useState(false)

  useEffect(() => {
    const editor = editorRef.current
    if (!editor || sourceMode) return
    if (document.activeElement === editor) return
    if (editor.innerHTML !== (value || "")) {
      editor.innerHTML = value || ""
    }
  }, [sourceMode, value])

  function emit() {
    onChange?.(editorRef.current?.innerHTML || "")
  }

  function run(command: string, commandValue?: string) {
    editorRef.current?.focus()
    document.execCommand(command, false, commandValue)
    emit()
  }

  function insertHtml(html: string) {
    editorRef.current?.focus()
    document.execCommand("insertHTML", false, html)
    emit()
  }

  return (
    <div className="print-html-editor">
      <div className="print-html-editor__toolbar">
        <Button icon={<BoldOutlined />} size="small" onClick={() => run("bold")} />
        <Button icon={<ItalicOutlined />} size="small" onClick={() => run("italic")} />
        <Button icon={<UnderlineOutlined />} size="small" onClick={() => run("underline")} />
        <Select
          size="small"
          className="print-html-editor__block-select"
          placeholder="Định dạng"
          options={[
            { value: "p", label: "Đoạn văn" },
            { value: "h1", label: "Tiêu đề 1" },
            { value: "h2", label: "Tiêu đề 2" },
            { value: "h3", label: "Tiêu đề 3" },
          ]}
          onSelect={(tag) => run("formatBlock", tag)}
        />
        <Button icon={<UnorderedListOutlined />} size="small" onClick={() => run("insertUnorderedList")} />
        <Button icon={<OrderedListOutlined />} size="small" onClick={() => run("insertOrderedList")} />
        <Button icon={<AlignLeftOutlined />} size="small" onClick={() => run("justifyLeft")} />
        <Button icon={<AlignCenterOutlined />} size="small" onClick={() => run("justifyCenter")} />
        <Button icon={<AlignRightOutlined />} size="small" onClick={() => run("justifyRight")} />
        <Button
          icon={<TableOutlined />}
          size="small"
          onClick={() => insertHtml('<table style="border-collapse:collapse;width:100%"><tr><td style="border:1px solid #ddd;padding:8px">Nội dung</td><td style="border:1px solid #ddd;padding:8px">{{code}}</td></tr></table>')}
        />
        <Select
          allowClear
          showSearch
          size="small"
          className="print-html-editor__variable-select"
          optionFilterProp="search"
          placeholder="Chèn biến"
          options={variables.map((variable) => ({
            value: variable.key,
            label: `${variable.key} - ${variable.label}`,
            search: `${variable.key} ${variable.label}`,
          }))}
          onSelect={(key) => insertHtml(`{{${key}}}`)}
        />
        <Button size="small" onClick={() => setSourceMode((current) => !current)}>
          {sourceMode ? "Soạn thảo" : "HTML"}
        </Button>
      </div>
      {sourceMode ? (
        <Input.TextArea
          className="print-html-editor__source"
          rows={18}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
        />
      ) : (
        <div
          ref={editorRef}
          className="print-html-editor__surface"
          contentEditable
          suppressContentEditableWarning
          onBlur={emit}
          onInput={emit}
        />
      )}
    </div>
  )
}

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [entityType, setEntityType] = useState(() => searchParams.get("module") || "customers")
  const [selectedRole, setSelectedRole] = useState(() => normalizeRole(searchParams.get("role") || getStoredUserRole()))
  const [moduleEnabled, setModuleEnabled] = useState(true)
  const [fields, setFields] = useState<CustomField[]>([])
  const [views, setViews] = useState<ViewSettingRecord[]>([])
  const [tableConfig, setTableConfig] = useState<FieldLayoutConfig[]>([])
  const [formConfig, setFormConfig] = useState<FieldLayoutConfig[]>([])
  const [detailConfig, setDetailConfig] = useState<FieldLayoutConfig[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [dynamicRoles, setDynamicRoles] = useState<DynamicRole[]>([])
  const [allowedActions, setAllowedActions] = useState<string[]>([])
  const [toast, toastContextHolder] = message.useMessage()
  const [docxTemplateForm] = Form.useForm()
  const [docxTemplateModal, setDocxTemplateModal] = useState(false)
  const [docxFile, setDocxFile] = useState<File | null>(null)

  const fieldCatalog = useMemo(
    () => getFieldCatalog(entityType, fields),
    [entityType, fields],
  )
  const templateVariables = useMemo(
    () => buildTemplateVariableOptions(entityType, fieldCatalog),
    [entityType, fieldCatalog],
  )
  const selectableRoles = useMemo(
    () => getRoleOptions(views, [selectedRole, ...dynamicRoles.map((role) => role.key)]),
    [dynamicRoles, selectedRole, views],
  )
  const inheritanceChain = useMemo(
    () => getRoleInheritanceChain(selectedRole, dynamicRoles),
    [dynamicRoles, selectedRole],
  )
  const hasRoleConfig = useMemo(
    () => views.some((view) => normalizeRole(view.role) === selectedRole),
    [selectedRole, views],
  )
  const viewStatus = useMemo(
    () =>
      Object.fromEntries(
        VIEW_TYPES.map((viewType) => [
          viewType,
          hasExactRoleSetting(views, viewType, selectedRole),
        ]),
      ) as Record<ViewType, boolean>,
    [views, selectedRole],
  )
  const actionOptions = useMemo(
    () => getResourceActionOptions(entityType),
    [entityType],
  )
  const templatePresets = useMemo(
    () => TEMPLATE_PRESETS.filter((preset) => preset.entityType === entityType),
    [entityType],
  )
  const viewSources = useMemo(
    () =>
      Object.fromEntries(
        VIEW_TYPES.map((viewType) => [
          viewType,
          normalizeRole(resolveViewSetting(views, viewType, selectedRole, dynamicRoles)?.role),
        ]),
      ) as Record<ViewType, string>,
    [dynamicRoles, selectedRole, views],
  )

  useEffect(() => {
    const moduleFromUrl = searchParams.get("module") || "customers"
    const roleFromUrl = normalizeRole(searchParams.get("role") || getStoredUserRole())

    setEntityType((current) => current === moduleFromUrl ? current : moduleFromUrl)
    setSelectedRole((current) => current === roleFromUrl ? current : roleFromUrl)
  }, [searchParams])

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set("module", entityType)
    nextParams.set("role", selectedRole)
    const nextQuery = nextParams.toString()
    const currentQuery = searchParams.toString()
    if (nextQuery !== currentQuery) {
      setSearchParams(nextParams, { replace: true })
    }
  }, [entityType, searchParams, selectedRole, setSearchParams])

  useEffect(() => {
    void load()
  }, [entityType])

  useEffect(() => {
    setModuleEnabled(resolveModuleEnabled(views, selectedRole, dynamicRoles))
    setAllowedActions(resolveAllowedActions(views, entityType, selectedRole, dynamicRoles))
    setTableConfig(
      buildFieldLayoutConfigs(
        fieldCatalog,
        resolveViewSetting(views, "TABLE", selectedRole, dynamicRoles),
        "TABLE",
      ),
    )
    setFormConfig(
      buildFieldLayoutConfigs(
        fieldCatalog,
        resolveViewSetting(views, "FORM", selectedRole, dynamicRoles),
        "FORM",
      ),
    )
    setDetailConfig(
      buildFieldLayoutConfigs(
        fieldCatalog,
        resolveViewSetting(views, "DETAIL", selectedRole, dynamicRoles),
        "DETAIL",
      ),
    )
  }, [dynamicRoles, entityType, fieldCatalog, selectedRole, views])

  async function load() {
    const [fieldResponse, viewResponse, templateResponse, roleResponse] = await Promise.all([
      api.get("/settings/custom-fields", { params: { entityType } }),
      api.get("/settings/views", { params: { entityType } }),
      api.get("/settings/print-templates", { params: { entityType } }),
      api.get("/settings/dynamic-roles"),
    ])
    setFields(fieldResponse.data.data)
    setViews(viewResponse.data.data)
    setTemplates(templateResponse.data.data)
    setDynamicRoles(roleResponse.data.data)
  }

  async function saveView() {
    try {
      await Promise.all([
        api.put(`/settings/views/${entityType}/TABLE`, {
          role: selectedRole,
          config: serializeViewConfig("TABLE", tableConfig, moduleEnabled, allowedActions),
        }),
        api.put(`/settings/views/${entityType}/FORM`, {
          role: selectedRole,
          config: serializeViewConfig("FORM", formConfig, moduleEnabled, allowedActions),
        }),
        api.put(`/settings/views/${entityType}/DETAIL`, {
          role: selectedRole,
          config: serializeViewConfig("DETAIL", detailConfig, moduleEnabled, allowedActions),
        }),
      ])
      toast.success("Đã lưu cấu hình module theo role")
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể lưu cấu hình hiển thị"))
    }
  }

  async function resetInheritedView() {
    await api.delete(`/settings/views/${entityType}`, {
      params: { role: selectedRole },
    })
    message.success("Đã xóa config hiện tại. Role này sẽ kế thừa lại theo chuỗi mới")
    await load()
  }

  async function saveDocxTemplate(values: Record<string, unknown>) {
    if (!docxFile) { message.error("Chọn file DOCX mẫu"); return }
    const formData = new FormData()
    formData.append("file", docxFile)
    formData.append("entityType", entityType)
    formData.append("name", String(values.name || ""))
    try {
      await api.post("/settings/print-templates/docx", formData)
      message.success("Đã lưu mẫu DOCX")
      setDocxTemplateModal(false)
      setDocxFile(null)
      docxTemplateForm.resetFields()
      await load()
    } catch (error) { message.error(getApiErrorMessage(error, "Không thể lưu mẫu DOCX")) }
  }

  function openCreateTemplate() {
    navigate(`/settings/print-templates/new?module=${entityType}`)
  }

  function openCreateTemplateFromPreset(preset: TemplatePreset) {
    navigate(`/settings/print-templates/new?module=${entityType}&preset=${preset.key}`)
  }

  function openEditTemplate(template: Template) {
    navigate(`/settings/print-templates/${template.id}?module=${entityType}`)
  }

  const updateConfig = useCallback((
    viewType: ViewType,
    key: string,
    patch: Partial<FieldLayoutConfig>,
  ) => {
    let setter = setDetailConfig
    if (viewType === "FORM") setter = setFormConfig
    if (viewType === "TABLE") setter = setTableConfig
    if (viewType === "DETAIL") setter = setDetailConfig

    setter((current) =>
      current.map((field) =>
        field.key === key ? { ...field, ...patch } : field,
      ),
    )
  }, [])

  const reorderConfig = useCallback((
    viewType: ViewType,
    fromKey: string,
    toKey: string,
  ) => {
    let setter = setDetailConfig
    if (viewType === "FORM") setter = setFormConfig
    if (viewType === "TABLE") setter = setTableConfig
    if (viewType === "DETAIL") setter = setDetailConfig

    setter((current) => {
      const fromIndex = current.findIndex((field) => field.key === fromKey)
      const toIndex = current.findIndex((field) => field.key === toKey)

      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current

      const next = [...current]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  return (
    <>
      {toastContextHolder}
      <div className="page-header">
          <Typography.Title level={3}>Cấu hình động</Typography.Title>
        <Space wrap>
          <Select
            value={entityType}
            onChange={setEntityType}
            style={{ width: 240 }}
            options={Object.entries(permissionLabels).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Select
            style={{ width: 220 }}
            value={selectedRole}
            onChange={(value) => setSelectedRole(normalizeRole(value))}
            options={selectableRoles.map((role) => ({
              value: role,
              label:
                dynamicRoles.find((item) => item.key === role)?.name
                  ? `${dynamicRoles.find((item) => item.key === role)?.name} (${role})`
                  : role,
            }))}
          />
        </Space>
      </div>
      <Card className="glass-card settings-card">
        <Tabs
          className="settings-tabs"
          items={[
            {
              key: "view-config",
              label: (
                <span className="simple-tab-label">
                  <SettingOutlined />
                  <span>Hiển thị theo role / module</span>
                </span>
              ),
              children: (
                <div className="settings-tab-panel">
                  <div className="settings-tab-header settings-tab-header-wrap">
                    <Typography.Text>
                      Module hiện tại là <strong>{permissionLabels[entityType] || entityType}</strong>. <strong>{DEFAULT_ROLE_SCOPE}</strong> là config gốc. Chuỗi áp dụng cho role đang chọn là <strong>{[...inheritanceChain].reverse().join(" -> ")}</strong>, nghĩa là hệ thống đọc từ role hiện tại lên main role rồi mới về <strong>{DEFAULT_ROLE_SCOPE}</strong> nếu chưa có config riêng.
                    </Typography.Text>
                    <Checkbox
                      checked={moduleEnabled}
                      onChange={(event) => setModuleEnabled(event.target.checked)}
                    >
                      Cho phép role sử dụng module này
                    </Checkbox>
                  </div>
                  <Space wrap>
                    <Tag color={moduleEnabled ? "green" : "red"}>
                      Module: {moduleEnabled ? "Được dùng" : "Bị khóa"}
                    </Tag>
                    <Tag color="blue">
                      Actions: {allowedActions.length ? allowedActions.join(", ") : "Không có"}
                    </Tag>
                    {VIEW_TYPES.map((viewType) => (
                      <Tag
                        color={viewStatus[viewType] ? "green" : "gold"}
                        key={viewType}
                      >
                        {viewType}: {viewStatus[viewType] ? "riêng theo role" : `đang kế thừa ${viewSources[viewType]}`}
                      </Tag>
                    ))}
                  </Space>
                  <Card size="small" title="Action theo role" style={{ marginTop: 16 }}>
                    <Checkbox
                      checked={allowedActions.length === actionOptions.length}
                      indeterminate={allowedActions.length > 0 && allowedActions.length < actionOptions.length}
                      onChange={(event) => setAllowedActions(event.target.checked ? actionOptions.map((item) => item.key) : [])}
                      style={{ marginBottom: 10 }}
                    >
                      Chọn tất cả action
                    </Checkbox>
                    <Checkbox.Group
                      options={actionOptions.map((item) => ({
                        label: item.label,
                        value: item.key,
                      }))}
                      value={allowedActions}
                      onChange={(values) => setAllowedActions(values.map(String))}
                    />
                  </Card>
                  <Tabs
                    className="settings-inner-tabs"
                    items={[
                      {
                        key: "TABLE",
                        label: "Bảng",
                        children: (
                          <ViewConfigTable
                            dataSource={tableConfig}
                            viewType="TABLE"
                            onChange={updateConfig}
                            onReorder={reorderConfig}
                          />
                        ),
                      },
                      {
                        key: "FORM",
                        label: "Form nhập liệu",
                        children: (
                          <ViewConfigTable
                            dataSource={formConfig}
                            viewType="FORM"
                            onChange={updateConfig}
                            onReorder={reorderConfig}
                          />
                        ),
                      },
                      {
                        key: "DETAIL",
                        label: "Thông tin chi tiết",
                        children: (
                          <ViewConfigTable
                            dataSource={detailConfig}
                            viewType="DETAIL"
                            onChange={updateConfig}
                            onReorder={reorderConfig}
                          />
                        ),
                      },
                    ]}
                  />
                  <Space wrap>
                    <Button
                      className="primary-glow"
                      type="primary"
                      onClick={saveView}
                    >
                      Lưu cấu hình hiển thị cho module
                    </Button>
                    <Button
                      danger
                      disabled={!hasRoleConfig}
                      onClick={() => void resetInheritedView()}
                    >
                      Lưu trữ config hiện tại để ẩn trên giao diện
                    </Button>
                  </Space>
                </div>
              ),
            },
            {
              key: "print-templates",
              label: (
                <span className="simple-tab-label">
                  <FileTextOutlined />
                  <span>Mẫu in</span>
                </span>
              ),
              children: (
                <div className="settings-tab-panel">
                  <div className="settings-tab-header">
                    <Select
                      allowClear
                      showSearch
                      className="template-variable-select"
                      optionFilterProp="search"
                      placeholder="Tìm biến in theo code hoặc label"
                      options={templateVariables.map((variable) => ({
                        value: variable.key,
                        label: `${variable.key} - ${variable.label}`,
                        search: `${variable.key} ${variable.label}`,
                      }))}
                      onSelect={(key) => {
                        void navigator.clipboard?.writeText(`{{${key}}}`)
                        message.success(`Đã copy {{${key}}}`)
                      }}
                    />
                    <Space wrap>
                      <Button onClick={openCreateTemplate}>Thêm mẫu</Button>
                      <Button onClick={() => setDocxTemplateModal(true)}>Tải mẫu DOCX</Button>
                      {templatePresets.length > 0 && (
                        <Button onClick={() => openCreateTemplateFromPreset(templatePresets[0])}>
                          Tạo từ mẫu có sẵn
                        </Button>
                      )}
                    </Space>
                  </div>
                  {templatePresets.length > 0 && (
                    <div className="template-preset-grid">
                      {templatePresets.map((preset) => (
                        <Card className="template-preset-card" key={preset.key} size="small">
                          <Space direction="vertical" size={6} style={{ width: "100%" }}>
                            <Typography.Text strong>{preset.label}</Typography.Text>
                            <Typography.Text type="secondary">{preset.description}</Typography.Text>
                            <Button onClick={() => openCreateTemplateFromPreset(preset)}>
                              Dùng mẫu này
                            </Button>
                          </Space>
                        </Card>
                      ))}
                    </div>
                  )}
                  <Divider />
                  <div className="template-layout">
                    <div>
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="id"
                        dataSource={templates}
                        scroll={{ x: "max-content" }}
                        columns={[
                          { title: "Tên mẫu", dataIndex: "name" },
                          {
                            title: "Xem nhanh",
                            render: (_, row) => (
                              <Typography.Paragraph
                                ellipsis={{ rows: 2 }}
                                style={{ marginBottom: 0, maxWidth: 360 }}
                              >
                                {row.templateType === "DOCX" ? `DOCX: ${row.originalFilename || row.name}` : row.htmlTemplate}
                              </Typography.Paragraph>
                            ),
                          },
                          {
                            title: "",
                            render: (_, row) => (
                              row.templateType === "DOCX" ? (
                                <Typography.Text type="secondary">Tải mẫu mới để thay thế</Typography.Text>
                              ) : (
                                <Button type="link" onClick={() => openEditTemplate(row)}>
                                  Sửa
                                </Button>
                              )
                            ),
                          },
                        ]}
                      />
                    </div>
                    <Card className="template-preview-card" title="Preview nhanh">
                      <div
                        className="template-preview-surface"
                        dangerouslySetInnerHTML={{
                          __html:
                            templates[0]?.htmlTemplate ||
                            "<p>Chưa có mẫu in cho model này.</p>",
                        }}
                      />
                    </Card>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </Card>
      <Modal title="Tải mẫu in DOCX" open={docxTemplateModal} footer={null} onCancel={() => { setDocxTemplateModal(false); setDocxFile(null) }}>
        <Typography.Paragraph type="secondary">Dùng placeholder liền mạch như <code>{"{{fullName}}"}</code>, <code>{"{{code}}"}</code>. Khi in, hệ thống sẽ thay dữ liệu và tải DOCX kết quả.</Typography.Paragraph>
        <Form form={docxTemplateForm} layout="vertical" onFinish={saveDocxTemplate}>
          <Form.Item name="name" label="Tên mẫu" rules={[{ required: true }]}><Input placeholder="Phiếu thông tin khách hàng" /></Form.Item>
          <Form.Item label="File DOCX" required>
            <Upload accept=".docx" maxCount={1} beforeUpload={(file) => { setDocxFile(file); return false }} onRemove={() => setDocxFile(null)}>
              <Button>Chọn file DOCX</Button>
            </Upload>
          </Form.Item>
          <Button className="primary-glow" htmlType="submit" type="primary">Lưu mẫu DOCX</Button>
        </Form>
      </Modal>
    </>
  )
}

function ViewConfigTable({
  dataSource,
  viewType,
  onChange,
  onReorder,
}: {
  dataSource: FieldLayoutConfig[]
  viewType: ViewType
  onChange: (
    viewType: ViewType,
    key: string,
    patch: Partial<FieldLayoutConfig>,
  ) => void
  onReorder?: (viewType: ViewType, fromKey: string, toKey: string) => void
}) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const tableComponents = useMemo(
    () => ({
      body: {
        row: (props: React.HTMLAttributes<HTMLTableRowElement>) => {
          const rowKey = String((props as React.HTMLAttributes<HTMLTableRowElement> & { "data-row-key"?: string })["data-row-key"] || "")
          const draggable = Boolean(onReorder)
          return (
            <tr
              {...props}
              className={`${props.className || ""} ${draggingKey === rowKey ? "drag-row-active" : ""}`.trim()}
              draggable={draggable}
              onDragStart={(event) => {
                if (!draggable || !rowKey) return
                setDraggingKey(rowKey)
                event.dataTransfer.effectAllowed = "move"
                event.dataTransfer.setData("text/plain", rowKey)
              }}
              onDragOver={(event) => {
                if (!draggable || !rowKey) return
                event.preventDefault()
                event.dataTransfer.dropEffect = "move"
              }}
              onDrop={(event) => {
                if (!draggable || !rowKey || !onReorder) return
                event.preventDefault()
                const fromKey = event.dataTransfer.getData("text/plain")
                if (!fromKey || fromKey === rowKey) return
                onReorder(viewType, fromKey, rowKey)
                setDraggingKey(null)
              }}
              onDragEnd={() => setDraggingKey(null)}
            />
          )
        },
      },
    }),
    [draggingKey, onReorder, viewType],
  )
  const columns: ColumnsType<FieldLayoutConfig> = [
    {
      title: "",
      key: "sort",
      width: 56,
      render: (_, row) =>
        onReorder ? (
          <span className="drag-handle" title="Kéo để đổi thứ tự">
            <HolderOutlined />
            <span className="drag-order">#{dataSource.findIndex((item) => item.key === row.key) + 1}</span>
          </span>
        ) : null,
    },
    {
      title: (
        <Checkbox
          checked={dataSource.length > 0 && dataSource.every((row) => row.visible)}
          indeterminate={dataSource.some((row) => row.visible) && dataSource.some((row) => !row.visible)}
          onChange={(event) => {
            dataSource.forEach((row) => onChange(viewType, row.key, { visible: event.target.checked }))
          }}
          style={{ whiteSpace: "nowrap" }}
        >
          Hiển thị
        </Checkbox>
      ),
      dataIndex: "visible",
      width: 132,
      render: (value, row) => (
        <Checkbox
          checked={value}
          onChange={(event) =>
            onChange(viewType, row.key, { visible: event.target.checked })
          }
        />
      ),
    },
    {
      title: "Field",
      key: "field",
      width: 220,
      render: (_, row) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{row.label}</Typography.Text>
          <Typography.Text type="secondary">{row.key}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Loại",
      dataIndex: "type",
      width: 120,
      render: (value) => value || "text",
    },
    {
      title: "Nhãn hiển thị",
      key: "label",
      render: (_, row) => (
        <Input
          value={row.label}
          onChange={(event) =>
            onChange(viewType, row.key, { label: event.target.value })
          }
          placeholder="Tên field hiển thị"
        />
      ),
    },
  ]

  if (viewType !== "TABLE") {
    columns.push(
      {
        title: "Tab",
        key: "tab",
        width: 180,
        render: (_, row) => (
          <Input
            value={row.tab}
            onChange={(event) => onChange(viewType, row.key, { tab: event.target.value })}
            placeholder="Ví dụ: Thông tin chung"
          />
        ),
      },
      {
        title: "Format",
        key: "displayFormat",
        width: 170,
        render: (_, row) => (
          <Select
            allowClear
            placeholder="Mặc định"
            value={row.displayFormat}
            onChange={(value) =>
              onChange(viewType, row.key, {
                displayFormat: value as FieldLayoutConfig["displayFormat"] | undefined,
              })
            }
            options={[
              { value: "currency", label: "Tiền tệ" },
              { value: "number", label: "Số" },
              { value: "percent", label: "Phần trăm" },
            ]}
          />
        ),
      },
      {
        title: "Mô tả / hướng dẫn",
        key: "description",
        render: (_, row) => (
          <Input.TextArea
            autoSize={{ minRows: 1, maxRows: 3 }}
            value={row.description}
            onChange={(event) =>
              onChange(viewType, row.key, { description: event.target.value })
            }
            placeholder="Nội dung hướng dẫn hiển thị cho field"
          />
        ),
      },
      {
        title: "Width",
        key: "width",
        width: 150,
        render: (_, row) => (
          <Select
            value={row.width || "100"}
            onChange={(value) =>
              onChange(viewType, row.key, {
                width: value as FieldLayoutConfig["width"],
              })
            }
            options={[
              { value: "25", label: "1/4" },
              { value: "33", label: "1/3" },
              { value: "50", label: "1/2" },
              { value: "66", label: "2/3" },
              { value: "100", label: "Full" },
            ]}
          />
        ),
      },
    )
  }

  if (viewType === "TABLE") {
    columns.push(
      {
        title: "Format",
        key: "displayFormat",
        width: 170,
        render: (_, row) => (
          <Select
            allowClear
            placeholder="Mặc định"
            value={row.displayFormat}
            onChange={(value) =>
              onChange(viewType, row.key, {
                displayFormat: value as FieldLayoutConfig["displayFormat"] | undefined,
              })
            }
            options={[
              { value: "currency", label: "Tiền tệ" },
              { value: "number", label: "Số" },
              { value: "percent", label: "Phần trăm" },
            ]}
          />
        ),
      },
      {
        title: "Width cột (px)",
        key: "tableWidth",
        width: 160,
        render: (_, row) => (
          <Input
            inputMode="numeric"
            value={row.tableWidth === undefined ? "" : String(row.tableWidth)}
            onChange={(event) => {
              const nextValue = event.target.value.replace(/[^\d]/g, "")
              onChange(viewType, row.key, {
                tableWidth: nextValue ? Number(nextValue) : undefined,
              })
            }}
            placeholder="Ví dụ 180"
          />
        ),
      },
    )
  }

  if (viewType === "FORM") {
    columns.push(
      {
        title: "Placeholder",
        key: "placeholder",
        width: 220,
        render: (_, row) => (
          <Input
            value={row.placeholder}
            onChange={(event) => onChange(viewType, row.key, { placeholder: event.target.value })}
            placeholder="Ví dụ: Nhập số điện thoại"
          />
        ),
      },
      {
        title: "Options",
        key: "options",
        render: (_, row) => {
          if (row.type !== "select" && row.type !== "multi-select") {
            return <Typography.Text type="secondary">-</Typography.Text>
          }
          const editableOptions = normalizeEditableOptions(row.options)
          return (
            <div className="settings-options-editor">
              {editableOptions.length === 0 ? (
                <Typography.Text type="secondary">Chưa có option</Typography.Text>
              ) : (
                editableOptions.map((option, optionIndex) => (
                  <div className="settings-option-row" key={`${row.key}-${optionIndex}`}>
                    <Input
                      className="settings-option-input"
                      value={option.value}
                      onChange={(event) =>
                        onChange(viewType, row.key, {
                          options: updateSelectOptionAt(row.options, optionIndex, { value: event.target.value }),
                        })
                      }
                      placeholder="Value"
                    />
                    <Input
                      className="settings-option-input"
                      value={option.label}
                      onChange={(event) =>
                        onChange(viewType, row.key, {
                          options: updateSelectOptionAt(row.options, optionIndex, { label: event.target.value }),
                        })
                      }
                      placeholder="Label hiển thị"
                    />
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() =>
                        onChange(viewType, row.key, {
                          options: removeSelectOptionAt(row.options, optionIndex),
                        })
                      }
                    />
                  </div>
                ))
              )}
              <Space size={8} wrap>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() =>
                    onChange(viewType, row.key, {
                      options: appendSelectOption(row.options),
                    })
                  }
                >
                  Thêm option
                </Button>
                {editableOptions.length > 0 ? (
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    Gợi ý: nếu `label` trùng `value`, hệ thống sẽ lưu dạng ngắn gọn.
                  </Typography.Text>
                ) : null}
              </Space>
            </div>
          )
        },
      },
      {
        title: "Default data",
        key: "defaultValue",
        render: (_, row) => (
          <Input
            value={
              Array.isArray(row.defaultValue)
                ? row.defaultValue.join(", ")
                : row.defaultValue === undefined || row.defaultValue === null
                  ? ""
                  : String(row.defaultValue)
            }
            onChange={(event) =>
              onChange(viewType, row.key, {
                defaultValue: parseDefaultValue(row.type, event.target.value),
              })
            }
            placeholder="Giá trị mặc định"
          />
        ),
      },
      {
        title: "Placeholder",
        key: "placeholder",
        render: (_, row) => (
          <Input
            value={row.placeholder}
            onChange={(event) =>
              onChange(viewType, row.key, { placeholder: event.target.value })
            }
            placeholder="Gợi ý nhập liệu"
          />
        ),
      },
      {
        title: "Khóa sửa",
        dataIndex: "disabled",
        width: 100,
        render: (value, row) => (
          <Checkbox
            checked={Boolean(value)}
            onChange={(event) =>
              onChange(viewType, row.key, { disabled: event.target.checked })
            }
          />
        ),
      },
    )
  }

  return (
    <Table
      columns={columns}
      components={tableComponents}
      dataSource={dataSource}
      pagination={false}
      rowKey="key"
      scroll={{ x: "max-content" }}
      size="small"
    />
  )
}

function parseDefaultValue(type: FieldLayoutConfig["type"], value: string) {
  if (!value.trim()) return undefined
  if (type === "number") return Number(value)
  if (type === "multi-select") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return value
}
