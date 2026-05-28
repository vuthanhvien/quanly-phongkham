import {
  Button,
  Card,
  Checkbox,
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
import type { ColumnsType } from "antd/es/table"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { CustomField, entityLabels } from "../models"
import {
  buildFieldLayoutConfigs,
  DEFAULT_ROLE_SCOPE,
  FieldLayoutConfig,
  getFieldCatalog,
  getRoleOptions,
  getStoredUserRole,
  hasExactRoleSetting,
  normalizeRole,
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

export function SettingsPage() {
  const [entityType, setEntityType] = useState("customers")
  const [selectedRole, setSelectedRole] = useState(getStoredUserRole())
  const [newRole, setNewRole] = useState("")
  const [fields, setFields] = useState<CustomField[]>([])
  const [views, setViews] = useState<ViewSettingRecord[]>([])
  const [tableConfig, setTableConfig] = useState<FieldLayoutConfig[]>([])
  const [formConfig, setFormConfig] = useState<FieldLayoutConfig[]>([])
  const [detailConfig, setDetailConfig] = useState<FieldLayoutConfig[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [fieldModal, setFieldModal] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [templateModal, setTemplateModal] = useState(false)
  const [fieldForm] = Form.useForm()
  const [templateForm] = Form.useForm()

  const fieldCatalog = useMemo(
    () => getFieldCatalog(entityType, fields),
    [entityType, fields],
  )
  const roleOptions = useMemo(
    () => getRoleOptions(views, [selectedRole]),
    [views, selectedRole],
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
    const [fieldResponse, viewResponse, templateResponse] = await Promise.all([
      api.get("/settings/custom-fields", { params: { entityType } }),
      api.get("/settings/views", { params: { entityType } }),
      api.get("/settings/print-templates", { params: { entityType } }),
    ])
    setFields(fieldResponse.data.data)
    setViews(viewResponse.data.data)
    setTemplates(templateResponse.data.data)
  }

  async function saveField(values: Record<string, any>) {
    const payload = {
      ...values,
      entityType,
      isActive: values.isActive ?? true,
      options: values.options
        ? String(values.options)
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined,
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
        config: serializeViewConfig("TABLE", tableConfig),
      }),
      api.put(`/settings/views/${entityType}/FORM`, {
        role: selectedRole,
        config: serializeViewConfig("FORM", formConfig),
      }),
      api.put(`/settings/views/${entityType}/DETAIL`, {
        role: selectedRole,
        config: serializeViewConfig("DETAIL", detailConfig),
      }),
    ])
    message.success("Đã lưu cấu hình table / form / detail theo role")
    await load()
  }

  async function addTemplate(values: Record<string, unknown>) {
    await api.post("/settings/print-templates", { ...values, entityType })
    setTemplateModal(false)
    templateForm.resetFields()
    message.success("Đã lưu mẫu in")
    await load()
  }

  function updateConfig(viewType: ViewType, key: string, patch: Partial<FieldLayoutConfig>) {
    const setter =
      viewType === "TABLE"
        ? setTableConfig
        : viewType === "FORM"
          ? setFormConfig
          : setDetailConfig
    setter((current) =>
      current.map((field) =>
        field.key === key ? { ...field, ...patch } : field,
      ),
    )
  }

  function addRoleScope() {
    const nextRole = normalizeRole(newRole)
    setSelectedRole(nextRole)
    setNewRole("")
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
      <div className="settings-grid">
        <Card
          className="glass-card"
          title="Custom fields"
          extra={
            <Button onClick={openCreateField}>Thêm field</Button>
          }
        >
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
                title: "Bắt buộc",
                dataIndex: "required",
                render: (value) => (value ? "Có" : "Không"),
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
        </Card>
        <Card
          className="glass-card"
          title="Hiển thị table / form / detail theo role"
          extra={
            <Space wrap>
              <Select
                style={{ width: 180 }}
                value={selectedRole}
                onChange={(value) => setSelectedRole(normalizeRole(value))}
                options={roleOptions.map((role) => ({ value: role, label: role }))}
              />
              <Input
                placeholder="Thêm role mới"
                value={newRole}
                onChange={(event) => setNewRole(event.target.value)}
                onPressEnter={addRoleScope}
                style={{ width: 160 }}
              />
              <Button onClick={addRoleScope}>Tạo role</Button>
            </Space>
          }
        >
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Typography.Text>
              Cấu hình đang áp dụng cho role <strong>{selectedRole}</strong>.
              Nếu một view chưa có cấu hình riêng, hệ thống sẽ kế thừa từ role mặc định <strong>{DEFAULT_ROLE_SCOPE}</strong>.
            </Typography.Text>
            <Space wrap>
              {VIEW_TYPES.map((viewType) => (
                <Tag color={viewStatus[viewType] ? "green" : "gold"} key={viewType}>
                  {viewType}: {viewStatus[viewType] ? "riêng theo role" : "đang kế thừa ALL"}
                </Tag>
              ))}
            </Space>
            <Tabs
              items={[
                {
                  key: "TABLE",
                  label: "Table",
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
                  label: "Form",
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
                  label: "Detail",
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
            <Button className="primary-glow" type="primary" onClick={saveView}>
              Lưu cấu hình role
            </Button>
          </Space>
        </Card>
        <Card
          className="glass-card"
          title="Mẫu in"
          extra={
            <Button onClick={() => setTemplateModal(true)}>Thêm mẫu</Button>
          }
        >
          <Table
            size="small"
            pagination={false}
            rowKey="id"
            dataSource={templates}
            columns={[
              { title: "Tên mẫu", dataIndex: "name" },
              { title: "Biến sử dụng", render: () => "{{field_key}}" },
            ]}
          />
        </Card>
      </div>
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
              options={["text", "number", "date", "boolean", "select"].map(
                (value) => ({ value, label: value }),
              )}
            />
          </Form.Item>
          <Form.Item name="options" label="Lựa chọn (ngăn cách dấu phẩy)">
            <Input />
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự" initialValue={0}>
            <InputNumber />
          </Form.Item>
          <Form.Item name="required" valuePropName="checked">
            <Checkbox>Bắt buộc nhập</Checkbox>
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
        title="Thêm mẫu in HTML"
        open={templateModal}
        footer={null}
        onCancel={() => setTemplateModal(false)}
      >
        <Form form={templateForm} layout="vertical" onFinish={addTemplate}>
          <Form.Item name="name" label="Tên mẫu" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="htmlTemplate"
            label="HTML, dùng {{key}} để lấy dữ liệu"
            rules={[{ required: true }]}
          >
            <Input.TextArea
              rows={9}
              placeholder={"<h1>Phiếu</h1><p>Khách: {{fullName}}</p>"}
            />
          </Form.Item>
          <Button className="primary-glow" htmlType="submit" type="primary">
            Lưu mẫu in
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
