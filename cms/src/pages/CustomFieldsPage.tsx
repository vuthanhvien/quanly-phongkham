import { AppstoreOutlined } from "@ant-design/icons"
import { Button, Card, Checkbox, Form, Input, InputNumber, Modal, Select, Space, Table, Typography, message } from "antd"
import { useEffect, useState } from "react"
import { api } from "../api"
import { CustomField, entityLabels } from "../models"

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

export function CustomFieldsPage() {
  const [entityType, setEntityType] = useState("customers")
  const [fields, setFields] = useState<CustomField[]>([])
  const [fieldModal, setFieldModal] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [fieldForm] = Form.useForm()
  const currentFieldType = Form.useWatch("dataType", fieldForm)

  useEffect(() => {
    void load()
  }, [entityType])

  async function load() {
    const response = await api.get("/settings/custom-fields", { params: { entityType } })
    setFields(response.data.data)
  }

  async function saveField(values: Record<string, unknown>) {
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
    message.success("Đã xóa field")
    await load()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Text className="eyebrow">
            No-code operations
          </Typography.Text>
          <Typography.Title level={2}>Custom fields</Typography.Title>
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
          <Button className="primary-glow" icon={<AppstoreOutlined />} type="primary" onClick={openCreateField}>
            Thêm field
          </Button>
        </Space>
      </div>
      <Card className="glass-card settings-card">
        <Typography.Paragraph type="secondary">
          Custom field dùng chung cho tất cả role. Phần hiển thị và bắt buộc nhập sẽ được cấu hình riêng theo role trong màn Cấu hình động.
        </Typography.Paragraph>
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
                  <Button danger type="link" onClick={() => deleteField(row.id)}>
                    Xóa
                  </Button>
                </Space>
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
          <Form.Item name="label" label="Tên hiển thị" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="key" label="Key dữ liệu" rules={[{ required: true }]}>
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
    </>
  )
}