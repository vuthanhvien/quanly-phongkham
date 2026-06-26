import { Button, Card, Checkbox, Form, Input, Modal, Select, Space, Table, Typography, message } from "antd"
import { useEffect, useState } from "react"
import { api } from "../api"
import { DynamicRole, systemRoleSelectOptions } from "../models"

interface RoleFormValues {
  key: string
  name: string
  roleMain: string
  isActive: boolean
}

export function RolesPage() {
  const [roles, setRoles] = useState<DynamicRole[]>([])
  const [roleModal, setRoleModal] = useState(false)
  const [editingRole, setEditingRole] = useState<DynamicRole | null>(null)
  const [roleForm] = Form.useForm<RoleFormValues>()

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    const response = await api.get("/settings/dynamic-roles")
    setRoles(response.data.data)
  }

  function openCreateRole() {
    setEditingRole(null)
    roleForm.resetFields()
    roleForm.setFieldsValue({
      key: "",
      name: "",
      roleMain: "STAFF",
      isActive: true,
    })
    setRoleModal(true)
  }

  function openEditRole(role: DynamicRole) {
    setEditingRole(role)
    roleForm.setFieldsValue(role)
    setRoleModal(true)
  }

  async function saveRole(values: RoleFormValues) {
    if (editingRole) {
      await api.patch(`/settings/dynamic-roles/${editingRole.id}`, values)
      message.success("Đã cập nhật role")
    } else {
      await api.post("/settings/dynamic-roles", values)
      message.success("Đã tạo role")
    }
    setRoleModal(false)
    setEditingRole(null)
    roleForm.resetFields()
    await load()
  }

  async function deleteRole(id: string) {
    await api.delete(`/settings/dynamic-roles/${id}`)
    message.success("Đã xóa role")
    await load()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Text className="eyebrow">
            System administration
          </Typography.Text>
          <Typography.Title level={2}>Vai trò</Typography.Title>
        </div>
        <Button onClick={openCreateRole}>Thêm role</Button>
      </div>
      <Card className="glass-card settings-card">
        <Typography.Paragraph type="secondary">
          Bảng role trung tâm. Mỗi role chỉ lưu tên role và mainRole.
        </Typography.Paragraph>
        <Table
          size="small"
          pagination={false}
          rowKey="id"
          dataSource={roles}
          scroll={{ x: "max-content" }}
          columns={[
            { title: "Key", dataIndex: "key" },
            { title: "Tên role", dataIndex: "name" },
            { title: "Main role", dataIndex: "roleMain" },
            {
              title: "Trạng thái",
              render: (_, row) => (row.isActive ? "Bật" : "Tắt"),
            },
            {
              title: "",
              render: (_, row) => (
                <Space>
                  <Button type="link" onClick={() => openEditRole(row)}>
                    Sửa
                  </Button>
                  <Button type="link" danger onClick={() => deleteRole(row.id)}>
                    Xóa
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title={editingRole ? "Cập nhật role" : "Thêm role"}
        open={roleModal}
        footer={null}
        maskClosable={false}
        onCancel={() => {
          setRoleModal(false)
          setEditingRole(null)
        }}
      >
        <Form form={roleForm} layout="vertical" onFinish={saveRole}>
          <Form.Item name="name" label="Tên role" rules={[{ required: true }]}>
            <Input placeholder="Role staff 1" />
          </Form.Item>
          <Form.Item name="key" label="Key role" rules={[{ required: true }]}>
            <Input placeholder="STAFF_1" disabled={Boolean(editingRole)} />
          </Form.Item>
          <Form.Item name="roleMain" label="Main role" rules={[{ required: true }]}>
            <Select options={systemRoleSelectOptions} />
          </Form.Item>
          <Form.Item name="isActive" valuePropName="checked" initialValue>
            <Checkbox>Cho phép sử dụng</Checkbox>
          </Form.Item>
          <Button className="primary-glow" htmlType="submit" type="primary">
            {editingRole ? "Cập nhật role" : "Lưu role"}
          </Button>
        </Form>
      </Modal>
    </>
  )
}