import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons"
import { Button, Card, Checkbox, Form, Input, Select, Space, Tooltip, Typography, message } from "antd"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { api } from "../api"
import { PrintTiptapEditor } from "../components/PrintTiptapEditor"
import { CustomField } from "../models"
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
}

const printRepeatCollections: Record<string, Array<{ key: string; label: string }>> = {
  'service-orders': [{ key: 'items', label: 'Dòng đơn hàng / dịch vụ' }],
  'accounting-vouchers': [{ key: 'lines', label: 'Dòng hạch toán' }],
  products: [{ key: 'variants', label: 'Biến thể / SKU' }],
  projects: [{ key: 'members', label: 'Thành viên dự án' }],
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
  const editing = id !== "new"

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
  const templateVariableGroups = useMemo(
    () => groupTemplateVariables(templateVariables),
    [templateVariables],
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
        form.setFieldsValue(template)
        return
      }

      const preset = templatePresets.find((item) => item.key === presetKey)
      form.setFieldsValue({
        name: preset?.label || "",
        htmlTemplate: preset?.htmlTemplate || DEFAULT_PRINT_TEMPLATE_HTML,
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

  return (
    <div>
      <div className="page-header">
        <Space align="center" size={10}>
          <Tooltip title="Quay lại">
            <Button
              aria-label="Quay lại"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/settings?module=${entityType}`)}
            />
          </Tooltip>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {editing ? "Cập nhật mẫu in HTML" : "Thêm mẫu in HTML"}
          </Typography.Title>
        </Space>
        <Button
          className="primary-glow"
          icon={<SaveOutlined />}
          loading={saving}
          type="primary"
          onClick={() => form.submit()}
        >
          Lưu mẫu
        </Button>
      </div>
      <Form form={form} layout="vertical" onFinish={saveTemplate}>
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
            <Form.Item name="name" label="Tên mẫu" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="isActive" valuePropName="checked" initialValue>
              <Checkbox>Sử dụng mẫu in này</Checkbox>
            </Form.Item>
            <Form.Item name="htmlTemplate" rules={[{ required: true }]}>
              <PrintTiptapEditor variables={templateVariables} repeatCollections={printRepeatCollections[entityType] || []} />
            </Form.Item>
          </Card>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card className="template-variable-library" title={`Biến có thể dùng (${templateVariables.length})`}>
              {templateVariableGroups.map((group) => (
                <section className="template-variable-group" key={group.label}>
                  <Typography.Text className="template-variable-group-title" strong>{group.label}</Typography.Text>
                  {group.families.map((family) => (
                    <div className="template-variable-family" key={family.key}>
                      <Typography.Text type="secondary">{family.label}</Typography.Text>
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
                              <code>{`{{${variable.key}}}`}</code>
                            </Button>
                          </Tooltip>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              ))}
            </Card>
          </Space>
        </div>
      </Form>
    </div>
  )
}
