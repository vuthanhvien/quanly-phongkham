import { Button, Card, Checkbox, Form, Modal, Select, Space, Table, Typography, message } from "antd"
import { useEffect, useState } from "react"
import { api } from "../api"
import { BranchRoleAssignment, DynamicRole } from "../models"

interface AssignmentFormValues {
  userId: string
  branchId: string
  roleKeys: string[]
  isActive: boolean
}

export function BranchRoleAssignmentsPage() {
  const [assignments, setAssignments] = useState<BranchRoleAssignment[]>([])
  const [dynamicRoles, setDynamicRoles] = useState<DynamicRole[]>([])
  const [userOptions, setUserOptions] = useState<Array<{ value: string; label: string }>>([])
  const [branchOptions, setBranchOptions] = useState<Array<{ value: string; label: string }>>([])
  const [assignmentModal, setAssignmentModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState<BranchRoleAssignment | null>(null)
  const [assignmentForm] = Form.useForm<AssignmentFormValues>()

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    const [assignmentResponse, roleResponse, usersResponse, branchesResponse] = await Promise.all([
      api.get("/settings/branch-role-assignments"),
      api.get("/settings/dynamic-roles"),
      api.get("/records/user-accounts", { params: { pageSize: 200 } }),
      api.get("/records/branches", { params: { pageSize: 200 } }),
    ])
    setAssignments(assignmentResponse.data.data)
    setDynamicRoles(roleResponse.data.data)
    setUserOptions(
      usersResponse.data.data.map((row: Record<string, unknown>) => ({
        value: String(row.id),
        label: `${row.fullName || row.email} (${row.email})`,
      })),
    )
    setBranchOptions(
      branchesResponse.data.data.map((row: Record<string, unknown>) => ({
        value: String(row.id),
        label: `${row.name} (${row.slug})`,
      })),
    )
  }

  function openCreateAssignment() {
    setEditingAssignment(null)
    assignmentForm.resetFields()
    assignmentForm.setFieldsValue({
      userId: undefined as unknown as string,
      branchId: undefined as unknown as string,
      roleKeys: [],
      isActive: true,
    })
    setAssignmentModal(true)
  }

  function openEditAssignment(assignment: BranchRoleAssignment) {
    setEditingAssignment(assignment)
    assignmentForm.setFieldsValue(assignment)
    setAssignmentModal(true)
  }

  async function saveAssignment(values: AssignmentFormValues) {
    if (editingAssignment) {
      await api.patch(`/settings/branch-role-assignments/${editingAssignment.id}`, values)
      message.success("Đã cập nhật gán role")
    } else {
      await api.post("/settings/branch-role-assignments", values)
      message.success("Đã gán role theo chi nhánh")
    }
    setAssignmentModal(false)
    setEditingAssignment(null)
    assignmentForm.resetFields()
    await load()
  }

  async function deleteAssignment(id: string) {
    await api.delete(`/settings/branch-role-assignments/${id}`)
    message.success("Đã xóa gán role")
    await load()
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Text className="eyebrow">
            System administration
          </Typography.Text>
          <Typography.Title level={2}>Role theo chi nhánh</Typography.Title>
        </div>
        <Button onClick={openCreateAssignment}>Thêm gán role</Button>
      </div>
      <Card className="glass-card settings-card">
        <Typography.Paragraph type="secondary">
          Mỗi user có thể thuộc nhiều chi nhánh. Ở mỗi chi nhánh, user có thể được gán một hoặc nhiều role khác nhau.
        </Typography.Paragraph>
        <Table
          size="small"
          pagination={false}
          rowKey="id"
          dataSource={assignments}
          scroll={{ x: "max-content" }}
          columns={[
            {
              title: "User",
              render: (_, row) => userOptions.find((item) => item.value === row.userId)?.label || row.userId,
            },
            {
              title: "Chi nhánh",
              render: (_, row) => branchOptions.find((item) => item.value === row.branchId)?.label || row.branchId,
            },
            {
              title: "Role",
              render: (_, row) =>
                (row.roleKeys || [])
                  .map((key: string) => dynamicRoles.find((role) => role.key === key)?.name || key)
                  .join(", "),
            },
            {
              title: "Trạng thái",
              render: (_, row) => (row.isActive ? "Bật" : "Tắt"),
            },
            {
              title: "",
              render: (_, row) => (
                <Space>
                  <Button type="link" onClick={() => openEditAssignment(row)}>
                    Sửa
                  </Button>
                  <Button type="link" danger onClick={() => deleteAssignment(row.id)}>
                    Xóa
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
      <Modal
        title={editingAssignment ? "Cập nhật role theo chi nhánh" : "Thêm role theo chi nhánh"}
        open={assignmentModal}
        footer={null}
        maskClosable={false}
        onCancel={() => {
          setAssignmentModal(false)
          setEditingAssignment(null)
        }}
      >
        <Form form={assignmentForm} layout="vertical" onFinish={saveAssignment}>
          <Form.Item name="userId" label="User" rules={[{ required: true }]}>
            <Select options={userOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="branchId" label="Chi nhánh" rules={[{ required: true }]}>
            <Select options={branchOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item name="roleKeys" label="Role" rules={[{ required: true }]}> 
            <Select
              mode="multiple"
              options={dynamicRoles
                .filter((role) => role.isActive)
                .map((role) => ({ value: role.key, label: `${role.name} (${role.key})` }))}
            />
          </Form.Item>
          <Form.Item name="isActive" valuePropName="checked" initialValue>
            <Checkbox>Cho phép sử dụng</Checkbox>
          </Form.Item>
          <Button className="primary-glow" htmlType="submit" type="primary">
            {editingAssignment ? "Cập nhật gán role" : "Lưu gán role"}
          </Button>
        </Form>
      </Modal>
    </>
  )
}