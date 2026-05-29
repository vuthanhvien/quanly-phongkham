import {
  HolderOutlined,
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
import { CustomField, DynamicRole, entityLabels, getResourceActionOptions } from "../models"
import {
  buildFieldLayoutConfigs,
  DEFAULT_ROLE_SCOPE,
  FieldLayoutConfig,
  getFieldCatalog,
  getRoleOptions,
  getStoredUserRole,
  hasExactRoleSetting,
  normalizeRole,
  resolveAllowedActions,
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
  const [allowedActions, setAllowedActions] = useState<string[]>([])
  const [templateModal, setTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [templateForm] = Form.useForm()
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
  const actionOptions = useMemo(
    () => getResourceActionOptions(entityType),
    [entityType],
  )

  useEffect(() => {
    void load()
  }, [entityType])

  useEffect(() => {
    setModuleEnabled(resolveModuleEnabled(views, selectedRole))
    setAllowedActions(resolveAllowedActions(views, entityType, selectedRole))
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
  }, [entityType, fieldCatalog, selectedRole, views])

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

  function reorderConfig(
    viewType: ViewType,
    fromKey: string,
    toKey: string,
  ) {
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
        <Space wrap>
          <Select
            value={entityType}
            onChange={setEntityType}
            style={{ width: 240 }}
            options={Object.entries(entityLabels).map(([value, label]) => ({
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
                      Module hiện tại là <strong>{entityLabels[entityType] || entityType}</strong>. Chọn role để cấu hình dữ liệu nào được hiển thị ở bảng, form và màn chi tiết. Nếu module này chưa có cấu hình riêng, hệ thống sẽ kế thừa từ role mặc định <strong>{DEFAULT_ROLE_SCOPE}</strong>.
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
                        {viewType}: {viewStatus[viewType] ? "riêng theo role" : "đang kế thừa ALL"}
                      </Tag>
                    ))}
                  </Space>
                  <Card size="small" title="Action theo role" style={{ marginTop: 16 }}>
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
  const columns: ColumnsType<FieldLayoutConfig> = [
    {
      title: "",
      key: "sort",
      width: 56,
      render: (_, row) =>
        viewType === "FORM" || viewType === "DETAIL" ? (
          <span className="drag-handle" title="Kéo để đổi thứ tự">
            <HolderOutlined />
            <span className="drag-order">#{dataSource.findIndex((item) => item.key === row.key) + 1}</span>
          </span>
        ) : null,
    },
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

  if (viewType === "FORM") {
    columns.push(
      {
        title: "Options",
        key: "options",
        render: (_, row) => {
          if (row.type !== "select" && row.type !== "multi-select") {
            return <Typography.Text type="secondary">-</Typography.Text>
          }
          return (
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 3 }}
              value={(row.options || []).join(", ")}
              onChange={(event) =>
                onChange(viewType, row.key, {
                  options: event.target.value
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
              placeholder="Nhập options, ngăn cách bằng dấu phẩy"
            />
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
      components={{
        body: {
          row: (props: React.HTMLAttributes<HTMLTableRowElement>) => {
            const rowKey = String((props as React.HTMLAttributes<HTMLTableRowElement> & { "data-row-key"?: string })["data-row-key"] || "")
            const draggable = viewType === "FORM" || viewType === "DETAIL"
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
      }}
      dataSource={dataSource}
      pagination={false}
      rowKey="key"
      scroll={{ x: 1120 }}
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
