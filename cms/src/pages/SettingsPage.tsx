import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  HolderOutlined,
  ItalicOutlined,
  KeyOutlined,
  LinkOutlined,
  FileTextOutlined,
  OrderedListOutlined,
  PlusOutlined,
  ProfileOutlined,
  SettingOutlined,
  TableOutlined,
  UnderlineOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons"
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
  Switch,
  Table,
  Tabs,
  Tree,
  Tag,
  TreeSelect,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { api } from "../api"
import { RecordFormContent } from "../components/RecordFormContent"
import { appModuleLabels, buildGroupedModuleOptions, resolveEnabledModules } from "../company-types"
import { useAppUi } from "../app-ui"
import { getInputPatternLabel } from "../input-patterns"
import { getApiErrorMessage } from "../utils/apiError"
import { getCachedCustomFields, getCachedPrintTemplates, getCachedViews, invalidateSettingsCache } from "../utils/settingsCache"
import { baseFields, CustomField, DynamicRole, entityLabels, FieldSpec, getResourceActionOptions, normalizeSelectOption, relationFields, systemRoleOptions, type SelectOption } from "../models"
import {
  buildFieldLayoutConfigs,
  DEFAULT_ROLE_SCOPE,
  FieldLayoutConfig,
  getFieldCatalog,
  groupFieldsByTab,
  getRoleInheritanceChain,
  getRoleOptions,
  hasExactRoleSetting,
  normalizeRole,
  resolveAllowedActions,
  resolveActionSetting,
  resolveViewSetting,
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
  isActive?: boolean
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

interface ActionEditorDraft {
  key: string
  label: string
  enabled: boolean
  order: number
  inline: boolean
}

interface TitleEditorDraft {
  viewType: Extract<ViewType, "FORM" | "DETAIL">
  key?: string
  label: string
  tab?: string
  titleSize: NonNullable<FieldLayoutConfig["titleSize"]>
  titleColor?: string
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

export function SettingsPage({ section = "roles" }: { section?: "roles" | "print" }) {
  const { settings } = useAppUi()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [entityType, setEntityType] = useState(() => searchParams.get("module") || "customers")
  const [selectedRole, setSelectedRole] = useState(() => normalizeRole(searchParams.get("role") || DEFAULT_ROLE_SCOPE))
  const [expandedRoleKeys, setExpandedRoleKeys] = useState<string[]>([])
  const [fields, setFields] = useState<CustomField[]>([])
  const [masterOptionMap, setMasterOptionMap] = useState<Map<string, SelectOption[]>>(new Map())
  const [views, setViews] = useState<ViewSettingRecord[]>([])
  const [moduleViews, setModuleViews] = useState<ViewSettingRecord[]>([])
  const [tableConfig, setTableConfig] = useState<FieldLayoutConfig[]>([])
  const [formConfig, setFormConfig] = useState<FieldLayoutConfig[]>([])
  const [detailConfig, setDetailConfig] = useState<FieldLayoutConfig[]>([])
  const [previewViewType, setPreviewViewType] = useState<Extract<ViewType, "FORM" | "DETAIL"> | null>(null)
  const [titleDraft, setTitleDraft] = useState<TitleEditorDraft | null>(null)
  const [isNewTitleTab, setIsNewTitleTab] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [dynamicRoles, setDynamicRoles] = useState<DynamicRole[]>([])
  const [allowedActions, setAllowedActions] = useState<string[]>([])
  const [actionLabels, setActionLabels] = useState<Record<string, string>>({})
  const [actionOrders, setActionOrders] = useState<Record<string, number>>({})
  const [actionInline, setActionInline] = useState<Record<string, boolean>>({})
  const [editingAction, setEditingAction] = useState<ActionEditorDraft | null>(null)
  const [reuseInherited, setReuseInherited] = useState<Record<ViewType, boolean>>({ TABLE: false, FORM: false, DETAIL: false })
  const [reuseActionInherited, setReuseActionInherited] = useState(false)
  const [toast, toastContextHolder] = message.useMessage()
  const [docxTemplateForm] = Form.useForm()
  const [docxTemplateModal, setDocxTemplateModal] = useState(false)
  const [docxFile, setDocxFile] = useState<File | null>(null)
  const [docxTemplateTarget, setDocxTemplateTarget] = useState<Template | null>(null)
  const [uploadedTemplateType, setUploadedTemplateType] = useState<"DOCX" | "PDF">("DOCX")

  const fieldCatalog = useMemo(
    () => getFieldCatalog(entityType, fields),
    [entityType, fields],
  )
  const selectableRoles = useMemo(
    () => getRoleOptions(views, dynamicRoles.map((role) => role.key)),
    [dynamicRoles, views],
  )
  const inheritanceChain = useMemo(
    () => getRoleInheritanceChain(selectedRole, dynamicRoles),
    [dynamicRoles, selectedRole],
  )
  const hasRoleConfig = useMemo(
    () => views.some((view) => normalizeRole(view.role) === selectedRole),
    [selectedRole, views],
  )
  const actionOptions = useMemo(
    () => getResourceActionOptions(entityType),
    [entityType],
  )
  const orderedActionOptions = useMemo(
    () => [...actionOptions].sort((left, right) => (actionOrders[left.key] ?? Number.MAX_SAFE_INTEGER) - (actionOrders[right.key] ?? Number.MAX_SAFE_INTEGER)),
    [actionOptions, actionOrders],
  )
  const actionDndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const actionTableComponents = useMemo(() => ({ body: { row: SortableSettingsRow } }), [])
  const templatePresets = useMemo(
    () => TEMPLATE_PRESETS.filter((preset) => preset.entityType === entityType),
    [entityType],
  )
  const roleModuleOptions = useMemo(
    () => buildGroupedModuleOptions(appModuleLabels, resolveEnabledModules(settings.enabledModules, settings.companyType, settings.hasCustomModuleSelection)),
    [settings.companyType, settings.enabledModules, settings.hasCustomModuleSelection],
  )
  const roleModuleTree = useMemo(
    () => {
      const isInherited = (module: string, viewType: ViewType | "ACTION") => {
        if (selectedRole === DEFAULT_ROLE_SCOPE) return false
        return !moduleViews.some((view) =>
          view.entityType === module &&
          normalizeRole(view.role) === selectedRole &&
          (viewType === "ACTION"
            ? view.viewType === "ACTION" || (view.viewType === "TABLE" && Array.isArray(view.config?.allowedActions))
            : view.viewType === viewType),
        )
      }
      const moduleTitle = (module: string, label: string) => {
        const statusItems = [
          { icon: <KeyOutlined />, inherited: isInherited(module, "ACTION"), label: "Thao tác" },
          { icon: <TableOutlined />, inherited: isInherited(module, "TABLE"), label: "Bảng" },
          { icon: <FileTextOutlined />, inherited: isInherited(module, "FORM"), label: "Biểu mẫu" },
          { icon: <ProfileOutlined />, inherited: isInherited(module, "DETAIL"), label: "Chi tiết" },
        ]
        return <span className="role-tree-node-title"><span>{label}</span><span className="role-tree-node-status">{statusItems.map((item) => <Tooltip key={item.label} title={`${item.label}: ${item.inherited ? "đang kế thừa" : "cấu hình riêng"}`}><span className={item.inherited ? "is-inherited" : "is-custom"}>{item.icon}</span></Tooltip>)}</span></span>
      }
      return roleModuleOptions.map((group, index) => ({
        key: `group-${index}`,
        title: group.label,
        selectable: false,
        children: group.options.map((module) => ({ key: module.value, title: moduleTitle(module.value, module.label) })),
      }))
    },
    [moduleViews, roleModuleOptions, selectedRole],
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
  const actionSource = useMemo(() => normalizeRole(resolveActionSetting(views, selectedRole, dynamicRoles)?.role || DEFAULT_ROLE_SCOPE), [dynamicRoles, selectedRole, views])

  const roleTreeData = useMemo(() => {
    const allRoles = Array.from(new Set([...selectableRoles, ...dynamicRoles.map((role) => normalizeRole(role.key))]))
    const systemRoleKeys = new Set(systemRoleOptions)
    const defaultRoleLabels: Record<string, string> = {
      ALL: "Tất cả",
      ADMIN: "Quản trị viên",
      STAFF: "Nhân viên",
      DOCTOR: "Bác sĩ",
    }
    const childrenByParent = new Map<string, string[]>()
    dynamicRoles.forEach((role) => {
      const key = normalizeRole(role.key)
      // System roles are always roots. Ignore legacy dynamic definitions with
      // the same key so a self-reference (ADMIN → ADMIN) cannot hide them.
      if (systemRoleKeys.has(key)) return
      const parent = normalizeRole(role.roleMain)
      childrenByParent.set(parent, [...(childrenByParent.get(parent) || []), key])
    })
    type RoleTreeNode = { value: string; title: React.ReactNode; searchTitle: string; children?: RoleTreeNode[] }
    const buildNode = (role: string, seen = new Set<string>()): RoleTreeNode => {
      const dynamic = systemRoleKeys.has(role) ? undefined : dynamicRoles.find((item) => normalizeRole(item.key) === role)
      const children = (childrenByParent.get(role) || []).filter((child) => !seen.has(child)).map((child) => buildNode(child, new Set([...seen, role])))
      const title = dynamic ? `${dynamic.name} (${role})` : defaultRoleLabels[role] || role
      const isActionInherited = role !== DEFAULT_ROLE_SCOPE && !views.some((view) => normalizeRole(view.role) === role && (view.viewType === "ACTION" || (view.viewType === "TABLE" && Array.isArray(view.config?.allowedActions))))
      const statusItems = [
        { icon: <KeyOutlined />, inherited: isActionInherited, label: "Thao tác" },
        { icon: <TableOutlined />, inherited: role !== DEFAULT_ROLE_SCOPE && !hasExactRoleSetting(views, "TABLE", role), label: "Bảng" },
        { icon: <FileTextOutlined />, inherited: role !== DEFAULT_ROLE_SCOPE && !hasExactRoleSetting(views, "FORM", role), label: "Biểu mẫu" },
        { icon: <ProfileOutlined />, inherited: role !== DEFAULT_ROLE_SCOPE && !hasExactRoleSetting(views, "DETAIL", role), label: "Chi tiết" },
      ]
      return {
        value: role,
        searchTitle: title,
        title: <span className="role-tree-node-title"><span>{title}</span><span className="role-tree-node-status">{statusItems.map((item) => <Tooltip key={item.label} title={`${item.label}: ${item.inherited ? "đang kế thừa" : "cấu hình riêng"}`}><span className={item.inherited ? "is-inherited" : "is-custom"}>{item.icon}</span></Tooltip>)}</span></span>,
        children: children.length ? children : undefined,
      }
    }
    const rootChildren = [
      ...systemRoleOptions,
      ...allRoles.filter((role) =>
        role !== DEFAULT_ROLE_SCOPE &&
        !systemRoleKeys.has(role) &&
        !dynamicRoles.some((item) => normalizeRole(item.key) === role && allRoles.includes(normalizeRole(item.roleMain))),
      ),
    ]
      .map((role) => buildNode(role))
    const allNode = buildNode(DEFAULT_ROLE_SCOPE)
    return [{ ...allNode, children: [...(allNode.children || []), ...rootChildren] }]
  }, [dynamicRoles, selectableRoles, views])

  useEffect(() => {
    if (!selectableRoles.includes(selectedRole)) setSelectedRole(DEFAULT_ROLE_SCOPE)
  }, [selectableRoles, selectedRole])

  useEffect(() => {
    const keys: string[] = []
    const collectKeys = (nodes: Array<{ value: string; children?: unknown[] }>) => {
      nodes.forEach((node) => {
        keys.push(node.value)
        collectKeys((node.children || []) as Array<{ value: string; children?: unknown[] }>)
      })
    }
    collectKeys(roleTreeData)
    setExpandedRoleKeys(keys)
  }, [roleTreeData])

  useEffect(() => {
    const moduleFromUrl = searchParams.get("module") || "customers"
    const roleFromUrl = normalizeRole(searchParams.get("role") || DEFAULT_ROLE_SCOPE)

    setEntityType((current) => current === moduleFromUrl ? current : moduleFromUrl)
    setSelectedRole((current) => current === roleFromUrl ? current : roleFromUrl)
  }, [searchParams])

  useEffect(() => {
    const allowed = resolveEnabledModules(settings.enabledModules, settings.companyType, settings.hasCustomModuleSelection).filter((module) => Boolean(appModuleLabels[module]))
    if (allowed.length > 0 && !allowed.includes(entityType)) setEntityType(allowed[0])
  }, [entityType, settings.companyType, settings.enabledModules, settings.hasCustomModuleSelection])

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
    setAllowedActions(resolveAllowedActions(views, entityType, selectedRole, dynamicRoles))
    const savedActionLabels = resolveActionSetting(views, selectedRole, dynamicRoles)?.config?.actionLabels
    const savedActionOrders = resolveActionSetting(views, selectedRole, dynamicRoles)?.config?.actionOrders
    const savedActionInline = resolveActionSetting(views, selectedRole, dynamicRoles)?.config?.actionInline
    setActionLabels(
      Object.fromEntries(actionOptions.map((action) => [
        action.key,
        typeof savedActionLabels === "object" && savedActionLabels && typeof (savedActionLabels as Record<string, unknown>)[action.key] === "string"
          ? String((savedActionLabels as Record<string, unknown>)[action.key])
          : action.label,
      ])),
    )
    setActionOrders(Object.fromEntries(actionOptions.map((action, index) => [action.key, typeof savedActionOrders === "object" && savedActionOrders && Number.isFinite(Number((savedActionOrders as Record<string, unknown>)[action.key])) ? Number((savedActionOrders as Record<string, unknown>)[action.key]) : index + 1])))
    setActionInline(Object.fromEntries(actionOptions.map((action) => [action.key, typeof savedActionInline === "object" && savedActionInline && typeof (savedActionInline as Record<string, unknown>)[action.key] === "boolean" ? Boolean((savedActionInline as Record<string, unknown>)[action.key]) : ["view", "update"].includes(action.key)])))
    setTableConfig(
      buildFieldLayoutConfigs(
        fieldCatalog,
        resolveViewSetting(views, "TABLE", selectedRole, dynamicRoles),
        "TABLE",
      ),
    )
    setFormConfig(
      applyMasterDataOptions(buildFieldLayoutConfigs(
        fieldCatalog,
        resolveViewSetting(views, "FORM", selectedRole, dynamicRoles),
        "FORM",
      ), masterOptionMap),
    )
    setDetailConfig(
      buildFieldLayoutConfigs(
        fieldCatalog,
        resolveViewSetting(views, "DETAIL", selectedRole, dynamicRoles),
        "DETAIL",
      ),
    )
    setReuseInherited({
      TABLE: selectedRole !== DEFAULT_ROLE_SCOPE && !hasExactRoleSetting(views, "TABLE", selectedRole),
      FORM: selectedRole !== DEFAULT_ROLE_SCOPE && !hasExactRoleSetting(views, "FORM", selectedRole),
      DETAIL: selectedRole !== DEFAULT_ROLE_SCOPE && !hasExactRoleSetting(views, "DETAIL", selectedRole),
    })
    setReuseActionInherited(selectedRole !== DEFAULT_ROLE_SCOPE && !views.some((view) => normalizeRole(view.role) === selectedRole && (view.viewType === "ACTION" || (view.viewType === "TABLE" && Array.isArray(view.config?.allowedActions)))))
  }, [actionOptions, dynamicRoles, entityType, fieldCatalog, masterOptionMap, selectedRole, views])

  // Phiên đăng nhập lưu quyền để các màn hình danh sách đọc nhanh. Đồng bộ lại
  // ngay khi đang cấu hình chính role hiện tại, tránh phải đăng xuất/đăng nhập.
  function syncCurrentSessionActions(actions: string[], labels: Record<string, string>, orders: Record<string, number>, inline: Record<string, boolean>) {
    try {
      const stored = JSON.parse(localStorage.getItem("clinic-user") || "null")
      if (!stored || typeof stored !== "object" || normalizeRole(stored.activeRole || stored.role) !== selectedRole) return
      stored.actionPermissions = { ...(stored.actionPermissions || {}), [entityType]: actions }
      stored.actionPresentation = { ...(stored.actionPresentation || {}), [entityType]: { labels, orders, inline } }
      localStorage.setItem("clinic-user", JSON.stringify(stored))
    } catch {
      // Local storage hỏng không được làm gián đoạn việc lưu cấu hình server.
    }
  }

  useEffect(() => {
    const config = resolveActionSetting(views, selectedRole, dynamicRoles)?.config || {}
    syncCurrentSessionActions(
      resolveAllowedActions(views, entityType, selectedRole, dynamicRoles),
      config.actionLabels && typeof config.actionLabels === "object" ? config.actionLabels as Record<string, string> : {},
      config.actionOrders && typeof config.actionOrders === "object" ? config.actionOrders as Record<string, number> : {},
      config.actionInline && typeof config.actionInline === "object" ? config.actionInline as Record<string, boolean> : {},
    )
  }, [dynamicRoles, entityType, selectedRole, views])

  async function load() {
    const [fieldResponse, viewResponse, moduleViewResponse, templateResponse, roleResponse] = await Promise.all([
      getCachedCustomFields(entityType),
      getCachedViews(entityType),
      getCachedViews(),
      getCachedPrintTemplates(entityType),
      api.get("/settings/dynamic-roles"),
    ])
    const customFields = fieldResponse.data.data as CustomField[]
    const listFields = getFieldCatalog(entityType, customFields)
      .filter((field) => ['select', 'multi-select'].includes(field.type || '') && !field.relation)
    const masterOptions = await Promise.all(
      listFields
        .map(async (field) => {
          const response = await api.get('/master-data', { params: { group: `${entityType}.${field.key}` } })
          return [field.key, (response.data.data || [])
            .filter((item: Record<string, unknown>) => item.isActive !== false)
            .map((item: Record<string, unknown>) => ({ value: String(item.value), label: String(item.name) }))] as const
        }),
    )
    setMasterOptionMap(new Map(masterOptions))
    setFields(customFields)
    setViews(viewResponse.data.data)
    setModuleViews(moduleViewResponse.data.data)
    setTemplates(templateResponse.data.data)
    setDynamicRoles(roleResponse.data.data)
  }

  async function saveFieldView(viewType: ViewType, config: FieldLayoutConfig[], reused: boolean) {
    try {
      if (reused) {
        await api.delete(`/settings/views/${entityType}`, { params: { role: selectedRole, viewType } })
      } else {
        const configToSave = selectedRole === DEFAULT_ROLE_SCOPE
          ? config
          : config.map(({ options: _options, ...field }) => field)
        await api.put(`/settings/views/${entityType}/${viewType}`, {
          role: selectedRole,
          config: serializeViewConfig(viewType, configToSave, true, undefined, viewType === "TABLE"),
        })
      }
      // The create/edit popups mount RecordFormContent independently. Clear
      // its cached view data as soon as the saved layout changes.
      invalidateSettingsCache()
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể tự lưu cấu hình hiển thị"))
      await load()
    }
  }

  async function saveActionView(actions: string[], reused: boolean, labels = actionLabels, orders = actionOrders, inline = actionInline) {
    try {
      if (reused) {
        await api.delete(`/settings/views/${entityType}`, { params: { role: selectedRole, viewType: "ACTION" } })
      } else {
        await api.put(`/settings/views/${entityType}/ACTION`, { role: selectedRole, config: { allowedActions: actions, actionLabels: labels, actionOrders: orders, actionInline: inline } })
        syncCurrentSessionActions(actions, labels, orders, inline)
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể tự lưu cấu hình hiển thị"))
      await load()
    }
  }

  function reorderActions(event: DragEndEvent) {
    const fromKey = String(event.active.id)
    const toKey = event.over?.id ? String(event.over.id) : ""
    const fromIndex = orderedActionOptions.findIndex((action) => action.key === fromKey)
    const toIndex = orderedActionOptions.findIndex((action) => action.key === toKey)
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return
    const next = [...orderedActionOptions]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    const nextOrders = Object.fromEntries(next.map((action, index) => [action.key, index + 1]))
    setActionOrders(nextOrders)
    void saveActionView(allowedActions, reuseActionInherited, actionLabels, nextOrders, actionInline)
  }

  async function resetInheritedView() {
    await api.delete(`/settings/views/${entityType}`, {
      params: { role: selectedRole },
    })
    invalidateSettingsCache()
    message.success("Đã xóa config hiện tại. Role này sẽ kế thừa lại theo chuỗi mới")
    await load()
  }

  async function saveDocxTemplate(values: Record<string, unknown>) {
    const fileTypeLabel = uploadedTemplateType === "PDF" ? "PDF" : "DOCX"
    if (!docxFile) { message.error(`Chọn file ${fileTypeLabel} mẫu`); return }
    const formData = new FormData()
    formData.append("file", docxFile)
    formData.append("name", String(values.name || ""))
    try {
      if (docxTemplateTarget) {
        await api.patch(`/settings/print-templates/${docxTemplateTarget.id}/${uploadedTemplateType.toLowerCase()}`, formData)
        message.success(`Đã thay file ${fileTypeLabel}`)
      } else {
        formData.append("entityType", entityType)
        await api.post(`/settings/print-templates/${uploadedTemplateType.toLowerCase()}`, formData)
        message.success(`Đã lưu mẫu ${fileTypeLabel}`)
      }
      setDocxTemplateModal(false)
      setDocxFile(null)
      setDocxTemplateTarget(null)
      docxTemplateForm.resetFields()
      await load()
    } catch (error) { message.error(getApiErrorMessage(error, `Không thể lưu mẫu ${fileTypeLabel}`)) }
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

  function openDocxTemplateUpload(template?: Template) {
    setUploadedTemplateType("DOCX")
    setDocxTemplateTarget(template || null)
    setDocxFile(null)
    docxTemplateForm.setFieldsValue({ name: template?.name || "" })
    setDocxTemplateModal(true)
  }

  function openPdfTemplateUpload(template?: Template) {
    setUploadedTemplateType("PDF")
    setDocxTemplateTarget(template || null)
    setDocxFile(null)
    docxTemplateForm.setFieldsValue({ name: template?.name || "" })
    setDocxTemplateModal(true)
  }

  async function updateTemplateActive(template: Template, isActive: boolean) {
    try {
      await api.patch(`/settings/print-templates/${template.id}`, { isActive })
      setTemplates((current) => current.map((item) => item.id === template.id ? { ...item, isActive } : item))
      toast.success(isActive ? "Đã bật sử dụng mẫu in" : "Đã tắt sử dụng mẫu in")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể cập nhật trạng thái mẫu in"))
    }
  }

  async function downloadDocumentTemplate(template: Template) {
    try {
      const extension = template.templateType === "PDF" ? "pdf" : "docx"
      const response = await api.get(`/settings/print-templates/${template.id}/${extension}/source`, { responseType: "blob" })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement("a")
      link.href = url
      link.download = template.originalFilename || `${template.name}.${extension}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Không thể tải file mẫu"))
    }
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

    const current = viewType === "TABLE" ? tableConfig : viewType === "FORM" ? formConfig : detailConfig
    const next = current.map((field) =>
        field.key === key ? { ...field, ...patch } : field,
    )
    setter(next)
    void saveFieldView(viewType, next, reuseInherited[viewType])
  }, [detailConfig, entityType, formConfig, reuseInherited, selectedRole, tableConfig])

  function openTitleEditor(viewType: Extract<ViewType, "FORM" | "DETAIL">, field?: FieldLayoutConfig) {
    setTitleDraft({ viewType, key: field?.key, label: field?.label || "Tiêu đề mới", tab: field?.tab, titleSize: field?.titleSize || "md", titleColor: field?.titleColor, description: field?.description })
    setIsNewTitleTab(false)
  }

  function saveTitleConfig() {
    if (!titleDraft) return
    const { viewType } = titleDraft
    const current = viewType === "FORM" ? formConfig : detailConfig
    const title: FieldLayoutConfig = {
      key: titleDraft.key || `__layout_title_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      label: titleDraft.label.trim() || "Tiêu đề",
      tab: titleDraft.tab?.trim() || undefined,
      layoutType: "title",
      titleSize: titleDraft.titleSize,
      titleColor: titleDraft.titleColor,
      description: titleDraft.description,
      visible: true,
      width: "100",
    }
    const next = titleDraft.key ? current.map((field) => field.key === titleDraft.key ? title : field) : [...current, title]
    if (viewType === "FORM") setFormConfig(next)
    else setDetailConfig(next)
    void saveFieldView(viewType, next, reuseInherited[viewType])
    setTitleDraft(null)
    setIsNewTitleTab(false)
  }

  const titleAvailableTabs = useMemo(() => Array.from(new Set((titleDraft?.viewType === "FORM" ? formConfig : detailConfig).map((field) => field.tab?.trim()).filter((tab): tab is string => Boolean(tab)))), [detailConfig, formConfig, titleDraft?.viewType])

  function removeTitleConfig(viewType: Extract<ViewType, "FORM" | "DETAIL">, key: string) {
    const current = viewType === "FORM" ? formConfig : detailConfig
    const next = current.filter((field) => field.key !== key)
    if (viewType === "FORM") setFormConfig(next)
    else setDetailConfig(next)
    void saveFieldView(viewType, next, reuseInherited[viewType])
  }

  const reorderConfig = useCallback((
    viewType: ViewType,
    fromKey: string,
    toKey: string,
  ) => {
    let setter = setDetailConfig
    if (viewType === "FORM") setter = setFormConfig
    if (viewType === "TABLE") setter = setTableConfig
    if (viewType === "DETAIL") setter = setDetailConfig

    const current = viewType === "TABLE" ? tableConfig : viewType === "FORM" ? formConfig : detailConfig
    const fromIndex = current.findIndex((field) => field.key === fromKey)
    const toIndex = current.findIndex((field) => field.key === toKey)

    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return

    const next = [...current]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setter(next)
    void saveFieldView(viewType, next, reuseInherited[viewType])
  }, [detailConfig, entityType, formConfig, reuseInherited, selectedRole, tableConfig])

  return (
    <>
      {toastContextHolder}
      <div className="page-header">
          <Typography.Title className="page-title-with-icon" level={3}>{section === "roles" ? <><SettingOutlined /><span>Hiển thị theo role / module</span></> : <><FileTextOutlined /><span>Mẫu in</span></>}</Typography.Title>
        <Space wrap>
          {section === "roles" && (
            <TreeSelect
              className="role-tree-select"
              dropdownClassName="role-tree-select-dropdown"
              dropdownStyle={{ minWidth: 380 }}
              style={{ width: 380 }}
              value={selectedRole}
              onChange={(value) => setSelectedRole(normalizeRole(value))}
              treeData={roleTreeData}
              treeDefaultExpandAll
              treeExpandedKeys={expandedRoleKeys}
              treeNodeFilterProp="searchTitle"
              showSearch
              onTreeExpand={(keys) => setExpandedRoleKeys(keys as string[])}
            />
          )}
          {section !== "roles" && (
            <Select
              showSearch
              optionFilterProp="label"
              value={entityType}
              onChange={setEntityType}
              style={{ width: 420 }}
              options={buildGroupedModuleOptions(appModuleLabels, resolveEnabledModules(settings.enabledModules, settings.companyType, settings.hasCustomModuleSelection))}
            />
          )}
        </Space>
      </div>
      <div className={section === "roles" ? "settings-role-workspace" : undefined}>
      {section === "roles" && (
        <Card className="glass-card settings-role-module-tree">
          <Tree
            defaultExpandAll
            selectedKeys={[entityType]}
            treeData={roleModuleTree}
            onSelect={(keys) => {
              const selected = String(keys[0] || "")
              if (selected && !selected.startsWith("group-")) setEntityType(selected)
            }}
          />
        </Card>
      )}
      <Card className="glass-card settings-card">
        <Tabs
          className="settings-tabs"
          tabBarStyle={{ display: "none" }}
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
                      Đang cấu hình <strong>{appModuleLabels[entityType] || entityType}</strong> cho vai trò <strong>{formatRoleLabel(selectedRole, dynamicRoles)}</strong>. Chuỗi kế thừa: <strong>{inheritanceChain.map((role) => formatRoleLabel(role, dynamicRoles)).join(" → ")}</strong>.
                    </Typography.Text>
                  </div>
                  <Tabs
                    className="settings-inner-tabs"
                    items={[
                      {
                        key: "ACTIONS",
                        label: <span className="settings-view-tab-label">Thao tác theo vai trò {reuseActionInherited && <Tooltip title={`Đang kế thừa từ ${formatRoleLabel(actionSource, dynamicRoles)}`}><LinkOutlined /></Tooltip>}</span>,
                        children: (
                          <ViewOverridePanel canReuse={selectedRole !== DEFAULT_ROLE_SCOPE} reused={reuseActionInherited} source={formatRoleLabel(actionSource, dynamicRoles)} onReuseChange={(checked) => { setReuseActionInherited(checked); void saveActionView(allowedActions, checked) }}>
                          <Card size="small">
                            <DndContext collisionDetection={closestCenter} onDragEnd={reorderActions} sensors={actionDndSensors}>
                              <SortableContext items={orderedActionOptions.map((action) => action.key)} strategy={verticalListSortingStrategy}>
                                <Table
                                  components={actionTableComponents}
                                  size="small"
                                  pagination={false}
                                  rowKey="key"
                                  dataSource={orderedActionOptions}
                                  scroll={{ x: 900 }}
                                  tableLayout="fixed"
                                  columns={[
                                {
                                  title: "",
                                  key: "sort",
                                  width: 60,
                                  fixed: "left",
                                  render: (_, action) => {
                                    const index = orderedActionOptions.findIndex((item) => item.key === action.key)
                                    return <SettingsDragHandle order={index + 1} />
                                  },
                                },
                                {
                                  title: "Thao tác",
                                  key: "actions",
                                  width: 76,
                                  render: (_, action) => <Tooltip title="Sửa"><Button type="text" icon={<EditOutlined />} aria-label={`Sửa ${action.label}`} onClick={() => setEditingAction({ key: action.key, label: actionLabels[action.key] ?? action.label, enabled: allowedActions.includes(action.key), order: actionOrders[action.key] ?? 0, inline: Boolean(actionInline[action.key]) })} /></Tooltip>,
                                },
                                {
                                  title: "Hiển thị",
                                  key: "enabled",
                                  width: 100,
                                  render: (_, action) => <Checkbox checked={allowedActions.includes(action.key)} disabled aria-label={`Hiển thị ${action.label}`} />,
                                },
                                { title: "Mã thao tác", dataIndex: "key", width: 180, render: (value) => <Typography.Text strong>{value}</Typography.Text> },
                                {
                                  title: "Nhãn hiển thị",
                                  dataIndex: "key",
                                  render: (key, action) => actionLabels[String(key)] ?? action.label,
                                },
                                {
                                  title: "Thứ tự",
                                  dataIndex: "key",
                                  width: 110,
                                  render: (key) => actionOrders[String(key)] ?? "",
                                },
                                {
                                  title: "Hiện ở row",
                                  dataIndex: "key",
                                  width: 120,
                                  render: (key, action) => <Checkbox checked={Boolean(actionInline[String(key)])} disabled aria-label={`Hiện ${action.label} ở row`} />,
                                },
                              ]}
                                />
                              </SortableContext>
                            </DndContext>
                          </Card>
                          <Modal
                            open={Boolean(editingAction)}
                            title={`Chỉnh sửa thao tác${editingAction ? `: ${editingAction.key}` : ""}`}
                            okText="Lưu"
                            cancelText="Hủy"
                            onCancel={() => setEditingAction(null)}
                            onOk={() => {
                              if (!editingAction) return
                              const nextActions = editingAction.enabled ? Array.from(new Set([...allowedActions, editingAction.key])) : allowedActions.filter((key) => key !== editingAction.key)
                              const nextLabels = { ...actionLabels, [editingAction.key]: editingAction.label }
                              const nextOrders = { ...actionOrders, [editingAction.key]: editingAction.order }
                              const nextInline = { ...actionInline, [editingAction.key]: editingAction.inline }
                              setAllowedActions(nextActions)
                              setActionLabels(nextLabels)
                              setActionOrders(nextOrders)
                              setActionInline(nextInline)
                              void saveActionView(nextActions, reuseActionInherited, nextLabels, nextOrders, nextInline)
                              setEditingAction(null)
                            }}
                          >
                            {editingAction && <Form layout="vertical">
                              <Form.Item label="Hiển thị"><Checkbox checked={editingAction.enabled} onChange={(event) => setEditingAction((current) => current ? { ...current, enabled: event.target.checked } : current)}>Hiển thị thao tác này</Checkbox></Form.Item>
                              <Form.Item label="Nhãn hiển thị"><Input value={editingAction.label} onChange={(event) => setEditingAction((current) => current ? { ...current, label: event.target.value } : current)} /></Form.Item>
                              <Form.Item label="Thứ tự"><Input inputMode="numeric" value={String(editingAction.order)} onChange={(event) => setEditingAction((current) => current ? { ...current, order: Number(event.target.value.replace(/\D/g, "")) || 0 } : current)} /></Form.Item>
                              <Form.Item><Checkbox checked={editingAction.inline} onChange={(event) => setEditingAction((current) => current ? { ...current, inline: event.target.checked } : current)}>Hiện ở row</Checkbox></Form.Item>
                            </Form>}
                          </Modal>
                          </ViewOverridePanel>
                        ),
                      },
                      {
                        key: "TABLE",
                        label: <span className="settings-view-tab-label">Bảng {reuseInherited.TABLE && <Tooltip title={`Đang kế thừa từ ${formatRoleLabel(viewSources.TABLE, dynamicRoles)}`}><LinkOutlined /></Tooltip>}</span>,
                        children: <ViewOverridePanel canReuse={selectedRole !== DEFAULT_ROLE_SCOPE} reused={reuseInherited.TABLE} source={formatRoleLabel(viewSources.TABLE, dynamicRoles)} onReuseChange={(checked) => { setReuseInherited((current) => ({ ...current, TABLE: checked })); void saveFieldView("TABLE", tableConfig, checked) }}><ViewConfigTable dataSource={tableConfig} viewType="TABLE" onChange={updateConfig} onReorder={reorderConfig} /></ViewOverridePanel>,
                      },
                      {
                        key: "FORM",
                        label: <span className="settings-view-tab-label">Form nhập liệu {reuseInherited.FORM && <Tooltip title={`Đang kế thừa từ ${formatRoleLabel(viewSources.FORM, dynamicRoles)}`}><LinkOutlined /></Tooltip>}</span>,
                        children: <ViewOverridePanel canReuse={selectedRole !== DEFAULT_ROLE_SCOPE} reused={reuseInherited.FORM} source={formatRoleLabel(viewSources.FORM, dynamicRoles)} extra={<Space size={8}><Button size="small" onClick={() => setPreviewViewType("FORM")}>Xem trước</Button><Button icon={<PlusOutlined />} size="small" onClick={() => openTitleEditor("FORM")}>Thêm tiêu đề</Button></Space>} onReuseChange={(checked) => { setReuseInherited((current) => ({ ...current, FORM: checked })); void saveFieldView("FORM", formConfig, checked) }}><ViewConfigTable dataSource={formConfig} viewType="FORM" allowListOptions={selectedRole === DEFAULT_ROLE_SCOPE} allowOptionVisibility={selectedRole !== DEFAULT_ROLE_SCOPE} optionSource={masterOptionMap} module={entityType} onMasterOptionsChange={(key, options) => setMasterOptionMap((current) => new Map(current).set(key, options))} onChange={updateConfig} onEditTitle={openTitleEditor} onRemoveTitle={removeTitleConfig} onReorder={reorderConfig} /></ViewOverridePanel>,
                      },
                      {
                        key: "DETAIL",
                        label: <span className="settings-view-tab-label">Thông tin chi tiết {reuseInherited.DETAIL && <Tooltip title={`Đang kế thừa từ ${formatRoleLabel(viewSources.DETAIL, dynamicRoles)}`}><LinkOutlined /></Tooltip>}</span>,
                        children: <ViewOverridePanel canReuse={selectedRole !== DEFAULT_ROLE_SCOPE} reused={reuseInherited.DETAIL} source={formatRoleLabel(viewSources.DETAIL, dynamicRoles)} extra={<Space size={8}><Button size="small" onClick={() => setPreviewViewType("DETAIL")}>Xem trước</Button><Button icon={<PlusOutlined />} size="small" onClick={() => openTitleEditor("DETAIL")}>Thêm tiêu đề</Button></Space>} onReuseChange={(checked) => { setReuseInherited((current) => ({ ...current, DETAIL: checked })); void saveFieldView("DETAIL", detailConfig, checked) }}><ViewConfigTable dataSource={detailConfig} viewType="DETAIL" onChange={updateConfig} onEditTitle={openTitleEditor} onRemoveTitle={removeTitleConfig} onReorder={reorderConfig} /></ViewOverridePanel>,
                      },
                    ]}
                  />
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
                    <Space wrap>
                      <Button onClick={openCreateTemplate}>Thêm mẫu</Button>
                      <Button onClick={() => openDocxTemplateUpload()}>Tải mẫu DOCX</Button>
                      <Button onClick={() => openPdfTemplateUpload()}>Tải mẫu PDF</Button>
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
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="id"
                    dataSource={templates}
                    scroll={{ x: "max-content" }}
                    columns={[
                      { title: "Tên mẫu", dataIndex: "name" },
                      {
                        title: "Sử dụng",
                        dataIndex: "isActive",
                        width: 120,
                        render: (value, row) => <Switch checked={value !== false} onChange={(checked) => void updateTemplateActive(row, checked)} />,
                      },
                      {
                        title: "Thao tác",
                        width: 128,
                        align: "right",
                        render: (_, row) => (
                          ["DOCX", "PDF"].includes(row.templateType || "HTML") ? (
                            <Space size={2}>
                              <Tooltip title="Tải file gốc">
                                <Button type="text" icon={<DownloadOutlined />} onClick={() => void downloadDocumentTemplate(row)} />
                              </Tooltip>
                              <Button type="link" onClick={() => row.templateType === "PDF" ? openPdfTemplateUpload(row) : openDocxTemplateUpload(row)}>Tải lại</Button>
                            </Space>
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
              ),
            },
          ].filter((item) => item.key === (section === "roles" ? "view-config" : "print-templates"))}
        />
      </Card>
      </div>
      <Modal title={docxTemplateTarget ? `Tải lại file ${uploadedTemplateType}` : `Tải mẫu in ${uploadedTemplateType}`} open={docxTemplateModal} footer={null} onCancel={() => { setDocxTemplateModal(false); setDocxFile(null); setDocxTemplateTarget(null) }}>
        <Typography.Paragraph type="secondary">
          {uploadedTemplateType === "PDF"
            ? <>PDF phải có lớp văn bản (không phải file scan). Dùng placeholder riêng một đoạn như <code>{"{{fullName}}"}</code>, <code>{"{{code}}"}</code>; khi in, hệ thống sẽ thay dữ liệu và tải PDF kết quả có thể tìm/copy văn bản.</>
            : <>Dùng placeholder liền mạch như <code>{"{{fullName}}"}</code>, <code>{"{{code}}"}</code>. Khi in, hệ thống sẽ thay dữ liệu và tải DOCX kết quả.</>}
        </Typography.Paragraph>
        <Form form={docxTemplateForm} layout="vertical" onFinish={saveDocxTemplate}>
          <Form.Item name="name" label="Tên mẫu" rules={[{ required: true }]}><Input placeholder="Phiếu thông tin khách hàng" /></Form.Item>
          <Form.Item label={`File ${uploadedTemplateType}`} required>
            <Upload accept={uploadedTemplateType === "PDF" ? ".pdf,application/pdf" : ".docx"} maxCount={1} beforeUpload={(file) => { setDocxFile(file); return false }} onRemove={() => setDocxFile(null)}>
              <Button>{`Chọn file ${uploadedTemplateType}`}</Button>
            </Upload>
          </Form.Item>
          <Button className="primary-glow" htmlType="submit" type="primary">{docxTemplateTarget ? `Thay file ${uploadedTemplateType}` : `Lưu mẫu ${uploadedTemplateType}`}</Button>
        </Form>
      </Modal>
      <Modal footer={previewViewType === "FORM" ? null : <Button type="primary" onClick={() => setPreviewViewType(null)}>Đóng</Button>} open={Boolean(previewViewType)} title={`Xem trước ${previewViewType === "FORM" ? "form nhập liệu" : "thông tin chi tiết"}`} width={960} onCancel={() => setPreviewViewType(null)}>
        {previewViewType === "FORM" ? <RecordFormContent compact preview resource={entityType} viewRole={selectedRole} onCancel={() => setPreviewViewType(null)} /> : <ViewConfigPreview fields={detailConfig} viewType="DETAIL" />}
      </Modal>
      <Modal open={Boolean(titleDraft)} title={titleDraft?.key ? "Sửa tiêu đề" : "Thêm tiêu đề"} footer={<Space><Button onClick={() => { setTitleDraft(null); setIsNewTitleTab(false) }}>Hủy</Button>{titleDraft?.key ? <Button danger onClick={() => { removeTitleConfig(titleDraft.viewType, titleDraft.key!); setTitleDraft(null); setIsNewTitleTab(false) }}>Xóa</Button> : null}<Button type="primary" onClick={saveTitleConfig}>Lưu</Button></Space>} onCancel={() => { setTitleDraft(null); setIsNewTitleTab(false) }}>
        {titleDraft && <Form layout="vertical">
          <Form.Item label="Nội dung tiêu đề" required><Input autoFocus value={titleDraft.label} onChange={(event) => setTitleDraft((current) => current ? { ...current, label: event.target.value } : current)} /></Form.Item>
          <Form.Item label="Tab">
            <Select value={isNewTitleTab ? "__new__" : titleDraft.tab || "__none__"} options={[{ value: "__none__", label: "Không có" }, { value: "__new__", label: "Mới" }, ...titleAvailableTabs.map((tab) => ({ value: tab, label: tab }))]} onChange={(value) => {
              if (value === "__new__") { setIsNewTitleTab(true); setTitleDraft((current) => current ? { ...current, tab: undefined } : current) }
              else { setIsNewTitleTab(false); setTitleDraft((current) => current ? { ...current, tab: value === "__none__" ? undefined : value } : current) }
            }} />
            {isNewTitleTab ? <Input autoFocus style={{ marginTop: 8 }} value={titleDraft.tab} placeholder="Nhập tên tab mới" onChange={(event) => setTitleDraft((current) => current ? { ...current, tab: event.target.value } : current)} /> : null}
          </Form.Item>
          <Form.Item label="Cỡ chữ"><Select value={titleDraft.titleSize} options={[{ value: "sm", label: "Nhỏ" }, { value: "md", label: "Vừa" }, { value: "lg", label: "Lớn" }]} onChange={(titleSize) => setTitleDraft((current) => current ? { ...current, titleSize } : current)} /></Form.Item>
          <Form.Item label="Màu chữ"><Input type="color" value={titleDraft.titleColor || "#1f2937"} onChange={(event) => setTitleDraft((current) => current ? { ...current, titleColor: event.target.value } : current)} /></Form.Item>
          <Form.Item label="Mô tả"><Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} value={titleDraft.description} onChange={(event) => setTitleDraft((current) => current ? { ...current, description: event.target.value } : current)} /></Form.Item>
        </Form>}
      </Modal>
    </>
  )
}

function ViewOverridePanel({
  canReuse,
  reused,
  source,
  extra,
  onReuseChange,
  children,
}: {
  canReuse: boolean
  reused: boolean
  source: string
  extra?: React.ReactNode
  onReuseChange: (checked: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Space size={8}>
        <Checkbox disabled={!canReuse} checked={reused} onChange={(event) => onReuseChange(event.target.checked)}>
          Dùng lại cấu hình từ <strong>{source}</strong>
        </Checkbox>
        {extra}
      </Space>
      {reused ? (
        <Typography.Text type="secondary">Đang kế thừa cấu hình của {source}. Bỏ chọn để tạo cấu hình riêng cho role hiện tại.</Typography.Text>
      ) : children}
    </Space>
  )
}

function formatRoleLabel(role: string, dynamicRoles: DynamicRole[] = []) {
  const systemLabel = ({ ALL: "Tất cả", ADMIN: "Quản trị viên", STAFF: "Nhân viên", DOCTOR: "Bác sĩ" } as Record<string, string>)[role]
  return systemLabel || dynamicRoles.find((item) => normalizeRole(item.key) === role)?.name || role
}

type SettingsDragHandleContextValue = Pick<ReturnType<typeof useSortable>, "attributes" | "listeners" | "setActivatorNodeRef">
const SettingsDragHandleContext = createContext<SettingsDragHandleContextValue | null>(null)

function SortableSettingsRow(props: React.HTMLAttributes<HTMLTableRowElement>) {
  const rowKey = String((props as React.HTMLAttributes<HTMLTableRowElement> & { "data-row-key"?: string })["data-row-key"] || "")
  const { attributes, isDragging, listeners, setActivatorNodeRef, setNodeRef, transform, transition } = useSortable({ id: rowKey, disabled: !rowKey })
  return <SettingsDragHandleContext.Provider value={{ attributes, listeners, setActivatorNodeRef }}>
    <tr {...props} ref={setNodeRef} style={{ ...props.style, transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : props.style?.zIndex }} />
  </SettingsDragHandleContext.Provider>
}

function SettingsDragHandle({ order }: { order: number }) {
  const dragHandle = useContext(SettingsDragHandleContext)
  return <span className="drag-handle" ref={dragHandle?.setActivatorNodeRef} role="button" tabIndex={0} title="Kéo để đổi thứ tự" {...dragHandle?.attributes} {...dragHandle?.listeners}>
    <HolderOutlined /> <span className="drag-order">#{order}</span>
  </span>
}

function ViewConfigTable({
  dataSource,
  viewType,
  allowListOptions = false,
  allowOptionVisibility = false,
  optionSource,
  module,
  onMasterOptionsChange,
  onEditTitle,
  onChange,
  onRemoveTitle,
  onReorder,
}: {
  dataSource: FieldLayoutConfig[]
  viewType: ViewType
  allowListOptions?: boolean
  allowOptionVisibility?: boolean
  optionSource?: Map<string, SelectOption[]>
  module?: string
  onMasterOptionsChange?: (key: string, options: SelectOption[]) => void
  onEditTitle?: (viewType: Extract<ViewType, "FORM" | "DETAIL">, field: FieldLayoutConfig) => void
  onChange: (
    viewType: ViewType,
    key: string,
    patch: Partial<FieldLayoutConfig>,
  ) => void
  onRemoveTitle?: (viewType: Extract<ViewType, "FORM" | "DETAIL">, key: string) => void
  onReorder?: (viewType: ViewType, fromKey: string, toKey: string) => void
}) {
  const [editingField, setEditingField] = useState<FieldLayoutConfig | null>(null)
  const [optionEdit, setOptionEdit] = useState<{ fieldKey: string; index: number; value: string; label: string } | null>(null)
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
  const tableComponents = useMemo(() => ({ body: { row: SortableSettingsRow } }), [])
  const handleDragEnd = (event: DragEndEvent) => {
    const fromKey = String(event.active.id)
    const toKey = event.over?.id ? String(event.over.id) : ""
    if (onReorder && fromKey && toKey && fromKey !== toKey) onReorder(viewType, fromKey, toKey)
  }
  const columns: ColumnsType<FieldLayoutConfig> = [
    {
      title: "",
      key: "sort",
      width: 60,
      fixed: "left",
      render: (_, row) => {
        const index = dataSource.findIndex((item) => item.key === row.key)
        if (!onReorder || index < 0) return null
        return <SettingsDragHandle order={index + 1} />
      },
    },
    {
      title: "Hiển thị",
      dataIndex: "visible",
      width: 100,
      render: (value, row) => (
        <Checkbox
          checked={Boolean(value)}
          aria-label={`Hiển thị ${row.label}`}
          onChange={(event) => onChange(viewType, row.key, { visible: event.target.checked })}
        />
      ),
    },
    {
      title: "Mã trường",
      dataIndex: "key",
      width: 160,
      render: (value, row) => <Typography.Text strong>{row.layoutType === "title" ? "TITLE" : value}</Typography.Text>,
    },
    {
      title: "Loại",
      dataIndex: "type",
      width: 120,
      render: (value, row) => row.layoutType === "title" ? "Tiêu đề" : value || "text",
    },
    {
      title: "Nhãn hiển thị",
      dataIndex: "label",
      width: 180,
      render: (value) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: "Định dạng",
      dataIndex: "displayFormat",
      width: 120,
      render: (value) => value || "Mặc định",
    },
  ]
  if (viewType === "TABLE") {
    columns.push({
      title: "Rộng cột",
      dataIndex: "tableWidth",
      width: 120,
      render: (value) => value ? `${value}px` : "Mặc định",
    })
  } else {
    columns.push(
      {
        title: "Thẻ",
        dataIndex: "tab",
        width: 160,
        render: (value, row) => row.layoutType === "title" ? "" : value || "",
      },
      {
        title: "Kích thước",
        dataIndex: "width",
        width: 120,
        render: (value) => value ? `${value}%` : "Mặc định",
      },
    )
    if (viewType === "FORM") {
      columns.push({
        title: "Khóa sửa",
        dataIndex: "disabled",
        width: 100,
        render: (value, row) => <Checkbox checked={Boolean(value)} disabled aria-label={`Khóa sửa ${row.label}`} />,
      })
      columns.push({
        title: "Mẫu nhập",
        dataIndex: "inputPattern",
        width: 140,
        render: (value) => getInputPatternLabel(value) || "",
      })
    }
    if (viewType === "DETAIL") {
      columns.push(
        {
          title: "Yêu cầu PIN",
          dataIndex: "requiresPasswordToReveal",
          width: 120,
          render: (value, row) => <Checkbox checked={Boolean(value)} disabled aria-label={`Yêu cầu mã PIN để xem ${row.label}`} />,
        },
        {
          title: "Ẩn 3 số cuối",
          dataIndex: "maskLastThreeDigits",
          width: 130,
          render: (value, row) => <Checkbox checked={Boolean(value)} disabled aria-label={`Ẩn 3 số cuối của ${row.label}`} />,
        },
      )
    }
  }
  columns.splice(1, 0, {
    title: "Thao tác",
    key: "actions",
    width: 64,
    render: (_, row) => row.layoutType === "title" ? (
      <Tooltip title="Sửa tiêu đề"><Button type="text" icon={<EditOutlined />} aria-label={`Sửa tiêu đề ${row.label}`} onClick={() => { if (viewType !== "TABLE") onEditTitle?.(viewType, row) }} /></Tooltip>
    ) : (
      <Tooltip title="Sửa">
        <Button type="text" icon={<EditOutlined />} aria-label={`Sửa ${row.label}`} onClick={() => setEditingField({ ...row })} />
      </Tooltip>
    ),
  })

  return (
    <>
      <Card className="settings-view-config-table-card" size="small">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={dndSensors}>
          <SortableContext items={dataSource.map((field) => field.key)} strategy={verticalListSortingStrategy}>
            <Table columns={columns} components={tableComponents} dataSource={dataSource} pagination={false} rowClassName={(row) => row.visible ? "" : "settings-field-row-hidden"} rowKey="key" scroll={{ x: 960, y: "calc(100vh - 310px)" }} size="small" tableLayout="fixed" />
          </SortableContext>
        </DndContext>
      </Card>
      <Modal
        open={Boolean(editingField)}
        title={`Chỉnh sửa field${editingField ? `: ${editingField.label}` : ""}`}
        okText="Lưu"
        cancelText="Hủy"
        width={720}
        onCancel={() => setEditingField(null)}
        onOk={() => {
          if (!editingField) return
          const { key, ...patch } = editingField
          onChange(viewType, key, patch)
          setEditingField(null)
        }}
      >
        {editingField && <FieldConfigEditor field={editingField} viewType={viewType} allowListOptions={allowListOptions} allowOptionVisibility={allowOptionVisibility} availableOptions={optionSource?.get(editingField.key) || []} masterDataGroup={module ? `${module}.${editingField.key}` : undefined} onMasterOptionsChange={onMasterOptionsChange} availableTabs={Array.from(new Set(dataSource.map((item) => item.tab?.trim()).filter((tab): tab is string => Boolean(tab))))} onChange={setEditingField} onEditOption={setOptionEdit} />}
      </Modal>
      <Modal
        open={Boolean(optionEdit)}
        title="Sửa option"
        okText="Lưu"
        onCancel={() => setOptionEdit(null)}
        onOk={() => {
          if (!optionEdit) return
          setEditingField((field) => field?.key === optionEdit.fieldKey
            ? { ...field, options: updateSelectOptionAt(field.options, optionEdit.index, optionEdit) }
            : field)
          setOptionEdit(null)
        }}
      >
        <Form layout="vertical">
        <Form.Item label="Giá trị"><Input value={optionEdit?.value} onChange={(event) => setOptionEdit((current) => current ? { ...current, value: event.target.value } : current)} /></Form.Item>
          <Form.Item label="Nhãn hiển thị"><Input value={optionEdit?.label} onChange={(event) => setOptionEdit((current) => current ? { ...current, label: event.target.value } : current)} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function ViewConfigPreview({ fields, viewType }: { fields: FieldLayoutConfig[]; viewType: Extract<ViewType, "FORM" | "DETAIL"> }) {
  const groups = groupFieldsByTab(fields.filter((field) => field.visible))
  const usesTabs = groups.length > 1 || Boolean(groups[0]?.tab)
  const content = (group: { fields: FieldLayoutConfig[] }) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 16 }}>
      {group.fields.map((field) => {
        if (field.layoutType === "title") return <div key={field.key} style={{ gridColumn: "span 12" }}><Typography.Title level={4} style={{ margin: "8px 0 0", color: field.titleColor, fontSize: ({ sm: 16, md: 20, lg: 24 } as const)[field.titleSize || "md"] }}>{field.label}</Typography.Title>{field.description ? <Typography.Text type="secondary">{field.description}</Typography.Text> : null}</div>
        const width = ({ "25": 3, "33": 4, "50": 6, "66": 8, "75": 9, "100": 12 } as const)[field.width || "100"]
        return <div key={field.key} style={{ gridColumn: `span ${width}`, minWidth: 0 }}>
          {viewType === "FORM" ? <Form.Item label={field.label} style={{ marginBottom: 0 }}>
            {field.type === "textarea" ? <Input.TextArea disabled placeholder={field.placeholder} /> : field.type === "select" || field.type === "multi-select" ? <Select disabled placeholder={field.placeholder || "Chọn giá trị"} /> : <Input disabled placeholder={field.placeholder} />}
          </Form.Item> : <div className="detail-item"><div className="detail-item-label">{field.label}</div><div className="detail-item-content"><Typography.Text type="secondary">Dữ liệu mẫu</Typography.Text></div></div>}
        </div>
      })}
    </div>
  )

  if (!groups.length) return <Typography.Text type="secondary">Chưa có field hiển thị.</Typography.Text>
  return usesTabs ? <Tabs items={groups.map((group) => ({ key: group.key, label: group.tab || "Thông tin chung", children: content(group) }))} /> : content(groups[0])
}

function FieldConfigEditor({
  field,
  viewType,
  allowListOptions,
  allowOptionVisibility,
  availableOptions,
  masterDataGroup,
  onMasterOptionsChange,
  availableTabs,
  onChange,
  onEditOption,
}: {
  field: FieldLayoutConfig
  viewType: ViewType
  allowListOptions: boolean
  allowOptionVisibility: boolean
  availableOptions: SelectOption[]
  masterDataGroup?: string
  onMasterOptionsChange?: (key: string, options: SelectOption[]) => void
  availableTabs: string[]
  onChange: (field: FieldLayoutConfig) => void
  onEditOption: (option: { fieldKey: string; index: number; value: string; label: string }) => void
}) {
  const [isNewTab, setIsNewTab] = useState(false)
  const update = (patch: Partial<FieldLayoutConfig>) => onChange({ ...field, ...patch })
  const formatOptions = [
    { value: "currency", label: "Tiền tệ" },
    { value: "number", label: "Số" },
    { value: "percent", label: "Phần trăm" },
  ]
  const editableOptions = normalizeEditableOptions(field.options)

  return (
    <Form layout="vertical">
      <Form.Item label="Trường">
        <Input value={`${field.label} (${field.key})`} disabled />
      </Form.Item>
      <Form.Item label="Hiển thị">
        <Checkbox checked={field.visible} onChange={(event) => update({ visible: event.target.checked })}>Hiển thị field này</Checkbox>
      </Form.Item>
      {viewType === "DETAIL" && <Form.Item><Checkbox checked={Boolean(field.requiresPasswordToReveal)} onChange={(event) => update({ requiresPasswordToReveal: event.target.checked })}>Yêu cầu nhập mã PIN để xem giá trị</Checkbox></Form.Item>}
      {viewType === "DETAIL" && <Form.Item><Checkbox checked={Boolean(field.maskLastThreeDigits)} onChange={(event) => update({ maskLastThreeDigits: event.target.checked })}>Ẩn 3 số cuối, nhập mã PIN để xem</Checkbox></Form.Item>}
      {viewType === "FORM" && <Form.Item><Checkbox checked={Boolean(field.disabled)} onChange={(event) => update({ disabled: event.target.checked })}>Khóa sửa</Checkbox></Form.Item>}
      <Form.Item label="Nhãn hiển thị">
        <Input value={field.label} onChange={(event) => update({ label: event.target.value })} placeholder="Tên field hiển thị" />
      </Form.Item>
      <Form.Item label="Định dạng hiển thị">
        <Select allowClear placeholder="Mặc định" value={field.displayFormat} onChange={(value) => update({ displayFormat: value as FieldLayoutConfig["displayFormat"] | undefined })} options={formatOptions} />
      </Form.Item>
      {viewType === "TABLE" ? (
        <Form.Item label="Độ rộng cột (px)">
          <Input inputMode="numeric" value={field.tableWidth === undefined ? "" : String(field.tableWidth)} onChange={(event) => {
            const value = event.target.value.replace(/[^\d]/g, "")
            update({ tableWidth: value ? Number(value) : undefined })
          }} placeholder="Ví dụ 180" />
        </Form.Item>
      ) : <>
        <Form.Item label="Tiêu đề tab">
          <Select
            value={isNewTab ? "__new__" : field.tab || "__none__"}
            onChange={(value) => {
              if (value === "__new__") {
                setIsNewTab(true)
                update({ tab: undefined })
              } else {
                setIsNewTab(false)
                update({ tab: value === "__none__" ? undefined : value })
              }
            }}
            options={[
              { value: "__none__", label: "Không có" },
              { value: "__new__", label: "Mới" },
              ...availableTabs.map((tab) => ({ value: tab, label: tab })),
            ]}
          />
          {isNewTab && <Input style={{ marginTop: 8 }} value={field.tab} onChange={(event) => update({ tab: event.target.value })} placeholder="Nhập tên tab mới" autoFocus />}
        </Form.Item>
        <Form.Item label="Độ rộng">
          <Select value={field.width || "100"} onChange={(value) => update({ width: value as FieldLayoutConfig["width"] })} options={[
            { value: "25", label: "1/4" }, { value: "33", label: "1/3" }, { value: "50", label: "1/2 (2/4)" }, { value: "66", label: "2/3" }, { value: "75", label: "3/4" }, { value: "100", label: "Toàn bộ" },
          ]} />
        </Form.Item>
        <Form.Item label="Mô tả / hướng dẫn">
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} value={field.description} onChange={(event) => update({ description: event.target.value })} placeholder="Nội dung hướng dẫn hiển thị cho field" />
        </Form.Item>
      </>}
      {viewType === "FORM" && <>
        <Form.Item label="Gợi ý nhập">
          <Input value={field.placeholder} onChange={(event) => update({ placeholder: event.target.value })} placeholder="Gợi ý nhập liệu" />
        </Form.Item>
        <Form.Item label="Mẫu nhập" extra="Cú pháp react-input-mask: 9 = số, a = chữ cái, * = chữ hoặc số. Ví dụ: 9999aaaa, 999-999-9999; dùng HH-MM cho giờ hợp lệ.">
          <Input value={field.inputPattern} onChange={(event) => update({ inputPattern: event.target.value })} placeholder="Ví dụ: 9999aaaa hoặc HH-MM" />
        </Form.Item>
        <Form.Item label="Giá trị mặc định">
          <Input value={Array.isArray(field.defaultValue) ? field.defaultValue.join(", ") : field.defaultValue === undefined || field.defaultValue === null ? "" : String(field.defaultValue)} onChange={(event) => update({ defaultValue: parseDefaultValue(field.type, event.target.value) })} placeholder="Giá trị mặc định" />
        </Form.Item>
        {allowOptionVisibility && (field.type === "select" || field.type === "multi-select") && <Form.Item label="Lựa chọn hiển thị">
          <Checkbox.Group
            options={availableOptions.map((option) => {
              const normalized = normalizeSelectOption(option)
              return { value: normalized.value, label: normalized.label }
            })}
            value={field.visibleOptionValues || availableOptions.map((option) => normalizeSelectOption(option).value)}
            onChange={(values) => update({ visibleOptionValues: values.map(String) })}
          />
        </Form.Item>}
        {!allowListOptions && !allowOptionVisibility && (field.type === "select" || field.type === "multi-select") && <Typography.Paragraph type="secondary">
          Lựa chọn của field dạng danh sách được khai báo chung tại role ALL.
        </Typography.Paragraph>}
        {allowListOptions && (field.type === "select" || field.type === "multi-select") && masterDataGroup && <MasterDataOptionsEditor group={masterDataGroup} fieldKey={field.key} onChange={onMasterOptionsChange} />}
      </>}
    </Form>
  )
}

type MasterDataOption = { id: string; value: string; label: string }

function MasterDataOptionsEditor({
  group,
  fieldKey,
  onChange,
}: {
  group: string
  fieldKey: string
  onChange?: (key: string, options: SelectOption[]) => void
}) {
  const [rows, setRows] = useState<MasterDataOption[]>([])
  const [editing, setEditing] = useState<MasterDataOption | null>(null)
  const [form] = Form.useForm<Pick<MasterDataOption, "value" | "label">>()

  const load = useCallback(async () => {
    const response = await api.get("/master-data", { params: { group } })
    const next = (response.data.data || [])
      .filter((item: Record<string, unknown>) => item.isActive !== false)
      .map((item: Record<string, unknown>) => ({ id: String(item.id), value: String(item.value), label: String(item.name) }))
    setRows(next)
    onChange?.(fieldKey, next.map((option: MasterDataOption) => ({ value: option.value, label: option.label })))
  }, [fieldKey, group, onChange])

  useEffect(() => { void load() }, [load])

  async function save(values: Pick<MasterDataOption, "value" | "label">) {
    if (editing?.id) {
      await api.patch(`/master-data/${editing.id}`, { value: values.value.trim(), name: values.label.trim() })
    } else {
      await api.post("/master-data", { group, value: values.value.trim(), name: values.label.trim(), isActive: true, sortOrder: rows.length })
    }
    setEditing(null)
    form.resetFields()
    await load()
  }

  async function remove(id: string) {
    await api.delete(`/master-data/${id}`)
    await load()
  }

  return <Form.Item label="Lựa chọn">
    <div className="settings-options-editor">
      {rows.length === 0 ? <Typography.Text type="secondary">Chưa có option</Typography.Text> : rows.map((option) => (
        <div className="settings-option-row" key={option.id}>
          <div className="settings-option-summary"><strong>{option.label}</strong>{option.label !== option.value && <span>{option.value}</span>}</div>
          <Button type="text" icon={<EditOutlined />} onClick={() => { setEditing(option); form.setFieldsValue(option) }} />
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => void remove(option.id)} />
        </div>
      ))}
      <Button size="small" icon={<PlusOutlined />} onClick={() => { setEditing({ id: "", value: "", label: "" }); form.resetFields() }}>Thêm option</Button>
    </div>
    <Modal
      open={editing !== null}
      title={editing?.id ? "Sửa option" : "Thêm option"}
      okText="Lưu"
      onCancel={() => { setEditing(null); form.resetFields() }}
      onOk={() => void form.submit()}
    >
      <Form form={form} layout="vertical" onFinish={(values) => void save(values)}>
        <Form.Item name="value" label="Giá trị" rules={[{ required: true, message: "Nhập giá trị" }]}><Input /></Form.Item>
        <Form.Item name="label" label="Nhãn hiển thị" rules={[{ required: true, message: "Nhập nhãn" }]}><Input /></Form.Item>
      </Form>
    </Modal>
  </Form.Item>
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

function applyMasterDataOptions(
  fields: FieldLayoutConfig[],
  optionsByField: Map<string, SelectOption[]>,
) {
  return fields.map((field) => {
    const options = optionsByField.get(field.key)
    if (!options) return field
    const visibleOptions = Array.isArray(field.visibleOptionValues)
      ? options.filter((option) => field.visibleOptionValues!.includes(normalizeSelectOption(option).value))
      : options
    return { ...field, options: visibleOptions }
  })
}
