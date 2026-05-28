import {
  AppstoreOutlined,
  FileTextOutlined,
  SettingOutlined,
} from "@ant-design/icons"
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd"
import Editor from "@monaco-editor/react"
import type { ColumnsType } from "antd/es/table"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { CustomField, DynamicRole, entityLabels } from "../models"
import {
  buildFieldLayoutConfigs,
  DEFAULT_ROLE_SCOPE,
  FieldLayoutConfig,
  getFieldCatalog,
  getRoleOptions,
  getStoredUserRole,
  hasExactRoleSetting,
  normalizeRole,
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
}

const CUSTOM_FIELD_TYPES = [
  "text",
  "number",
  "date",
  "boolean",
  "select",
  "textarea",
  "relative",
]

const RELATIVE_RESOURCE_OPTIONS = Object.entries(entityLabels).map(
  ([value, label]) => ({ value, label }),
)

const DEFAULT_TEMPLATE_HTML = `<section>
  <h1>Phiếu điều trị</h1>
  <p>Khách hàng: {{fullName}}</p>
  <p>Mã hồ sơ: {{code}}</p>
</section>`

export function SettingsPage() {
  const [entityType, setEntityType] = useState("customers")
  const [selectedRole, setSelectedRole] = useState(getStoredUserRole())
  const [moduleEnabled, setModuleEnabled] = useState(true)
  const [fields, setFields] = useState<CustomField[]>([])
  const [views, setViews] = useState<ViewSettingRecord[]>([])
  const [tableConfig, setTableConfig] = useState<FieldLayoutConfig[]>([])
  const [formConfig, setFormConfig] = useState<FieldLayoutConfig[]>([])
  const [detailConfig, setDetailConfig] = useState<FieldLayoutConfig[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [dynamicRoles, setDynamicRoles] = useState<DynamicRole[]>([])
  const [fieldModal, setFieldModal] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [templateModal, setTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [fieldForm] = Form.useForm()
  const [templateForm] = Form.useForm()
  const currentFieldType = Form.useWatch("dataType", fieldForm)
  const templateHtml = Form.useWatch("htmlTemplate", templateForm)

  const fieldCatalog = useMemo(
    () => getFieldCatalog(entityType, fields),
    [entityType, fields],
  )
  const templateVariables = useMemo(
    () => fieldCatalog.map((field) => `{{${field.key}}}`),
    [fieldCatalog],
  )
  const selectableRoles = useMemo(
    () => getRoleOptions(views, [selectedRole, ...dynamicRoles.map((role) => role.key)]),
    [dynamicRoles, selectedRole, views],
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

  useEffect(() => {
    void load()
  }, [entityType])

  useEffect(() => {
    setModuleEnabled(resolveModuleEnabled(views, selectedRole))
    setTableConfig(
      buildFieldLayoutConfigs(
        fieldCatalog,
        views.find(
          (view) =>
            view.viewType === "TABLE" &&
            normalizeRole(view.role) === selectedRole,
        ) ||
          views.find(
            (view) =>
              view.viewType === "TABLE" &&
              normalizeRole(view.role) === DEFAULT_ROLE_SCOPE,
          ),
        "TABLE",
      ),
    )
    setFormConfig(
      buildFieldLayoutConfigs(
        fieldCatalog,
        views.find(
          (view) =>
            view.viewType === "FORM" &&
            normalizeRole(view.role) === selectedRole,
        ) ||
          views.find(
            (view) =>
              view.viewType === "FORM" &&
              normalizeRole(view.role) === DEFAULT_ROLE_SCOPE,
          ),
        "FORM",
      ),
    )
    setDetailConfig(
      buildFieldLayoutConfigs(
        fieldCatalog,
        views.find(
          (view) =>
            view.viewType === "DETAIL" &&
            normalizeRole(view.role) === selectedRole,
        ) ||
          views.find(
            (view) =>
              view.viewType === "DETAIL" &&
              normalizeRole(view.role) === DEFAULT_ROLE_SCOPE,
          ),
        "DETAIL",
      ),
    )
  }, [fieldCatalog, selectedRole, views])

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

  async function saveField(values: Record<string, any>) {
    const payload = {
      ...values,
      entityType,
      required: false,
      isActive: values.isActive ?? true,
      options: values.dataType === "select" && values.options
        ? String(values.options)
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined,
      relationResource:
        values.dataType === "relative" ? values.relationResource : undefined,
    }
    if (editingField) {
      await api.patch(`/settings/custom-fields/${editingField.id}`, payload)
      message.success("Đã cập nhật field")
    } else {
      await api.post("/settings/custom-fields", payload)
      message.success("Đã thêm trường tùy biến")
    }
    setFieldModal(false)
    setEditingField(null)
    fieldForm.resetFields()
    await load()
  }

  function openCreateField() {
    setEditingField(null)
    fieldForm.resetFields()
    fieldForm.setFieldsValue({ dataType: "text", sortOrder: 0, isActive: true })
    setFieldModal(true)
  }

  function openEditField(field: CustomField) {
    setEditingField(field)
    fieldForm.setFieldsValue({
      ...field,
      options: field.options?.join(", "),
    })
    setFieldModal(true)
  }

  async function deleteField(id: string) {
    await api.delete(`/settings/custom-fields/${id}`)
    await load()
  }

  async function saveView() {
    await Promise.all([
      api.put(`/settings/views/${entityType}/TABLE`, {
        role: selectedRole,
        config: serializeViewConfig("TABLE", tableConfig, moduleEnabled),
      }),
      api.put(`/settings/views/${entityType}/FORM`, {
        role: selectedRole,
        config: serializeViewConfig("FORM", formConfig, moduleEnabled),
      }),
      api.put(`/settings/views/${entityType}/DETAIL`, {
        role: selectedRole,
        config: serializeViewConfig("DETAIL", detailConfig, moduleEnabled),
      }),
    ])
    message.success("Đã lưu cấu hình module theo role")
    await load()
  }

  async function saveTemplate(values: Record<string, unknown>) {
    if (editingTemplate) {
      await api.patch(`/settings/print-templates/${editingTemplate.id}`, {
        ...values,
        entityType,
      })
      message.success("Đã cập nhật mẫu in")
    } else {
      await api.post("/settings/print-templates", { ...values, entityType })
      message.success("Đã lưu mẫu in")
    }
    setTemplateModal(false)
    setEditingTemplate(null)
    templateForm.resetFields()
    await load()
  }

  function openCreateTemplate() {
    setEditingTemplate(null)
    templateForm.resetFields()
    templateForm.setFieldsValue({
      name: "",
      htmlTemplate: DEFAULT_TEMPLATE_HTML,
    })
    setTemplateModal(true)
  }

  function openEditTemplate(template: Template) {
    setEditingTemplate(template)
    templateForm.setFieldsValue(template)
    setTemplateModal(true)
  }

  function updateConfig(
    viewType: ViewType,
    key: string,
    patch: Partial<FieldLayoutConfig>,
  ) {
    let setter = setDetailConfig
    if (viewType === "FORM") setter = setFormConfig
    if (viewType === "TABLE") setter = setTableConfig
    if (viewType === "DETAIL") setter = setDetailConfig

    setter((current) =>
      current.map((field) =>
        field.key === key ? { ...field, ...patch } : field,
      ),
    )
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Text className="eyebrow">
            No-code operations
          </Typography.Text>
          <Typography.Title level={2}>Cấu hình động</Typography.Title>
        </div>
        <Select
          value={entityType}
          onChange={setEntityType}
          style={{ width: 240 }}
          options={Object.entries(entityLabels).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>
      <Card className="glass-card settings-card">
        <Tabs
          className="settings-tabs"
          items={[
            {
              key: "custom-fields",
              label: (
                <span className="simple-tab-label">
                  <AppstoreOutlined />
                  <span>Custom fields</span>
                </span>
              ),
              children: (
                <div className="settings-tab-panel">
                  <div className="settings-tab-header">
                    <Typography.Paragraph type="secondary">
                      Tại đây chỉ định nghĩa field, kiểu dữ liệu và liên kết. Quy tắc bắt buộc hiển thị được cấu hình riêng trong phần form nhập liệu.
                    </Typography.Paragraph>
                    <Button onClick={openCreateField}>Thêm field</Button>
                  </div>
                  <Table
                    size="small"
                    pagination={false}
                    rowKey="id"
                    dataSource={fields}
                    columns={[
                      { title: "Nhãn", dataIndex: "label" },
                      { title: "Key", dataIndex: "key" },
                      { title: "Kiểu", dataIndex: "dataType" },
                      {
                        title: "Liên kết",
                        render: (_, row) =>
                          row.relationResource
                            ? entityLabels[row.relationResource] || row.relationResource
                            : "-",
                      },
                      {
                        title: "Hoạt động",
                        dataIndex: "isActive",
                        render: (value) => (value ? "Bật" : "Tắt"),
                      },
                      {
                        title: "",
                        render: (_, row) => (
                          <Space>
                            <Button type="link" onClick={() => openEditField(row)}>
                              Sửa
                            </Button>
                            <Button
                              danger
                              type="link"
                              onClick={() => deleteField(row.id)}
                            >
                              Xóa
                            </Button>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
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
                      Module hiện tại là <strong>{entityLabels[entityType] || entityType}</strong>. Chọn role để cấu hình dữ liệu nào được hiển thị ở bảng, form và màn chi tiết. Nếu module này chưa có cấu hình riêng, hệ thống sẽ kế thừa từ role mặc định <strong>{DEFAULT_ROLE_SCOPE}</strong>.
                    </Typography.Text>
                    <Space wrap>
                      <Select
                        style={{ width: 180 }}
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
                      <Checkbox
                        checked={moduleEnabled}
                        onChange={(event) => setModuleEnabled(event.target.checked)}
                      >
                        Cho phép role sử dụng module này
                      </Checkbox>
                    </Space>
                  </div>
                  <Space wrap>
                    <Tag color={moduleEnabled ? "green" : "red"}>
                      Module: {moduleEnabled ? "Được dùng" : "Bị khóa"}
                    </Tag>
                    {VIEW_TYPES.map((viewType) => (
                      <Tag
                        color={viewStatus[viewType] ? "green" : "gold"}
                        key={viewType}
                      >
                        {viewType}: {viewStatus[viewType] ? "riêng theo role" : "đang kế thừa ALL"}
                      </Tag>
                    ))}
                  </Space>
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
                          />
                        ),
                      },
                    ]}
                  />
                  <Button
                    className="primary-glow"
                    type="primary"
                    onClick={saveView}
                  >
                    Lưu cấu hình hiển thị cho module
                  </Button>
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
                    <Typography.Paragraph type="secondary">
                      Dùng biến theo cú pháp Handlebars như {"{{fullName}}"} hoặc {"{{custom_key}}"}.
                    </Typography.Paragraph>
                    <Button onClick={openCreateTemplate}>Thêm mẫu</Button>
                  </div>
                  <div className="template-variable-cloud">
                    {templateVariables.map((variable) => (
                      <Tag className="soft-tag" key={variable}>
                        {variable}
                      </Tag>
                    ))}
                  </div>
                  <Divider />
                  <div className="template-layout">
                    <div>
                      <Table
                        size="small"
                        pagination={false}
                        rowKey="id"
                        dataSource={templates}
                        columns={[
                          { title: "Tên mẫu", dataIndex: "name" },
                          {
                            title: "Xem nhanh",
                            render: (_, row) => (
                              <Typography.Paragraph
                                ellipsis={{ rows: 2 }}
                                style={{ marginBottom: 0, maxWidth: 360 }}
                              >
                                {row.htmlTemplate}
                              </Typography.Paragraph>
                            ),
                          },
                          {
                            title: "",
                            render: (_, row) => (
                              <Button type="link" onClick={() => openEditTemplate(row)}>
                                Sửa
                              </Button>
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
      <Modal
        title={editingField ? "Cập nhật custom field" : "Thêm custom field"}
        open={fieldModal}
        footer={null}
        onCancel={() => {
          setFieldModal(false)
          setEditingField(null)
        }}
      >
        <Form form={fieldForm} layout="vertical" onFinish={saveField}>
          <Form.Item
            name="label"
            label="Tên hiển thị"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="key"
            label="Key dữ liệu"
            rules={[{ required: true }]}
          >
            <Input placeholder="vi_du_field" />
          </Form.Item>
          <Form.Item name="dataType" label="Kiểu" initialValue="text">
            <Select
              options={CUSTOM_FIELD_TYPES.map((value) => ({
                value,
                label: value,
              }))}
            />
          </Form.Item>
          {currentFieldType === "select" && (
            <Form.Item name="options" label="Lựa chọn (ngăn cách dấu phẩy)">
              <Input />
            </Form.Item>
          )}
          {currentFieldType === "relative" && (
            <Form.Item
              name="relationResource"
              label="Bảng liên kết"
              rules={[{ required: true, message: "Chọn bảng liên kết" }]}
            >
              <Select options={RELATIVE_RESOURCE_OPTIONS} />
            </Form.Item>
          )}
          <Form.Item name="sortOrder" label="Thứ tự" initialValue={0}>
            <InputNumber />
          </Form.Item>
          <Form.Item name="isActive" valuePropName="checked" initialValue>
            <Checkbox>Cho phép sử dụng</Checkbox>
          </Form.Item>
          <Button className="primary-glow" htmlType="submit" type="primary">
            {editingField ? "Cập nhật field" : "Lưu field"}
          </Button>
        </Form>
      </Modal>
      <Modal
        title={editingTemplate ? "Cập nhật mẫu in HTML" : "Thêm mẫu in HTML"}
        open={templateModal}
        footer={null}
        onCancel={() => {
          setTemplateModal(false)
          setEditingTemplate(null)
        }}
        width={1080}
      >
        <Form form={templateForm} layout="vertical" onFinish={saveTemplate}>
          <div className="template-editor-layout">
            <div>
              <Form.Item
                name="name"
                label="Tên mẫu"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="htmlTemplate"
                label="HTML template"
                rules={[{ required: true }]}
              >
                <Editor
                  height="420px"
                  defaultLanguage="html"
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    padding: { top: 14 },
                    scrollBeyondLastLine: false,
                    wordWrap: "on",
                  }}
                />
              </Form.Item>
            </div>
            <div>
              <Card className="template-preview-card" title="Preview trực tiếp">
                <div
                  className="template-preview-surface"
                  dangerouslySetInnerHTML={{
                    __html:
                      templateHtml ||
                      "<p>Nhập HTML mẫu in để xem preview tại đây.</p>",
                  }}
                />
              </Card>
              <Card className="template-preview-card" title="Biến có thể dùng">
                <div className="template-variable-cloud">
                  {templateVariables.map((variable) => (
                    <Tag className="soft-tag" key={variable}>
                      {variable}
                    </Tag>
                  ))}
                </div>
              </Card>
            </div>
          </div>
          <Button className="primary-glow" htmlType="submit" type="primary">
            {editingTemplate ? "Cập nhật mẫu" : "Lưu mẫu in"}
          </Button>
        </Form>
      </Modal>
    </>
  )
}

function ViewConfigTable({
  dataSource,
  viewType,
  onChange,
}: {
  dataSource: FieldLayoutConfig[]
  viewType: ViewType
  onChange: (
    viewType: ViewType,
    key: string,
    patch: Partial<FieldLayoutConfig>,
  ) => void
}) {
  const columns: ColumnsType<FieldLayoutConfig> = [
    {
      title: "Hiển thị",
      dataIndex: "visible",
      width: 96,
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
        title: "Bắt buộc",
        dataIndex: "required",
        width: 110,
        render: (value, row) => (
          <Checkbox
            checked={Boolean(value)}
            onChange={(event) =>
              onChange(viewType, row.key, { required: event.target.checked })
            }
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
    )
  }

  if (viewType === "FORM") {
    columns.push(
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
      dataSource={dataSource}
      pagination={false}
      rowKey="key"
      scroll={{ x: 1120 }}
      size="small"
    />
  )
}
