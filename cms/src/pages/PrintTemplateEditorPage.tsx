import { ArrowLeftOutlined, SaveOutlined } from "@ant-design/icons"
import { Button, Card, Form, Input, Select, Space, Tooltip, Typography, message } from "antd"
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
}

export function PrintTemplateEditorPage() {
  const { id = "new" } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const entityType = searchParams.get("module") || "customers"
  const presetKey = searchParams.get("preset") || ""
  const [form] = Form.useForm()
  const templateHtml = Form.useWatch("htmlTemplate", form)
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
      } else {
        await api.post("/settings/print-templates", {
          ...values,
          entityType,
        })
        message.success("Đã lưu mẫu in")
      }
      navigate(`/settings?module=${entityType}`)
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
            <Form.Item name="htmlTemplate" label="Nội dung mẫu in" rules={[{ required: true }]}>
              <PrintTiptapEditor variables={templateVariables} />
            </Form.Item>
          </Card>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card className="template-preview-card" title="Preview trực tiếp">
              <div
                className="template-preview-surface"
                dangerouslySetInnerHTML={{
                  __html: templateHtml || "<p>Nhập nội dung mẫu in để xem preview tại đây.</p>",
                }}
              />
            </Card>
            <Card className="template-preview-card" title="Biến có thể dùng">
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
            </Card>
          </Space>
        </div>
      </Form>
    </div>
  )
}
