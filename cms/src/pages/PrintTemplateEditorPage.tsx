import { ArrowLeftOutlined, PrinterOutlined, SaveOutlined } from "@ant-design/icons"
import { CmsBackButton } from "../components/CmsBackButton"
import { Button, Card, Checkbox, Form, Input, Modal, Select, Space, Tooltip, Tree, Typography, message } from "antd"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { api } from "../api"
import { printHtmlInPlace } from "../utils/printHtml"
import { PrintTinyMceEditor } from "../components/PrintTinyMceEditor"
import { baseFields, CustomField } from "../models"
import { getFieldCatalog } from "../view-settings"
import {
  buildTemplateVariableOptions,
  DEFAULT_PRINT_TEMPLATE_HTML,
  PRINT_TEMPLATE_PRESETS,
} from "./SettingsPage"

interface Template {
  id: string
  name: string
  htmlTemplate: string
  templateType?: string
  originalFilename?: string
  isActive?: boolean
  pageWidth?: "A4" | "88mm" | "58mm"
}

type PrintRepeatCollection = { key: string; label: string; resource: string }

const printRepeatCollections: Record<string, PrintRepeatCollection[]> = {
  'service-orders': [{ key: 'items', label: 'Dòng đơn hàng / dịch vụ', resource: 'service-order-items' }],
  'accounting-vouchers': [{ key: 'lines', label: 'Dòng hạch toán', resource: 'accounting-voucher-lines' }],
  products: [{ key: 'variants', label: 'Biến thể / SKU', resource: 'product-variants' }],
  projects: [{ key: 'members', label: 'Thành viên dự án', resource: 'project-members' }],
  customers: [
    { key: 'appointments', label: 'Lịch hẹn', resource: 'appointments' },
    { key: 'medicalEpisodes', label: 'Hồ sơ bệnh án', resource: 'medical-episodes' },
    { key: 'treatments', label: 'Liệu trình', resource: 'treatments' },
    { key: 'consultations', label: 'Thăm khám', resource: 'consultations' },
    { key: 'serviceOrders', label: 'Đơn hàng / dịch vụ', resource: 'service-orders' },
    { key: 'customerImages', label: 'Hình ảnh - chẩn đoán', resource: 'customer-images' },
    { key: 'invoices', label: 'Phiếu thu / hóa đơn', resource: 'invoices' },
  ],
  staff: [
    { key: 'checkinMonth', label: 'Chấm công trong tháng hiện tại', resource: 'attendances' },
    { key: 'attendances', label: 'Toàn bộ chấm công', resource: 'attendances' },
    { key: 'workContracts', label: 'Hợp đồng lao động', resource: 'work-contracts' },
    { key: 'staffInsurances', label: 'Bảo hiểm', resource: 'staff-insurances' },
    { key: 'leaveRequests', label: 'Nghỉ phép', resource: 'leave-requests' },
    { key: 'attendanceAdjustments', label: 'Đổi giờ chấm công', resource: 'attendance-adjustment-requests' },
    { key: 'businessTrips', label: 'Đơn công tác', resource: 'business-trip-requests' },
    { key: 'paymentRequests', label: 'Xin thanh toán', resource: 'payment-requests' },
    { key: 'payrolls', label: 'Bảng lương', resource: 'payrolls' },
    { key: 'workSchedules', label: 'Lịch làm việc', resource: 'work-schedules' },
    { key: 'staffRewards', label: 'Khen thưởng & kỷ luật', resource: 'staff-rewards' },
    { key: 'staffTrainings', label: 'Đào tạo & chứng chỉ', resource: 'staff-trainings' },
    { key: 'performanceReviews', label: 'Đánh giá hiệu suất', resource: 'performance-reviews' },
    { key: 'positionHistories', label: 'Lịch sử thăng tiến', resource: 'position-histories' },
    { key: 'branchRoleAssignments', label: 'Quyền theo chi nhánh', resource: 'branch-role-assignments' },
    { key: 'userAccounts', label: 'Tài khoản đăng nhập', resource: 'user-accounts' },
  ],
}

