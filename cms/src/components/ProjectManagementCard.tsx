import { CloseOutlined, PlusOutlined, SettingOutlined, TeamOutlined } from "@ant-design/icons"
import { Button, Card, Empty, Input, Modal, Select, Space, Tag, Typography, message } from "antd"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"

type KanbanColumn = { key: string; name: string; color?: string; allowedToKeys?: string[] }
type Staff = { id: string; code?: string; fullName?: string }
type ProjectMember = { staffId?: string; staff?: Staff }
type Project = { id: string; memberStaffIds?: string[]; members?: ProjectMember[]; kanbanColumns?: KanbanColumn[] }

const defaultColumns: KanbanColumn[] = [
  { key: "todo", name: "Cần làm", color: "default", allowedToKeys: ["in_progress"] },
  { key: "in_progress", name: "Đang làm", color: "blue", allowedToKeys: ["todo", "review"] },
  { key: "review", name: "Chờ duyệt", color: "orange", allowedToKeys: ["in_progress", "done"] },
  { key: "done", name: "Hoàn thành", color: "green", allowedToKeys: ["review"] },
]

export function ProjectManagementCard({ project, canEdit, onSaved }: { project: Project; canEdit: boolean; onSaved: () => Promise<void> | void }) {
  const [staff, setStaff] = useState<Staff[]>([])
  const [addingMemberIds, setAddingMemberIds] = useState<string[]>([])
  const [savingMembers, setSavingMembers] = useState(false)
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [draftColumns, setDraftColumns] = useState<KanbanColumn[]>([])
  const [savingColumns, setSavingColumns] = useState(false)
  const memberIds = project.memberStaffIds || project.members?.map((member) => member.staffId).filter((id): id is string => Boolean(id)) || []
  const staffById = useMemo(() => new Map(staff.map((item) => [item.id, item])), [staff])

  useEffect(() => {
    void api.get("/records/staff", { params: { pageSize: 1000 } }).then((response) => setStaff(response.data?.data || [])).catch(() => setStaff([]))
  }, [])

  async function saveMembers(nextMemberIds: string[]) {
    setSavingMembers(true)
    try {
      await api.patch(`/records/projects/${project.id}`, { memberStaffIds: nextMemberIds })
      setAddingMemberIds([])
      await onSaved()
      message.success("Đã cập nhật thành viên")
    } finally {
      setSavingMembers(false)
    }
  }

  function openColumnSettings() {
    setDraftColumns((project.kanbanColumns?.length ? project.kanbanColumns : defaultColumns).map((column) => ({ ...column })))
    setColumnsOpen(true)
  }

  async function saveColumns() {
    const columns = draftColumns.map((column, index) => ({ ...column, key: column.key || `status_${index + 1}`, name: column.name.trim(), allowedToKeys: column.allowedToKeys || [] })).filter((column) => column.name)
    if (!columns.length) return
    setSavingColumns(true)
    try {
      await api.patch(`/records/projects/${project.id}`, { kanbanColumns: columns })
      setColumnsOpen(false)
      await onSaved()
      message.success("Đã lưu cột Kanban")
    } finally {
      setSavingColumns(false)
    }
  }

  return (
    <Card className="glass-card detail-card project-management-card" size="small" title={<Space><TeamOutlined /><span>Thiết lập dự án</span></Space>} extra={canEdit ? <Button icon={<SettingOutlined />} size="small" onClick={openColumnSettings}>Cột Kanban</Button> : null}>
      <Typography.Text type="secondary">Thành viên</Typography.Text>
      {memberIds.length ? (
        <Space className="project-management-members" size={[4, 4]} wrap>
          {memberIds.map((staffId) => {
            const member = project.members?.find((item) => item.staffId === staffId)?.staff || staffById.get(staffId)
            const label = member?.fullName || member?.code || "Thành viên"
            return <Tag key={staffId} closable={canEdit} closeIcon={<CloseOutlined />} onClose={(event) => { event.preventDefault(); void saveMembers(memberIds.filter((id) => id !== staffId)) }}>{label}</Tag>
          })}
        </Space>
      ) : <Empty className="project-management-empty" description="Chưa có thành viên" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      {canEdit ? <Space.Compact className="project-management-add-member">
        <Select mode="multiple" allowClear maxTagCount="responsive" options={staff.filter((item) => !memberIds.includes(item.id)).map((item) => ({ value: item.id, label: `${item.code ? `${item.code} · ` : ""}${item.fullName || item.code || item.id}` }))} placeholder="Thêm thành viên" value={addingMemberIds} onChange={setAddingMemberIds} />
        <Button disabled={!addingMemberIds.length} icon={<PlusOutlined />} loading={savingMembers} onClick={() => void saveMembers(Array.from(new Set([...memberIds, ...addingMemberIds])))}>Thêm</Button>
      </Space.Compact> : null}

      <Modal destroyOnHidden okText="Lưu cột" open={columnsOpen} title="Cấu hình cột Kanban" confirmLoading={savingColumns} onCancel={() => setColumnsOpen(false)} onOk={() => void saveColumns()}>
        <div className="project-board-column-settings">
          {draftColumns.map((column, index) => <div key={column.key}>
            <Input value={column.name} onChange={(event) => setDraftColumns((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />
            <Select mode="multiple" value={column.allowedToKeys || []} options={draftColumns.filter((item) => item.key !== column.key).map((item) => ({ value: item.key, label: item.name || item.key }))} placeholder="Được kéo đến" onChange={(allowedToKeys) => setDraftColumns((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, allowedToKeys } : item))} />
            <Button danger icon={<CloseOutlined />} disabled={draftColumns.length <= 1} onClick={() => setDraftColumns((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Bỏ cột" />
          </div>)}
          <Button icon={<PlusOutlined />} onClick={() => setDraftColumns((current) => [...current, { key: `status_${Date.now()}`, name: "Cột mới" }])}>Thêm cột</Button>
        </div>
      </Modal>
    </Card>
  )
}
