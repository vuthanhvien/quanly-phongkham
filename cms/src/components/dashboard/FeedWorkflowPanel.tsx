import { CheckOutlined, CloseOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons"
import { Button, Card, Empty, Input, List, Modal, Tag, Tooltip, Typography, message } from "antd"
import { useEffect, useMemo, useState } from "react"
import { api } from "../../api"
import { hasActionAccess } from "../../access"
import { RecordFormContent } from "../RecordFormContent"
import { entityLabels, getFieldLabel } from "../../models"
import { getApiErrorMessage } from "../../utils/apiError"

type Identity = { staffId?: string; branchId?: string }
type WorkflowTask = {
  id: string
  instance?: { id: string; targetResource: string; targetRecordId: string }
  definition?: { name?: string; targetResource?: string }
  step?: { name?: string; stateLabel?: string; approveActionLabel?: string; rejectActionLabel?: string }
  targetRecord?: Record<string, unknown>
}

const QUICK_REQUESTS = [
  { resource: "leave-requests", label: "Xin nghỉ", title: "Tạo đơn xin nghỉ", hidden: ["staffId", "branchId", "status", "approvedById", "requestedDays"], initial: () => ({ leaveType: "annual", status: "pending" }) },
  { resource: "attendance-adjustment-requests", label: "Đổi check-in/out", title: "Đề nghị đổi check-in/check-out", hidden: ["staffId", "branchId", "status", "approvedById"], initial: () => ({ status: "pending" }) },
  { resource: "business-trip-requests", label: "Xin công tác", title: "Tạo đơn công tác", hidden: ["staffId", "branchId", "status", "approvedById"], initial: () => ({ status: "pending" }) },
  { resource: "payment-requests", label: "Xin thanh toán", title: "Tạo đề nghị thanh toán", hidden: ["staffId", "branchId", "status", "approvedById"], initial: () => ({ status: "pending" }) },
  { resource: "software-license-assignments", label: "Cấp bản quyền", title: "Đề nghị cấp bản quyền", hidden: ["status"], initial: () => ({ status: "PENDING" }) },
] as const

export function FeedWorkflowPanel({ identity }: { identity?: Identity }) {
  const [tasks, setTasks] = useState<WorkflowTask[]>([])
  const [loading, setLoading] = useState(true)
  const [actingId, setActingId] = useState<string>()
  const [requestResource, setRequestResource] = useState<string>()
  const currentRequest = useMemo(() => QUICK_REQUESTS.find((item) => item.resource === requestResource), [requestResource])

  async function load() {
    setLoading(true)
    try {
      const response = await api.get("/workflow/tasks/my")
      setTasks(response.data?.data || [])
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function approve(task: WorkflowTask) {
    const instanceId = task.instance?.id
    if (!instanceId) return
    setActingId(task.id)
    try {
      await api.post(`/workflow/instances/${instanceId}/approve`, {})
      message.success("Đã duyệt yêu cầu")
      await load()
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không thể duyệt yêu cầu"))
    } finally {
      setActingId(undefined)
    }
  }

  function reject(task: WorkflowTask) {
    const instanceId = task.instance?.id
    if (!instanceId) return
    let note = ""
    Modal.confirm({
      title: "Từ chối yêu cầu này?",
      content: <Input.TextArea rows={3} placeholder="Lý do từ chối" onChange={(event) => { note = event.target.value }} />,
      okText: "Từ chối",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        setActingId(task.id)
        try {
          await api.post(`/workflow/instances/${instanceId}/reject`, { note })
          message.success("Đã từ chối yêu cầu")
          await load()
        } catch (error) {
          message.error(getApiErrorMessage(error, "Không thể từ chối yêu cầu"))
        } finally {
          setActingId(undefined)
        }
      },
    })
  }

  return <>
    <Card className="feed-workflow-card" size="small" title="Yêu cầu & phê duyệt" extra={<Button aria-label="Tải lại việc cần duyệt" icon={<ReloadOutlined />} size="small" type="text" loading={loading} onClick={() => void load()} />}>
      <Typography.Text type="secondary">Gửi yêu cầu nhanh</Typography.Text>
      <div className="feed-workflow-quick-actions">
        {QUICK_REQUESTS.map((item) => {
          const needsStaffProfile = item.resource !== "software-license-assignments"
          const canCreate = hasActionAccess(item.resource, "create") && (!needsStaffProfile || Boolean(identity?.staffId))
          const reason = !identity?.staffId && needsStaffProfile
            ? "Tài khoản chưa liên kết hồ sơ nhân viên"
            : "Role hiện tại chưa có quyền tạo loại yêu cầu này"
          return <Tooltip key={item.resource} title={canCreate ? undefined : reason}>
            <Button disabled={!canCreate} icon={<PlusOutlined />} size="small" onClick={() => setRequestResource(item.resource)}>{item.label}</Button>
          </Tooltip>
        })}
      </div>
      <div className="feed-workflow-todo-title"><Typography.Text strong>Việc cần bạn duyệt</Typography.Text>{tasks.length ? <Tag color="orange">{tasks.length}</Tag> : null}</div>
      {loading ? <Typography.Text type="secondary">Đang tải…</Typography.Text> : null}
      {!loading && tasks.length === 0 ? <Empty className="feed-workflow-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Không có việc cần duyệt" /> : null}
      {!loading && tasks.length > 0 ? <List
        className="feed-workflow-tasks"
        dataSource={tasks.slice(0, 5)}
        renderItem={(task) => {
          const resource = task.instance?.targetResource || task.definition?.targetResource || ""
          const title = requestTitle(resource, task.targetRecord)
          return <List.Item className="feed-workflow-task">
            <div className="feed-workflow-task__body">
              <Typography.Text className="feed-workflow-task__title" ellipsis strong>{title}</Typography.Text>
              <div className="feed-workflow-task__meta">
                <Tag>{entityLabels[resource] || resource}</Tag>
                <Typography.Text type="secondary">{task.step?.stateLabel || task.step?.name || "Chờ duyệt"}</Typography.Text>
              </div>
              <div className="feed-workflow-task__actions">
                <Button block icon={<CheckOutlined />} loading={actingId === task.id} size="small" type="primary" onClick={() => void approve(task)}>{task.step?.approveActionLabel || "Duyệt"}</Button>
                <Button block danger icon={<CloseOutlined />} loading={actingId === task.id} size="small" onClick={() => reject(task)}>{task.step?.rejectActionLabel || "Từ chối"}</Button>
              </div>
            </div>
          </List.Item>
        }}
      /> : null}
    </Card>
    <Modal destroyOnHidden footer={null} open={Boolean(currentRequest)} title={currentRequest?.title} width={720} onCancel={() => setRequestResource(undefined)}>
      {currentRequest ? <RecordFormContent
        compact
        resource={currentRequest.resource}
        hiddenFieldKeys={[...currentRequest.hidden]}
        initialValues={{ staffId: identity?.staffId, branchId: identity?.branchId, ...currentRequest.initial() }}
        onCancel={() => setRequestResource(undefined)}
        onSuccess={() => { setRequestResource(undefined); void load() }}
      /> : null}
    </Modal>
  </>
}

function requestTitle(resource: string, record?: Record<string, unknown>) {
  if (!record) return "Yêu cầu chờ duyệt"
  if (resource === "leave-requests") return [record.startDate, record.endDate, getFieldLabel(resource, "leaveType", String(record.leaveType || ""))].filter(Boolean).join(" · ")
  if (resource === "business-trip-requests") return [record.destination, record.startDate, record.endDate].filter(Boolean).join(" · ")
  if (resource === "payment-requests") return [record.title, record.amount ? `${Number(record.amount).toLocaleString("vi-VN")} đ` : ""].filter(Boolean).join(" · ")
  if (resource === "software-license-assignments") return String(record.accountEmail || "Cấp phát bản quyền")
  return String(record.date || record.id || "Yêu cầu chờ duyệt")
}
