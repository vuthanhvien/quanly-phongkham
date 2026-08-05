import { ArrowLeftOutlined, BranchesOutlined, DownOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons"
import { Button, Card, Checkbox, Col, Dropdown, Form, Input, InputNumber, Modal, Row, Select, Space, Table, Tabs, Tag, Typography, message } from "antd"
import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { api } from "../api"
import { ModalTitleBar } from "../components/ModalTitleBar"
import { WorkflowFlowCanvas, type WorkflowCanvasStep } from "../components/WorkflowFlowCanvas"
import { entityLabels, getFieldLabel } from "../models"

type WorkflowDefinition = {
  id: string
  code: string
  name: string
  targetResource: string
  isActive: boolean
  submitStatuses?: string[]
  approvedStatus?: string
  rejectedStatus?: string
  cancelledStatus?: string
  boardViewport?: { x?: number; y?: number; zoom?: number }
  description?: string
}

type WorkflowStep = {
  id: string
  definitionId: string
  name: string
  stepOrder: number
  stateKey?: string
  stateLabel?: string
  approverType: string
  approverStaffId?: string
  approverUserId?: string
  approverRoleKey?: string
  approvalMode?: string
  approveNextStepId?: string
  approveActionLabel?: string
  boardX?: number
  boardY?: number
  isActive: boolean
  rejectBehavior?: string
  rejectActionLabel?: string
  rejectNextStepId?: string
}

type WorkflowStepTemplate = {
  key: string
  label: string
  description: string
  targetResource: string
  submitStatuses: string[]
  approvedStatus: string
  rejectedStatus: string
  cancelledStatus: string
  steps: Array<Pick<WorkflowStep, "name" | "stateKey" | "stateLabel" | "approverType" | "approverRoleKey" | "approvalMode" | "approveActionLabel" | "approveNextStepId" | "boardX" | "boardY" | "isActive" | "rejectBehavior" | "rejectActionLabel" | "rejectNextStepId"> & {
    key: string
    approveNextKey?: string
    rejectNextKey?: string
  }>
}

const TARGET_RESOURCES = ["leave-requests", "attendance-adjustment-requests", "business-trip-requests", "payment-requests"]
const APPROVER_TYPES = [
  { value: "EMPLOYEE_LEADER", label: "Leader nhân viên" },
  { value: "EMPLOYEE_MENTOR", label: "Mentor nhân viên" },
  { value: "DEPARTMENT_MANAGER", label: "Trưởng phòng ban" },
  { value: "ROLE", label: "Theo role" },
  { value: "FIXED_STAFF", label: "Nhân sự cố định" },
  { value: "FIXED_USER", label: "User cố định" },
]
const WORKFLOW_STEP_TEMPLATES: WorkflowStepTemplate[] = [
  {
    key: "leave-basic",
    label: "Flow xin nghỉ",
    description: "Leader duyệt trước, HR kiểm tra cuối.",
    targetResource: "leave-requests",
    submitStatuses: ["pending", "submitted"],
    approvedStatus: "approved",
    rejectedStatus: "rejected",
    cancelledStatus: "cancelled",
    steps: [
      { key: "leader", name: "Leader duyệt ngày nghỉ", stateKey: "leader_review", stateLabel: "Chờ Leader duyệt", approverType: "EMPLOYEE_LEADER", approvalMode: "any", approveActionLabel: "Duyệt phép", approveNextKey: "hr", boardX: -180, boardY: 0, isActive: true, rejectBehavior: "END_REJECT", rejectActionLabel: "Từ chối phép" },
      { key: "hr", name: "HR xác nhận phép", stateKey: "hr_confirm", stateLabel: "Chờ HR xác nhận", approverType: "ROLE", approverRoleKey: "HR", approvalMode: "any", approveActionLabel: "Xác nhận phép", boardX: 180, boardY: 0, isActive: true, rejectBehavior: "END_REJECT", rejectActionLabel: "Từ chối phép" },
    ],
  },
  {
    key: "leave-mentor",
    label: "Flow xin nghỉ có mentor",
    description: "Mentor góp ý, leader duyệt, HR chốt phép.",
    targetResource: "leave-requests",
    submitStatuses: ["pending", "submitted"],
    approvedStatus: "approved",
    rejectedStatus: "rejected",
    cancelledStatus: "cancelled",
    steps: [
      { key: "mentor", name: "Mentor xác nhận kế hoạch", stateKey: "mentor_review", stateLabel: "Chờ Mentor xác nhận", approverType: "EMPLOYEE_MENTOR", approvalMode: "any", approveActionLabel: "Xác nhận", approveNextKey: "leader", boardX: -320, boardY: 0, isActive: true, rejectBehavior: "END_REJECT", rejectActionLabel: "Không đồng ý" },
      { key: "leader", name: "Leader duyệt ngày nghỉ", stateKey: "leader_review", stateLabel: "Chờ Leader duyệt", approverType: "EMPLOYEE_LEADER", approvalMode: "any", approveActionLabel: "Duyệt phép", approveNextKey: "hr", rejectActionLabel: "Yêu cầu mentor xem lại", rejectNextKey: "mentor", boardX: 0, boardY: 0, isActive: true, rejectBehavior: "GOTO_STEP" },
      { key: "hr", name: "HR chốt phép", stateKey: "hr_confirm", stateLabel: "Chờ HR chốt phép", approverType: "ROLE", approverRoleKey: "HR", approvalMode: "any", approveActionLabel: "Chốt phép", boardX: 320, boardY: 0, isActive: true, rejectBehavior: "END_REJECT", rejectActionLabel: "Từ chối phép" },
    ],
  },
  {
    key: "attendance-adjustment",
    label: "Flow sửa check-in",
    description: "Leader xác nhận ca làm, HR cập nhật công.",
    targetResource: "attendance-adjustment-requests",
    submitStatuses: ["pending", "submitted"],
    approvedStatus: "approved",
    rejectedStatus: "rejected",
    cancelledStatus: "cancelled",
    steps: [
      { key: "leader", name: "Leader xác nhận lý do", stateKey: "leader_verify", stateLabel: "Chờ Leader xác nhận", approverType: "EMPLOYEE_LEADER", approvalMode: "any", approveActionLabel: "Xác nhận ca", approveNextKey: "hr", boardX: -180, boardY: 0, isActive: true, rejectBehavior: "END_REJECT", rejectActionLabel: "Từ chối chỉnh công" },
      { key: "hr", name: "HR cập nhật dữ liệu công", stateKey: "hr_update_attendance", stateLabel: "Chờ HR cập nhật công", approverType: "ROLE", approverRoleKey: "HR", approvalMode: "any", approveActionLabel: "Cập nhật công", rejectActionLabel: "Trả về Leader", rejectNextKey: "leader", boardX: 180, boardY: 0, isActive: true, rejectBehavior: "GOTO_STEP" },
    ],
  },
  {
    key: "business-trip",
    label: "Flow đơn công tác",
    description: "Leader duyệt lịch trình, kế toán kiểm tra chi phí.",
    targetResource: "business-trip-requests",
    submitStatuses: ["pending", "submitted"],
    approvedStatus: "approved",
    rejectedStatus: "rejected",
    cancelledStatus: "cancelled",
    steps: [
      { key: "leader", name: "Leader duyệt lịch trình", stateKey: "leader_trip_review", stateLabel: "Chờ Leader duyệt công tác", approverType: "EMPLOYEE_LEADER", approvalMode: "any", approveActionLabel: "Duyệt lịch trình", approveNextKey: "accounting", boardX: -180, boardY: 0, isActive: true, rejectBehavior: "END_REJECT", rejectActionLabel: "Từ chối công tác" },
      { key: "accounting", name: "Kế toán kiểm tra tạm ứng", stateKey: "accounting_advance_review", stateLabel: "Chờ kế toán kiểm tra tạm ứng", approverType: "ROLE", approverRoleKey: "ACCOUNTANT", approvalMode: "any", approveActionLabel: "Xác nhận chi phí", rejectActionLabel: "Trả về Leader", rejectNextKey: "leader", boardX: 180, boardY: 0, isActive: true, rejectBehavior: "GOTO_STEP" },
    ],
  },
  {
    key: "payment",
    label: "Flow xin thanh toán",
    description: "Leader xác nhận, kế toán kiểm tra chứng từ, admin duyệt chi.",
    targetResource: "payment-requests",
    submitStatuses: ["pending", "submitted"],
    approvedStatus: "approved",
    rejectedStatus: "rejected",
    cancelledStatus: "cancelled",
    steps: [
      { key: "leader", name: "Leader xác nhận khoản chi", stateKey: "leader_expense_review", stateLabel: "Chờ Leader xác nhận chi", approverType: "EMPLOYEE_LEADER", approvalMode: "any", approveActionLabel: "Xác nhận khoản chi", approveNextKey: "accounting", boardX: -320, boardY: 0, isActive: true, rejectBehavior: "END_REJECT", rejectActionLabel: "Từ chối chi" },
      { key: "accounting", name: "Kế toán kiểm tra chứng từ", stateKey: "accounting_document_review", stateLabel: "Chờ kế toán kiểm tra chứng từ", approverType: "ROLE", approverRoleKey: "ACCOUNTANT", approvalMode: "any", approveActionLabel: "Chứng từ hợp lệ", approveNextKey: "admin", rejectActionLabel: "Trả về Leader", rejectNextKey: "leader", boardX: 0, boardY: 0, isActive: true, rejectBehavior: "GOTO_STEP" },
      { key: "admin", name: "Admin duyệt thanh toán", stateKey: "payment_final_approval", stateLabel: "Chờ duyệt thanh toán", approverType: "ROLE", approverRoleKey: "ADMIN", approvalMode: "any", approveActionLabel: "Duyệt thanh toán", rejectActionLabel: "Trả về kế toán", rejectNextKey: "accounting", boardX: 320, boardY: 0, isActive: true, rejectBehavior: "GOTO_STEP" },
    ],
  },
]

export function WorkflowDefinitionDetailPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const [definition, setDefinition] = useState<WorkflowDefinition | null>(null)
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [staffOptions, setStaffOptions] = useState<Array<{ value: string; label: string }>>([])
  const [userOptions, setUserOptions] = useState<Array<{ value: string; label: string }>>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [applyingTemplateKey, setApplyingTemplateKey] = useState<string | null>(null)
  const [stepModal, setStepModal] = useState(false)
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null)
  const [fullscreenPopup, setFullscreenPopup] = useState(false)
  const [definitionForm] = Form.useForm()
  const [stepForm] = Form.useForm()
  const targetResource = Form.useWatch("targetResource", definitionForm) || definition?.targetResource
  const statusOptions = useMemo(() => buildStatusOptions(targetResource), [targetResource])
  const workflowStatusOptions = useMemo(() => mergeStatusOptions(statusOptions, steps), [statusOptions, steps])

  useEffect(() => {
    void load()
    void loadLookups()
  }, [id])

  async function load() {
    setLoading(true)
    try {
      const [definitionResponse, stepsResponse] = await Promise.all([
        api.get(`/records/workflow-definitions/${id}`, { params: { include: "*" } }),
        api.get("/records/workflow-steps", { params: { definitionId: id, pageSize: 200, include: "*" } }),
      ])
      const nextDefinition = definitionResponse.data.data
      setDefinition(nextDefinition)
      setSteps((stepsResponse.data.data || []).sort((a: WorkflowStep, b: WorkflowStep) => Number(a.stepOrder || 0) - Number(b.stepOrder || 0)))
      definitionForm.setFieldsValue({
        ...nextDefinition,
        submitStatuses: nextDefinition.submitStatuses || ["pending", "submitted"],
        approvedStatus: nextDefinition.approvedStatus || "approved",
        rejectedStatus: nextDefinition.rejectedStatus || "rejected",
        cancelledStatus: nextDefinition.cancelledStatus || "cancelled",
      })
    } finally {
      setLoading(false)
    }
  }

  async function loadLookups() {
    const [staffResponse, userResponse] = await Promise.all([
      api.get("/records/staff", { params: { pageSize: 500 } }),
      api.get("/records/user-accounts", { params: { pageSize: 500 } }),
    ])
    setStaffOptions((staffResponse.data.data || []).map((row: Record<string, unknown>) => ({
      value: String(row.id),
      label: [row.code, row.fullName].filter(Boolean).join(" - "),
    })))
    setUserOptions((userResponse.data.data || []).map((row: Record<string, unknown>) => ({
      value: String(row.id),
      label: String(row.email || row.username || row.fullName || row.id),
    })))
  }

  async function saveDefinition(values: Record<string, unknown>) {
    setSaving(true)
    try {
      await api.patch(`/records/workflow-definitions/${id}`, values)
      message.success("Đã lưu cấu hình flow")
      await load()
    } finally {
      setSaving(false)
    }
  }

  function openCreateStep() {
    setEditingStep(null)
    stepForm.resetFields()
    stepForm.setFieldsValue({
      definitionId: id,
      name: "",
      stepOrder: steps.length + 1,
      stateKey: `step_${steps.length + 1}`,
      stateLabel: "Chờ duyệt",
      approverType: "EMPLOYEE_LEADER",
      approvalMode: "any",
      approveActionLabel: "Duyệt",
      boardX: steps.length * 280,
      boardY: 0,
      isActive: true,
      rejectActionLabel: "Từ chối",
      rejectBehavior: "END_REJECT",
    })
    setStepModal(true)
  }

  function openCreateStepAfter(step: WorkflowStep) {
    setEditingStep(null)
    stepForm.resetFields()
    stepForm.setFieldsValue({
      definitionId: id,
      name: "",
      stepOrder: Number(step.stepOrder || 0) + 1,
      stateKey: `step_${Number(step.stepOrder || 0) + 1}`,
      stateLabel: "Chờ duyệt",
      approverType: "EMPLOYEE_LEADER",
      approvalMode: "any",
      approveActionLabel: "Duyệt",
      boardX: Number(step.boardX || 0) + 280,
      boardY: Number(step.boardY || 0),
      isActive: true,
      rejectActionLabel: "Từ chối",
      rejectBehavior: "END_REJECT",
    })
    setStepModal(true)
  }

  function openEditStep(step: WorkflowStep) {
    setEditingStep(step)
    stepForm.setFieldsValue(step)
    setStepModal(true)
  }

  async function saveStep(values: Record<string, unknown>) {
    const stepOrder = Number(values.stepOrder || steps.length + 1)
    const payload: Record<string, unknown> = { ...values, definitionId: id, stepOrder }
    if (payload.rejectBehavior !== "GOTO_STEP") payload.rejectNextStepId = null
    if (editingStep) {
      await api.patch(`/records/workflow-steps/${editingStep.id}`, payload)
    } else {
      const affectedSteps = steps.filter((step) => Number(step.stepOrder || 0) >= stepOrder)
      await Promise.all(affectedSteps.map((step) => api.patch(`/records/workflow-steps/${step.id}`, { stepOrder: Number(step.stepOrder || 0) + 1 })))
      await api.post("/records/workflow-steps", payload)
    }
    message.success(editingStep ? "Đã cập nhật bước duyệt" : "Đã thêm bước duyệt")
    setStepModal(false)
    setFullscreenPopup(false)
    await load()
  }

  async function archiveStep(step: WorkflowStep) {
    await api.delete(`/records/workflow-steps/${step.id}`)
    message.success("Đã lưu trữ bước duyệt")
    await load()
  }

  async function applyStepTemplate(template: WorkflowStepTemplate) {
    setApplyingTemplateKey(template.key)
    try {
      await api.patch(`/records/workflow-definitions/${id}`, {
        targetResource: template.targetResource,
        submitStatuses: template.submitStatuses,
        approvedStatus: template.approvedStatus,
        rejectedStatus: template.rejectedStatus,
        cancelledStatus: template.cancelledStatus,
        description: definition?.description || template.description,
      })
      const startOrder = Math.max(0, ...steps.map((step) => Number(step.stepOrder || 0)))
      const createdResponses = await Promise.all(template.steps.map((step, index) => {
        const { key, approveNextKey, rejectNextKey, ...payload } = step
        return api.post("/records/workflow-steps", {
          ...payload,
          definitionId: id,
          stepOrder: startOrder + index + 1,
        })
      }))
      const createdByKey = new Map(template.steps.map((step, index) => [step.key, createdResponses[index].data.data as WorkflowStep]))
      await Promise.all(template.steps.map((step) => {
        const created = createdByKey.get(step.key)
        if (!created) return Promise.resolve()
        const approveTarget = step.approveNextKey ? createdByKey.get(step.approveNextKey) : null
        const rejectTarget = step.rejectNextKey ? createdByKey.get(step.rejectNextKey) : null
        const payload: Record<string, unknown> = {}
        if (approveTarget) payload.approveNextStepId = approveTarget.id
        if (rejectTarget) payload.rejectNextStepId = rejectTarget.id
        if (Object.keys(payload).length === 0) return Promise.resolve()
        return api.patch(`/records/workflow-steps/${created.id}`, payload)
      }))
      message.success(`Đã tạo ${template.steps.length} bước từ ${template.label}`)
      await load()
    } catch (error) {
      message.error("Không thể tạo bước từ template")
    } finally {
      setApplyingTemplateKey(null)
    }
  }

  async function reorderSteps(nextSteps: WorkflowCanvasStep[]) {
    const reordered = nextSteps.map((step) => ({ ...step, stepOrder: Number(step.stepOrder || 0) })) as WorkflowStep[]
    setSteps(reordered)
    try {
      await Promise.all(reordered.map((step) => api.patch(`/records/workflow-steps/${step.id}`, { stepOrder: step.stepOrder })))
    } catch (error) {
      console.warn("Không thể lưu thứ tự flow", error)
    }
  }

  async function saveStepPosition(step: WorkflowCanvasStep, position: { boardX: number; boardY: number }) {
    setSteps((current) => current.map((item) => item.id === step.id ? { ...item, ...position } : item))
    try {
      await api.patch(`/records/workflow-steps/${step.id}`, position)
    } catch (error) {
      console.warn("Không thể lưu vị trí node", error)
    }
  }

  async function saveBoardViewport(viewport: { x: number; y: number; zoom: number }) {
    setDefinition((current) => current ? { ...current, boardViewport: viewport } : current)
    try {
      await api.patch(`/records/workflow-definitions/${id}`, { boardViewport: viewport })
    } catch (error) {
      console.warn("Không thể lưu vị trí board", error)
    }
  }

  return (
    <>
      <div className="page-header">
        <Space align="center">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/workflow-definitions")} />
          <div>
            <Typography.Title level={3}>Cấu hình workflow</Typography.Title>
          </div>
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void load()}>Tải lại</Button>
          <Dropdown
            menu={{
              items: WORKFLOW_STEP_TEMPLATES.map((template) => ({
                key: template.key,
                label: (
                  <Space direction="vertical" size={0}>
                    <Typography.Text strong>{template.label}</Typography.Text>
                    <Typography.Text type="secondary">{template.description}</Typography.Text>
                  </Space>
                ),
              })),
              onClick: ({ key }) => {
                const template = WORKFLOW_STEP_TEMPLATES.find((item) => item.key === key)
                if (template) void applyStepTemplate(template)
              },
            }}
            trigger={["click"]}
          >
            <Button icon={<BranchesOutlined />} loading={Boolean(applyingTemplateKey)}>
              Tạo từ mẫu <DownOutlined />
            </Button>
          </Dropdown>
          <Button className="primary-glow" icon={<PlusOutlined />} type="primary" onClick={openCreateStep}>Thêm bước</Button>
        </Space>
      </div>

      <Card className="table-card workflow-config-card" loading={loading}>
        <Tabs
          items={[
            {
              key: "board",
              label: "Flow board",
              children: (
                <>
                  <WorkflowFlowCanvas
                    steps={steps}
                    viewport={definition?.boardViewport}
                    onAddStep={openCreateStep}
                    onEditStep={(step) => openEditStep(step as WorkflowStep)}
                    onInsertAfterStep={(step) => openCreateStepAfter(step as WorkflowStep)}
                    onPositionChange={(step, position) => void saveStepPosition(step, position)}
                    onReorder={(nextSteps) => void reorderSteps(nextSteps)}
                    onViewportChange={(viewport) => void saveBoardViewport(viewport)}
                  />
                  <Typography.Text className="workflow-flow-canvas__hint" type="secondary">
                    Kéo node để đổi thứ tự, kéo nền để di chuyển board, cuộn chuột hoặc dùng nút +/- để zoom.
                  </Typography.Text>
                </>
              ),
            },
            {
              key: "table",
              label: "Step chi tiết",
              children: (
                <Table
                  rowKey="id"
                  dataSource={steps}
                  pagination={false}
                  columns={[
                    { title: "#", dataIndex: "stepOrder", width: 80 },
                    { title: "Bước duyệt", dataIndex: "name" },
                    { title: "Người duyệt", render: (_, row) => approverLabel(row) },
                    { title: "Approve", render: (_, row) => stepName(row.approveNextStepId, steps) || "Step kế tiếp" },
                    { title: "Reject", render: (_, row) => row.rejectBehavior === "GOTO_STEP" ? stepName(row.rejectNextStepId, steps) || "-" : "Kết thúc từ chối" },
                    { title: "Trạng thái", render: (_, row) => <Tag color={row.isActive ? "green" : "default"}>{row.isActive ? "Đang dùng" : "Tắt"}</Tag> },
                    {
                      title: "",
                      width: 240,
                      render: (_, row) => (
                        <Space>
                          <Button icon={<PlusOutlined />} onClick={() => openCreateStepAfter(row)}>Thêm sau</Button>
                          <Button icon={<EditOutlined />} onClick={() => openEditStep(row)}>Sửa</Button>
                          <Button danger onClick={() => void archiveStep(row)}>Lưu trữ</Button>
                        </Space>
                      ),
                    },
                  ]}
                />
              ),
            },
            {
              key: "info",
              label: "Thông tin flow",
              children: (
                <Form form={definitionForm} layout="vertical" onFinish={(values) => void saveDefinition(values)}>
                  <Row gutter={12}>
                    <Col xs={24} md={8}>
                      <Form.Item name="name" label="Tên flow" rules={[{ required: true, message: "Nhập tên flow" }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="code" label="Mã flow" rules={[{ required: true, message: "Nhập mã flow" }]}>
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item name="targetResource" label="Loại chứng từ" rules={[{ required: true, message: "Chọn loại chứng từ" }]}>
                        <Select options={TARGET_RESOURCES.map((value) => ({ value, label: entityLabels[value] || value }))} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={16}>
                      <Form.Item name="description" label="Mô tả">
                        <Input />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item className="workflow-inline-checkbox" name="isActive" valuePropName="checked">
                        <Checkbox>Đang áp dụng flow này</Checkbox>
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button className="primary-glow" htmlType="submit" loading={saving} type="primary">Lưu thông tin</Button>
                </Form>
              ),
            },
            {
              key: "status",
              label: "Vòng đời status",
              children: (
                <Form form={definitionForm} layout="vertical" onFinish={(values) => void saveDefinition(values)}>
                  <div className="workflow-status-strip">
                    <StatusPill tone="draft" label="Submit" value={(definitionForm.getFieldValue("submitStatuses") || ["pending"]).join(", ")} />
                    {steps.map((step) => (
                      <StatusPill key={step.id} tone="review" label={step.stateLabel || step.name} value={step.stateKey || `step_${step.stepOrder}`} />
                    ))}
                    <StatusPill tone="approved" label="Approved" value={definitionForm.getFieldValue("approvedStatus") || "approved"} />
                    <StatusPill tone="rejected" label="Rejected" value={definitionForm.getFieldValue("rejectedStatus") || "rejected"} />
                  </div>
                  <Row gutter={12}>
                    <Col xs={24} md={12}>
                      <Form.Item name="submitStatuses" label="Status bắt đầu flow">
                        <Select mode="tags" options={workflowStatusOptions} placeholder="pending, submitted..." />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="approvedStatus" label="Status cuối khi approve">
                        <Select options={workflowStatusOptions} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="rejectedStatus" label="Status cuối khi reject">
                        <Select options={workflowStatusOptions} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item name="cancelledStatus" label="Status khi cancel">
                        <Select options={workflowStatusOptions} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Button htmlType="submit" loading={saving}>Lưu vòng đời status</Button>
                </Form>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        className={`quick-drawer${fullscreenPopup ? " quick-drawer-fullscreen" : ""}`}
        destroyOnHidden
        maskClosable={false}
        open={stepModal}
        title={<ModalTitleBar fullscreen={fullscreenPopup} title={editingStep ? "Cập nhật bước duyệt" : "Thêm bước duyệt"} onToggleFullscreen={() => setFullscreenPopup((current) => !current)} />}
        width={fullscreenPopup ? "calc(100vw - 24px)" : 720}
        footer={null}
        onCancel={() => {
          setStepModal(false)
          setFullscreenPopup(false)
        }}
      >
        <Form form={stepForm} layout="vertical" onFinish={(values) => void saveStep(values)}>
          <Row gutter={12}>
            <Col xs={24} md={16}>
              <Form.Item name="name" label="Tên bước" rules={[{ required: true, message: "Nhập tên bước" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="stepOrder" label="Thứ tự" rules={[{ required: true, message: "Nhập thứ tự" }]}>
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="stateKey" label="Mã trạng thái">
                <Input placeholder="leader_review, hr_confirm..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="stateLabel" label="Tên trạng thái">
                <Input placeholder="Chờ Leader duyệt" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="approverType" label="Kiểu người duyệt" rules={[{ required: true, message: "Chọn kiểu người duyệt" }]}>
            <Select options={APPROVER_TYPES} />
          </Form.Item>
          <Form.Item name="approverStaffId" label="Nhân sự cố định">
            <Select allowClear showSearch optionFilterProp="label" options={staffOptions} />
          </Form.Item>
          <Form.Item name="approverUserId" label="User cố định">
            <Select allowClear showSearch optionFilterProp="label" options={userOptions} />
          </Form.Item>
          <Form.Item name="approverRoleKey" label="Role duyệt">
            <Input placeholder="ADMIN, HR, ACCOUNTANT..." />
          </Form.Item>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="approveNextStepId" label="Khi approve tới bước">
                <Select allowClear options={stepSelectOptions(steps, editingStep?.id)} placeholder="Mặc định: step kế tiếp" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="approveActionLabel" label="Tên nút approve">
                <Input placeholder="Duyệt, Chốt phép, Xác nhận chi phí..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="rejectBehavior" label="Khi reject">
                <Select options={[
                  { value: "END_REJECT", label: "Kết thúc từ chối" },
                  { value: "GOTO_STEP", label: "Chuyển tới bước khác" },
                ]} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="rejectNextStepId" label="Reject tới bước">
                <Select allowClear options={stepSelectOptions(steps, editingStep?.id)} placeholder="Chọn nếu reject chuyển bước" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="rejectActionLabel" label="Tên nút reject">
                <Input placeholder="Từ chối, Trả về Leader..." />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="boardX" label="Board X">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="boardY" label="Board Y">
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="isActive" valuePropName="checked">
            <Checkbox>Đang sử dụng bước này</Checkbox>
          </Form.Item>
          <Space>
            <Button className="primary-glow" htmlType="submit" type="primary">Lưu bước</Button>
            <Button onClick={() => { setStepModal(false); setFullscreenPopup(false) }}>Hủy</Button>
          </Space>
        </Form>
      </Modal>
    </>
  )
}

function buildStatusOptions(resource?: string) {
  const fallback = ["draft", "pending", "submitted", "approved", "rejected", "cancelled", "paid"]
  return fallback.map((value) => ({
    value,
    label: resource ? getFieldLabel(resource, "status", value) : value,
  }))
}

function mergeStatusOptions(baseOptions: Array<{ value: string; label: string }>, steps: WorkflowStep[]) {
  const options = [...baseOptions]
  steps.forEach((step) => {
    const value = String(step.stateKey || "").trim()
    if (value && !options.some((item) => item.value === value)) {
      options.push({ value, label: step.stateLabel || value })
    }
  })
  return options
}

function StatusPill({ label, tone, value }: { label: string; tone: "draft" | "review" | "approved" | "rejected"; value: string }) {
  return (
    <div className={`workflow-status-pill workflow-status-pill-${tone}`}>
      <Typography.Text className="workflow-status-pill__label">{label}</Typography.Text>
      <Typography.Text className="workflow-status-pill__value">{value}</Typography.Text>
    </div>
  )
}

function approverLabel(step: WorkflowStep) {
  const type = APPROVER_TYPES.find((item) => item.value === step.approverType)?.label || step.approverType
  if (step.approverType === "ROLE") return `${type}: ${step.approverRoleKey || "ADMIN"}`
  if (step.approverType === "FIXED_STAFF") return `${type}: ${step.approverStaffId || "-"}`
  if (step.approverType === "FIXED_USER") return `${type}: ${step.approverUserId || "-"}`
  return type
}

function stepName(stepId: string | undefined, steps: WorkflowStep[]) {
  const step = steps.find((item) => item.id === stepId)
  return step ? `${step.stepOrder}. ${step.name}` : ""
}

function stepSelectOptions(steps: WorkflowStep[], currentId?: string) {
  return steps
    .filter((step) => step.id !== currentId)
    .sort((a, b) => Number(a.stepOrder || 0) - Number(b.stepOrder || 0))
    .map((step) => ({ value: step.id, label: `${step.stepOrder}. ${step.name}` }))
}
