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
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  TreeSelect,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd"
import type { ColumnsType } from "antd/es/table"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { api } from "../api"
import { allAppModuleKeys, buildGroupedModuleOptions } from "../company-types"
import { getInputPatternLabel, INPUT_PATTERN_OPTIONS } from "../input-patterns"
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
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [entityType, setEntityType] = useState(() => searchParams.get("module") || "customers")
  const [selectedRole, setSelectedRole] = useState(() => normalizeRole(searchParams.get("role") || getStoredUserRole()))
  const [expandedRoleKeys, setExpandedRoleKeys] = useState<string[]>([])
  const [fields, setFields] = useState<CustomField[]>([])
  const [views, setViews] = useState<ViewSettingRecord[]>([])
  const [tableConfig, setTableConfig] = useState<FieldLayoutConfig[]>([])
  const [formConfig, setFormConfig] = useState<FieldLayoutConfig[]>([])
  const [detailConfig, setDetailConfig] = useState<FieldLayoutConfig[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [dynamicRoles, setDynamicRoles] = useState<DynamicRole[]>([])
  const [allowedActions, setAllowedActions] = useState<string[]>([])
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
  const actionOptions = useMemo(
    () => getResourceActionOptions(entityType),
    [entityType],
  )
  const templatePresets = useMemo(
    () => TEMPLATE_PRESETS.filter((preset) => preset.entityType === entityType),
    [entityType],
  )
  const roleAllowedModules = useMemo(() => {
    const role = dynamicRoles.find((item) => normalizeRole(item.key) === selectedRole)
    return Array.isArray(role?.allowedModules) ? role.allowedModules : allAppModuleKeys
  }, [dynamicRoles, selectedRole])
  const roleModuleOptions = useMemo(
    () => buildGroupedModuleOptions(permissionLabels, roleAllowedModules),
    [roleAllowedModules],
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
    const defaultRoleLabels: Record<string, string> = {
      ALL: "Tất cả",
      ADMIN: "Quản trị viên",
      STAFF: "Nhân viên",
      DOCTOR: "Bác sĩ",
    }
    const childrenByParent = new Map<string, string[]>()
    dynamicRoles.forEach((role) => {
      const key = normalizeRole(role.key)
      const parent = normalizeRole(role.roleMain)
      childrenByParent.set(parent, [...(childrenByParent.get(parent) || []), key])
    })
    type RoleTreeNode = { value: string; title: React.ReactNode; searchTitle: string; children?: RoleTreeNode[] }
    const buildNode = (role: string, seen = new Set<string>()): RoleTreeNode => {
      const dynamic = dynamicRoles.find((item) => normalizeRole(item.key) === role)
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
    const rootChildren = allRoles
      .filter((role) => role !== DEFAULT_ROLE_SCOPE && !dynamicRoles.some((item) => normalizeRole(item.key) === role && allRoles.includes(normalizeRole(item.roleMain))))
      .map((role) => buildNode(role))
    const allNode = buildNode(DEFAULT_ROLE_SCOPE)
    return [{ ...allNode, children: [...(allNode.children || []), ...rootChildren] }]
  }, [dynamicRoles, selectableRoles, views])

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
    const roleFromUrl = normalizeRole(searchParams.get("role") || getStoredUserRole())

    setEntityType((current) => current === moduleFromUrl ? current : moduleFromUrl)
    setSelectedRole((current) => current === roleFromUrl ? current : roleFromUrl)
  }, [searchParams])

  useEffect(() => {
    const allowed = roleAllowedModules.filter((module) => Boolean(permissionLabels[module]))
    if (allowed.length > 0 && !allowed.includes(entityType)) setEntityType(allowed[0])
  }, [entityType, roleAllowedModules])

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
    setReuseInherited({
      TABLE: selectedRole !== DEFAULT_ROLE_SCOPE && !hasExactRoleSetting(views, "TABLE", selectedRole),
      FORM: selectedRole !== DEFAULT_ROLE_SCOPE && !hasExactRoleSetting(views, "FORM", selectedRole),
      DETAIL: selectedRole !== DEFAULT_ROLE_SCOPE && !hasExactRoleSetting(views, "DETAIL", selectedRole),
    })
    setReuseActionInherited(selectedRole !== DEFAULT_ROLE_SCOPE && !views.some((view) => normalizeRole(view.role) === selectedRole && (view.viewType === "ACTION" || (view.viewType === "TABLE" && Array.isArray(view.config?.allowedActions)))))
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
      await Promise.all([...VIEW_TYPES.map((viewType) => {
        if (reuseInherited[viewType]) {
          return api.delete(`/settings/views/${entityType}`, { params: { role: selectedRole, viewType } })
        }
        const config = viewType === "TABLE" ? tableConfig : viewType === "FORM" ? formConfig : detailConfig
        return api.put(`/settings/views/${entityType}/${viewType}`, {
          role: selectedRole,
          config: serializeViewConfig(viewType, config, true, undefined, viewType === "TABLE"),
        })
      }), reuseActionInherited
        ? api.delete(`/settings/views/${entityType}`, { params: { role: selectedRole, viewType: "ACTION" } })
        : api.put(`/settings/views/${entityType}/ACTION`, { role: selectedRole, config: { allowedActions } })])
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
          <Typography.Title level={3}>{section === "roles" ? "Hiển thị theo role / module" : "Mẫu in"}</Typography.Title>
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
          {section === "roles" && (
            <Select
              showSearch
              optionFilterProp="label"
              value={entityType}
              onChange={setEntityType}
              placeholder="Chọn module"
              style={{ width: 420 }}
              options={roleModuleOptions}
            />
          )}
          {section !== "roles" && (
            <Select
              showSearch
              optionFilterProp="label"
              value={entityType}
              onChange={setEntityType}
              style={{ width: 420 }}
              options={buildGroupedModuleOptions(permissionLabels)}
            />
          )}
        </Space>
      </div>
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
                      Đang cấu hình <strong>{permissionLabels[entityType] || entityType}</strong> cho vai trò <strong>{selectedRole}</strong>. Chuỗi kế thừa: <strong>{inheritanceChain.join(" → ")}</strong>.
                    </Typography.Text>
                  </div>
                  <Tabs
                    className="settings-inner-tabs"
                    items={[
                      {
                        key: "ACTIONS",
                        label: <span className="settings-view-tab-label">Thao tác theo vai trò {reuseActionInherited && <Tooltip title={`Đang kế thừa từ ${formatRoleLabel(actionSource)}`}><LinkOutlined /></Tooltip>}</span>,
                        children: (
                          <ViewOverridePanel canReuse={selectedRole !== DEFAULT_ROLE_SCOPE} reused={reuseActionInherited} source={formatRoleLabel(actionSource)} onReuseChange={setReuseActionInherited}>
                          <Card size="small">
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
                          </ViewOverridePanel>
                        ),
                      },
                      {
                        key: "TABLE",
                        label: <span className="settings-view-tab-label">Bảng {reuseInherited.TABLE && <Tooltip title={`Đang kế thừa từ ${formatRoleLabel(viewSources.TABLE)}`}><LinkOutlined /></Tooltip>}</span>,
                        children: <ViewOverridePanel canReuse={selectedRole !== DEFAULT_ROLE_SCOPE} reused={reuseInherited.TABLE} source={formatRoleLabel(viewSources.TABLE)} onReuseChange={(checked) => setReuseInherited((current) => ({ ...current, TABLE: checked }))}><ViewConfigTable dataSource={tableConfig} viewType="TABLE" onChange={updateConfig} onReorder={reorderConfig} /></ViewOverridePanel>,
                      },
                      {
                        key: "FORM",
                        label: <span className="settings-view-tab-label">Form nhập liệu {reuseInherited.FORM && <Tooltip title={`Đang kế thừa từ ${formatRoleLabel(viewSources.FORM)}`}><LinkOutlined /></Tooltip>}</span>,
                        children: <ViewOverridePanel canReuse={selectedRole !== DEFAULT_ROLE_SCOPE} reused={reuseInherited.FORM} source={formatRoleLabel(viewSources.FORM)} onReuseChange={(checked) => setReuseInherited((current) => ({ ...current, FORM: checked }))}><ViewConfigTable dataSource={formConfig} viewType="FORM" onChange={updateConfig} onReorder={reorderConfig} /></ViewOverridePanel>,
                      },
                      {
                        key: "DETAIL",
                        label: <span className="settings-view-tab-label">Thông tin chi tiết {reuseInherited.DETAIL && <Tooltip title={`Đang kế thừa từ ${formatRoleLabel(viewSources.DETAIL)}`}><LinkOutlined /></Tooltip>}</span>,
                        children: <ViewOverridePanel canReuse={selectedRole !== DEFAULT_ROLE_SCOPE} reused={reuseInherited.DETAIL} source={formatRoleLabel(viewSources.DETAIL)} onReuseChange={(checked) => setReuseInherited((current) => ({ ...current, DETAIL: checked }))}><ViewConfigTable dataSource={detailConfig} viewType="DETAIL" onChange={updateConfig} onReorder={reorderConfig} /></ViewOverridePanel>,
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
    </>
  )
}

function ViewOverridePanel({
  canReuse,
  reused,
  source,
  onReuseChange,
  children,
}: {
  canReuse: boolean
  reused: boolean
  source: string
  onReuseChange: (checked: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Checkbox disabled={!canReuse} checked={reused} onChange={(event) => onReuseChange(event.target.checked)}>
        Dùng lại cấu hình từ <strong>{source}</strong>
      </Checkbox>
      {reused ? (
        <Typography.Text type="secondary">Đang kế thừa cấu hình của {source}. Bỏ chọn để tạo cấu hình riêng cho role hiện tại.</Typography.Text>
      ) : children}
    </Space>
  )
}

function formatRoleLabel(role: string) {
  return ({ ALL: "Tất cả", ADMIN: "Quản trị viên", STAFF: "Nhân viên", DOCTOR: "Bác sĩ" } as Record<string, string>)[role] || role
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
  const [editingField, setEditingField] = useState<FieldLayoutConfig | null>(null)
  const [optionEdit, setOptionEdit] = useState<{ fieldKey: string; index: number; value: string; label: string } | null>(null)
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
      title: "Hiển thị",
      dataIndex: "visible",
      width: 100,
      render: (value, row) => <Checkbox checked={value} onChange={(event) => onChange(viewType, row.key, { visible: event.target.checked })} aria-label={`Hiển thị ${row.label}`} />,
    },
    {
      title: "Trường",
      key: "field",
      width: 180,
      dataIndex: "label",
      render: (value) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: "Mã trường",
      dataIndex: "key",
      width: 160,
      render: (value) => <Typography.Text type="secondary">{value}</Typography.Text>,
    },
    {
      title: "Loại",
      dataIndex: "type",
      width: 120,
      render: (value) => value || "text",
    },
    {
      title: "Nhãn hiển thị",
      dataIndex: "label",
      width: 180,
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
        render: (value) => value || "Không có",
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
        render: (value) => value ? "Có" : "Không",
      })
      columns.push({
        title: "Mẫu nhập",
        dataIndex: "inputPattern",
        width: 140,
        render: (value) => getInputPatternLabel(value) || "Không có",
      })
    }
  }
  columns.push({
    title: "Thao tác",
    key: "actions",
    width: 148,
    fixed: "right",
    render: (_, row) => row.visible ? (
      <Space size={0}>
        <Button type="text" icon={<EditOutlined />} onClick={() => setEditingField({ ...row })}>Sửa</Button>
        <Popconfirm title={`Ẩn “${row.label}” khỏi giao diện này?`} okText="Ẩn" cancelText="Hủy" onConfirm={() => onChange(viewType, row.key, { visible: false })}>
          <Button type="text" danger icon={<DeleteOutlined />}>Xóa</Button>
        </Popconfirm>
      </Space>
    ) : <Button type="text" onClick={() => onChange(viewType, row.key, { visible: true })}>Khôi phục</Button>,
  })

  return (
    <>
      <Table columns={columns} components={tableComponents} dataSource={dataSource} pagination={false} rowKey="key" scroll={{ x: "max-content" }} size="small" />
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
        {editingField && <FieldConfigEditor field={editingField} viewType={viewType} availableTabs={Array.from(new Set(dataSource.map((item) => item.tab?.trim()).filter((tab): tab is string => Boolean(tab))))} onChange={setEditingField} onEditOption={setOptionEdit} />}
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

function FieldConfigEditor({
  field,
  viewType,
  availableTabs,
  onChange,
  onEditOption,
}: {
  field: FieldLayoutConfig
  viewType: ViewType
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
        <Form.Item label="Thẻ">
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
            { value: "25", label: "1/4" }, { value: "33", label: "1/3" }, { value: "50", label: "1/2" }, { value: "66", label: "2/3" }, { value: "100", label: "Toàn bộ" },
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
        <Form.Item label="Mẫu nhập">
          <Select
            allowClear
            placeholder="Không có"
            value={field.inputPattern}
            onChange={(value) => update({ inputPattern: value || "" })}
            options={INPUT_PATTERN_OPTIONS}
          />
        </Form.Item>
        <Form.Item label="Giá trị mặc định">
          <Input value={Array.isArray(field.defaultValue) ? field.defaultValue.join(", ") : field.defaultValue === undefined || field.defaultValue === null ? "" : String(field.defaultValue)} onChange={(event) => update({ defaultValue: parseDefaultValue(field.type, event.target.value) })} placeholder="Giá trị mặc định" />
        </Form.Item>
        {(field.type === "select" || field.type === "multi-select") && <Form.Item label="Lựa chọn">
          <div className="settings-options-editor">
            {editableOptions.length === 0 ? <Typography.Text type="secondary">Chưa có option</Typography.Text> : editableOptions.map((option, index) => (
              <div className="settings-option-row" key={`${field.key}-${index}`}>
                <div className="settings-option-summary"><strong>{option.label}</strong>{option.label !== option.value && <span>{option.value}</span>}</div>
                <Button type="text" icon={<EditOutlined />} onClick={() => onEditOption({ fieldKey: field.key, index, value: option.value, label: option.label })} />
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => update({ options: removeSelectOptionAt(field.options, index) })} />
              </div>
            ))}
            <Button size="small" icon={<PlusOutlined />} onClick={() => update({ options: appendSelectOption(field.options) })}>Thêm option</Button>
          </div>
        </Form.Item>}
      </>}
    </Form>
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