type TemplateVariableFamily = {
  key: string
  label: string
  variables: ReturnType<typeof buildTemplateVariableOptions>
}

function groupTemplateVariables(variables: ReturnType<typeof buildTemplateVariableOptions>) {
  const categories = new Map<string, Map<string, TemplateVariableFamily>>()
  const suffixPattern = /(_fm_(?:mdy|ymd|dmy)|_fm|_up|_cap)$/

  variables.forEach((variable) => {
    const familyKey = variable.key.replace(suffixPattern, "")
    const category = familyKey.includes(".") ? "Thông tin liên kết" : "Thông tin chính"
    const families = categories.get(category) || new Map<string, TemplateVariableFamily>()
    const current = families.get(familyKey) || {
      key: familyKey,
      label: variables.find((item) => item.key === familyKey)?.label || variable.label.replace(/ - .+$/, ""),
      variables: [],
    }
    current.variables.push(variable)
    families.set(familyKey, current)
    categories.set(category, families)
  })

  return Array.from(categories, ([label, families]) => ({
    label,
    families: Array.from(families.values()).sort((left, right) => left.key.localeCompare(right.key)),
  }))
}

export function PrintTemplateEditorPage() {
  const { id = "new" } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const entityType = searchParams.get("module") || "customers"
  const presetKey = searchParams.get("preset") || ""
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [variableSearch, setVariableSearch] = useState("")
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewRecords, setPreviewRecords] = useState<Array<Record<string, unknown>>>([])
  const [previewRecordId, setPreviewRecordId] = useState<string>()
  const [previewLoading, setPreviewLoading] = useState(false)
  const editing = id !== "new"
  const pageWidth = Form.useWatch("pageWidth", form) || "A4"

  const fieldCatalog = useMemo(
    () => getFieldCatalog(entityType, customFields),
    [customFields, entityType],
  )
  const templateVariables = useMemo(
    () => buildTemplateVariableOptions(entityType, fieldCatalog),
    [entityType, fieldCatalog],
  )
  const templatePresets = useMemo(
    () => PRINT_TEMPLATE_PRESETS.filter((preset) => preset.entityType === entityType),
    [entityType],
  )
  const repeatCollections = useMemo(
    () => printRepeatCollections[entityType] || [],
    [entityType],
  )
  const repeatVariableGroups = useMemo(() => repeatCollections.map((collection) => {
    const fields = baseFields[collection.resource] || []
    const variables = [
      { key: "@index", label: "Số thứ tự" },
      { key: "item.name", label: "Tên / nội dung" },
      { key: "item.code", label: "Mã / trạng thái" },
      ...fields.map((field) => ({ key: `item.${field.key}`, label: field.label })),
    ].filter((variable, index, all) => all.findIndex((item) => item.key === variable.key) === index)
    return {
      label: `Bảng lặp · ${collection.label}`,
      families: variables.map((variable) => ({ ...variable, variables: [variable] })),
    }
  }), [repeatCollections])
  const templateVariableGroups = useMemo(() => {
    const query = variableSearch.trim().toLowerCase()
    const groups = [...groupTemplateVariables(templateVariables), ...repeatVariableGroups]
    if (!query) return groups
    return groups.map((group) => ({
      ...group,
      families: group.families
        .map((family) => ({
          ...family,
          variables: family.variables.filter((variable) => `${family.label} ${variable.key} ${variable.label}`.toLowerCase().includes(query)),
        }))
        .filter((family) => family.variables.length > 0),
    })).filter((group) => group.families.length > 0)
  }, [templateVariables, repeatVariableGroups, variableSearch],
  )

  useEffect(() => {
    void load()
  }, [entityType, id, presetKey])

  async function load() {
    setLoading(true)
    try {
      const [fieldResponse, templateResponse] = await Promise.all([
        api.get("/settings/custom-fields", { params: { entityType } }),
        editing
          ? api.get("/settings/print-templates", { params: { entityType } })
          : Promise.resolve({ data: { data: [] } }),
      ])
      setCustomFields(fieldResponse.data.data || [])

      if (editing) {
        const template = (templateResponse.data.data || []).find((item: Template) => item.id === id)
        if (!template) {
          message.error("Không tìm thấy mẫu in")
          navigate(`/settings?module=${entityType}`)
          return
        }
        form.setFieldsValue({ ...template, pageWidth: template.pageWidth || "A4" })
        return
      }

      const preset = templatePresets.find((item) => item.key === presetKey)
      form.setFieldsValue({
        name: preset?.label || "",
        htmlTemplate: preset?.htmlTemplate || DEFAULT_PRINT_TEMPLATE_HTML,
        pageWidth: "A4",
      })
    } finally {
      setLoading(false)
    }
  }

  async function saveTemplate(values: Record<string, unknown>) {
    setSaving(true)
    try {
      if (editing) {
        await api.patch(`/settings/print-templates/${id}`, {
          ...values,
          entityType,
        })
        message.success("Đã cập nhật mẫu in")
        await load()
      } else {
        const response = await api.post("/settings/print-templates", {
          ...values,
          entityType,
        })
        message.success("Đã lưu mẫu in")
        const templateId = String(response.data.data?.id || "")
        if (templateId) {
          navigate(`/settings/print-templates/${templateId}?module=${encodeURIComponent(entityType)}`, { replace: true })
          return
        }
      }
    } finally {
      setSaving(false)
    }
  }

  function applyPreset(presetKeyValue: string) {
    const preset = templatePresets.find((item) => item.key === presetKeyValue)
    if (!preset) return
    form.setFieldsValue({
      name: form.getFieldValue("name") || preset.label,
      htmlTemplate: preset.htmlTemplate,
    })
  }

  async function openPrintPreview() {
    const htmlTemplate = String(form.getFieldValue("htmlTemplate") || "").trim()
    if (!htmlTemplate) {
      message.warning("Nhập nội dung mẫu in trước khi in thử")
      return
    }
    setPreviewOpen(true)
    setPreviewRecordId(undefined)
    setPreviewLoading(true)
    try {
      const response = await api.get(`/records/${entityType}`, { params: { pageSize: 100, include: "*" } })
      setPreviewRecords(response.data.data || [])
    } finally {
      setPreviewLoading(false)
    }
  }

  async function printPreview() {
    if (!previewRecordId) {
      message.warning("Chọn một bản ghi để in thử")
      return
    }
    setPreviewLoading(true)
    try {
      const response = await api.post("/settings/print-templates/render-preview", {
        entityType,
        recordId: previewRecordId,
        htmlTemplate: form.getFieldValue("htmlTemplate"),
        pageWidth,
      }, { responseType: "text" })
      printHtmlInPlace(response.data, "In thử mẫu")
      setPreviewOpen(false)
    } catch {
      message.error("Không thể tạo bản in thử")
    } finally {
      setPreviewLoading(false)
    }
  }

  function previewRecordLabel(record: Record<string, unknown>) {
    const main = record.code || record.fullName || record.name || record.title || record.email || record.id
    const secondary = [record.code, record.fullName || record.name].filter(Boolean).join(" — ")
    return secondary || String(main || "Bản ghi")
  }

  return (
    <Form form={form} layout="vertical" onFinish={saveTemplate}>
      <div className="page-header">
        <Space align="center" size={10}>
          <CmsBackButton to={`/settings?module=${entityType}`} />
          <Typography.Title level={3} style={{ margin: 0 }}>
            {editing ? "Cập nhật mẫu in HTML" : "Thêm mẫu in HTML"}
          </Typography.Title>
        </Space>
        <Space size={10} wrap>
          <Form.Item name="name" noStyle rules={[{ required: true, message: "Nhập tên mẫu" }]}>
            <Input placeholder="Tên mẫu in" style={{ width: 260 }} />
          </Form.Item>
          <Form.Item name="isActive" noStyle valuePropName="checked" initialValue>
            <Checkbox>Sử dụng mẫu in này</Checkbox>
          </Form.Item>
          <Form.Item name="pageWidth" noStyle initialValue="A4">
            <Select
              aria-label="Khổ giấy"
              options={[
                { value: "A4", label: "A4" },
                { value: "88mm", label: "K80 · 88 mm" },
                { value: "58mm", label: "K58 · 58 mm" },
              ]}
              style={{ width: 132 }}
            />
          </Form.Item>
          <Button
            icon={<PrinterOutlined />}
            onClick={() => void openPrintPreview()}
          >
            In thử
          </Button>
          <Button
            className="primary-glow"
            icon={<SaveOutlined />}
            loading={saving}
            type="primary"
            onClick={() => form.submit()}
          >
            Lưu mẫu
          </Button>
        </Space>
      </div>
      <Modal
        confirmLoading={previewLoading}
        okText="In thử"
        onCancel={() => setPreviewOpen(false)}
        onOk={() => void printPreview()}
        open={previewOpen}
        title="Chọn bản ghi để in thử"
      >
        <Select
          autoFocus
          loading={previewLoading}
          onChange={setPreviewRecordId}
          optionFilterProp="label"
          options={previewRecords.map((record) => ({ label: previewRecordLabel(record), value: String(record.id) }))}
          placeholder="Tìm và chọn bản ghi"
          showSearch
          style={{ width: "100%" }}
          value={previewRecordId}
        />
      </Modal>
      <div className="template-page-layout">
        <Card className="glass-card" loading={loading}>
          {templatePresets.length > 0 && (
            <Form.Item label="Mẫu có sẵn">
              <Select
                allowClear
                placeholder="Chọn mẫu để nạp nhanh vào editor"
                options={templatePresets.map((preset) => ({
                  value: preset.key,
                  label: preset.label,
                }))}
                onChange={(value) => value && applyPreset(String(value))}
              />
            </Form.Item>
          )}
          <Form.Item name="htmlTemplate" rules={[{ required: true }]}>
            <PrintTinyMceEditor
              pageWidth={pageWidth as "A4" | "88mm" | "58mm"}
              variables={templateVariables}
              repeatCollections={repeatCollections}
            />
          </Form.Item>
        </Card>
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card className="template-variable-library" title={`Biến có thể dùng (${templateVariables.length})`}>
            <Input.Search
              allowClear
              placeholder="Tìm mã hoặc tên biến"
              value={variableSearch}
              onChange={(event) => setVariableSearch(event.target.value)}
            />
            <Tree
              blockNode
              defaultExpandAll
              selectable={false}
              showLine
              treeData={templateVariableGroups.map((group, groupIndex) => ({
                key: `group-${groupIndex}-${group.label}`,
                title: <Typography.Text className="template-variable-group-title" strong>{group.label}</Typography.Text>,
                children: group.families.map((family, familyIndex) => ({
                  key: `field-${groupIndex}-${familyIndex}-${family.key}`,
                  title: (
                    <div className="template-variable-row">
                      <Typography.Text>{family.label}</Typography.Text>
                      <div className="template-variable-codes">
                        {family.variables.map((variable) => (
                          <Tooltip key={variable.key} title={`${variable.label} — bấm để copy`}>
                            <Button
                              size="small"
                              type="text"
                              onClick={() => {
                                void navigator.clipboard?.writeText(`{{${variable.key}}}`)
                                message.success(`Đã copy {{${variable.key}}}`)
                              }}
                            >
                              <code>{variable.key}</code>
                            </Button>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  ),
                })),
              }))}
            />
          </Card>
        </Space>
      </div>
    </Form>
  )
}
