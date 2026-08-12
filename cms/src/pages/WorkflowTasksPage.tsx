import { CheckOutlined, CloseOutlined, EyeOutlined, ReloadOutlined } from "@ant-design/icons"
import { Button, Card, Input, Modal, Space, Table, Tag, Typography, message } from "antd"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../api"
import { entityLabels, getFieldLabel } from "../models"

type WorkflowTaskRow = {
  id: string
  instanceId: string
  status: string
  createdAt: string
  definition?: { name?: string; targetResource?: string }
  step?: {
    name?: string
    stateLabel?: string
    approveActionLabel?: string
    rejectActionLabel?: string
  }
  instance?: {
    id: string
    targetResource: string
    targetRecordId: string
    status: string
  }
  targetRecord?: Record<string, unknown>
}

export function WorkflowTasksPage() {
  const [rows, setRows] = useState<WorkflowTaskRow[]>([])
  const [loading, setLoading] = useState(false)
  const [actingId, setActingId] = useState<string>()
  const navigate = useNavigate()

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const response = await api.get("/workflow/tasks/my")
      setRows(response.data?.data || [])
    } finally {
      setLoading(false)
    }
  }

  async function approve(row: WorkflowTaskRow) {
    if (!row.instance?.id) return
    setActingId(row.id)
    try {
      await api.post(`/workflow/instances/${row.instance.id}/approve`, {})
      message.success("Đã duyệt")
      await load()
    } finally {
      setActingId(undefined)
    }
  }

  function reject(row: WorkflowTaskRow) {
    let note = ""
    Modal.confirm({
      title: "Từ chối yêu cầu này?",
      content: <Input.TextArea rows={3} placeholder="Lý do từ chối" onChange={(event) => { note = event.target.value }} />,
      okText: "Từ chối",
      cancelText: "Hủy",
      okButtonProps: { danger: true },
      onOk: async () => {
        if (!row.instance?.id) return
        setActingId(row.id)
        try {
          await api.post(`/workflow/instances/${row.instance.id}/reject`, { note })
          message.success("Đã từ chối")
          await load()
        } finally {
          setActingId(undefined)
        }
      },
    })
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Title level={3}>Việc cần duyệt</Typography.Title>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>Tải lại</Button>
      </div>
      <Card className="table-card">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          pagination={{ pageSize: 20 }}
          columns={[
            {
              title: "Yêu cầu",
              render: (_, row) => {
                const resource = row.instance?.targetResource || row.definition?.targetResource || ""
                return (
                  <Space direction="vertical" size={0}>
                    <Typography.Text strong>{buildRecordTitle(resource, row.targetRecord)}</Typography.Text>
                    <Typography.Text type="secondary">{entityLabels[resource] || resource}</Typography.Text>
                  </Space>
                )
              },
            },
            {
              title: "Luồng",
              render: (_, row) => (
                <Space direction="vertical" size={0}>
                  <Typography.Text>{row.definition?.name || "-"}</Typography.Text>
                  <Typography.Text type="secondary">{row.step?.stateLabel || row.step?.name || "Chờ duyệt"}</Typography.Text>
                </Space>
              ),
            },
            {
              title: "Trạng thái",
              render: (_, row) => {
                const resource = row.instance?.targetResource || ""
                const status = String(row.targetRecord?.status || row.instance?.status || row.status || "pending")
                return <Tag color={status === "pending" ? "gold" : status === "approved" ? "green" : status === "rejected" ? "red" : "default"}>{getFieldLabel(resource, "status", status)}</Tag>
              },
            },
            {
              title: "",
              width: 260,
              render: (_, row) => {
                const instance = row.instance
                return (
                  <Space>
                    {instance ? (
                      <Button icon={<EyeOutlined />} onClick={() => navigate(`/${instance.targetResource}/${instance.targetRecordId}/full`)}>
                        Mở
                      </Button>
                    ) : null}
                    <Button className="primary-glow" icon={<CheckOutlined />} loading={actingId === row.id} type="primary" onClick={() => void approve(row)}>
                      {row.step?.approveActionLabel || "Duyệt"}
                    </Button>
                    <Button danger icon={<CloseOutlined />} loading={actingId === row.id} onClick={() => reject(row)}>
                      {row.step?.rejectActionLabel || "Từ chối"}
                    </Button>
                  </Space>
                )
              },
            },
          ]}
        />
      </Card>
    </>
  )
}

function buildRecordTitle(resource: string, record?: Record<string, unknown>) {
  if (!record) return "-"
  if (resource === "payment-requests") return [record.title, record.amount ? `${record.amount} đ` : ""].filter(Boolean).join(" - ")
  if (resource === "business-trip-requests") return [record.destination, record.startDate, record.endDate].filter(Boolean).join(" - ")
  if (resource === "attendance-adjustment-requests") return [record.date, record.requestedCheckIn, record.requestedCheckOut].filter(Boolean).join(" - ")
  if (resource === "leave-requests") return [record.startDate, record.endDate, record.leaveType].filter(Boolean).join(" - ")
  return String(record.id || "-")
}
