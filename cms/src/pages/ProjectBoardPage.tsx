import { DeleteOutlined, PlusOutlined, ReloadOutlined, SettingOutlined } from "@ant-design/icons"
import { Button, Empty, Input, Modal, Select, Spin, Tag, Typography } from "antd"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { api } from "../api"
import { RecordFormContent } from "../components/RecordFormContent"

type KanbanColumn = { key: string; name: string; color?: string; allowedToKeys?: string[] }
type Project = { id: string; code: string; name: string; kanbanColumns?: KanbanColumn[]; members?: Array<{ staff?: { code?: string; fullName?: string } }> }
type Task = {
  id: string; title: string; status?: string; priority?: string; dueDate?: string; sortOrder?: number
  assigneeStaff?: { code?: string; fullName?: string }
}

const defaultColumns: KanbanColumn[] = [
  { key: "todo", name: "Cần làm", color: "default", allowedToKeys: ["in_progress"] },
  { key: "in_progress", name: "Đang làm", color: "blue", allowedToKeys: ["todo", "review"] },
  { key: "review", name: "Chờ duyệt", color: "orange", allowedToKeys: ["in_progress", "done"] },
  { key: "done", name: "Hoàn thành", color: "green", allowedToKeys: ["review"] },
]
const priorityLabels: Record<string, { label: string; color: string }> = {
  low: { label: "Thấp", color: "default" }, medium: { label: "Trung bình", color: "blue" },
  high: { label: "Cao", color: "orange" }, urgent: { label: "Khẩn", color: "red" },
}

export function ProjectBoardPage() {
  const { id: projectId = "" } = useParams()
  const [project, setProject] = useState<Project>()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<string>()
  const [draggedTaskId, setDraggedTaskId] = useState<string>()
  const [columnsOpen, setColumnsOpen] = useState(false)
  const [draftColumns, setDraftColumns] = useState<KanbanColumn[]>([])
  const [savingColumns, setSavingColumns] = useState(false)

  const columns = project?.kanbanColumns?.length ? project.kanbanColumns : defaultColumns
  const tasksByStatus = useMemo(() => Object.fromEntries(columns.map((column) => [
    column.key,
    tasks.filter((task) => (task.status || columns[0]?.key) === column.key).sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0)),
  ])), [columns, tasks]) as Record<string, Task[]>

  async function load() {
    if (!projectId) return
    setLoading(true)
    try {
      const [projectResponse, taskResponse] = await Promise.all([
        api.get(`/records/projects/${projectId}`),
        api.get("/records/tasks", { params: { pageSize: 1000, projectId, include: "assigneeStaff" } }),
      ])
      setProject(projectResponse.data?.data)
      setTasks(taskResponse.data?.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [projectId])

  function canMoveTo(status: string) {
    const currentTask = tasks.find((item) => item.id === draggedTaskId)
    if (!currentTask || currentTask.status === status) return true
    const sourceColumn = columns.find((column) => column.key === currentTask.status)
    return !sourceColumn?.allowedToKeys || sourceColumn.allowedToKeys.includes(status)
  }

  async function moveTask(status: string) {
    const taskId = draggedTaskId
    if (!taskId) return
    const currentTask = tasks.find((item) => item.id === taskId)
    setDraggedTaskId(undefined)
    if (!currentTask || currentTask.status === status) return
    const sourceColumn = columns.find((column) => column.key === currentTask.status)
    if (sourceColumn?.allowedToKeys && !sourceColumn.allowedToKeys.includes(status)) return
    const sortOrder = (tasksByStatus[status] || []).length
    setTasks((current) => current.map((item) => item.id === taskId ? { ...item, status, sortOrder } : item))
    try {
      await api.patch(`/records/tasks/${taskId}`, { status, sortOrder })
    } catch {
      void load()
    }
  }

  function openColumnSettings() {
    setDraftColumns(columns.map((column) => ({ ...column })))
    setColumnsOpen(true)
  }

  async function saveColumns() {
    const normalized = draftColumns.map((column, index) => ({
      ...column,
      key: column.key || `status_${index + 1}`,
      name: column.name.trim(),
      allowedToKeys: column.allowedToKeys || [],
    })).filter((column) => column.name)
    if (normalized.length === 0 || !project) return
    setSavingColumns(true)
    try {
      const nextKeys = new Set(normalized.map((column) => column.key))
      const movedTasks = tasks.filter((task) => !nextKeys.has(task.status || columns[0]?.key))
      await Promise.all(movedTasks.map((task, index) => api.patch(`/records/tasks/${task.id}`, { status: normalized[0].key, sortOrder: index })))
      await api.patch(`/records/projects/${project.id}`, { kanbanColumns: normalized })
      setProject((current) => current ? { ...current, kanbanColumns: normalized } : current)
      if (movedTasks.length > 0) setTasks((current) => current.map((task) => !nextKeys.has(task.status || columns[0]?.key) ? { ...task, status: normalized[0].key } : task))
      setColumnsOpen(false)
    } finally {
      setSavingColumns(false)
    }
  }

  if (loading) return <div className="project-board-loading"><Spin /></div>
  if (!project) return <Empty description="Không tìm thấy dự án." />

  return (
    <div className="project-board-page">
      <header className="project-board-header">
        <div>
          <Typography.Title level={2}>{project.code} - {project.name}</Typography.Title>
          {project.members?.length ? <div className="project-board-members">{project.members.map((member, index) => <Tag key={index}>{member.staff?.fullName || member.staff?.code || "Thành viên"}</Tag>)}</div> : null}
        </div>
        <div className="project-board-actions">
          <Button icon={<ReloadOutlined />} onClick={() => void load()} aria-label="Tải lại" />
          <Button icon={<SettingOutlined />} onClick={openColumnSettings}>Cột</Button>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setCreating(true)}>Thêm việc</Button>
        </div>
      </header>

      <div className="project-board-columns">
        {columns.map((column) => (
          <section className={`project-board-column${draggedTaskId && !canMoveTo(column.key) ? " project-board-column--blocked" : ""}`} key={column.key} onDragOver={(event) => { if (canMoveTo(column.key)) event.preventDefault() }} onDrop={() => void moveTask(column.key)}>
            <header><Typography.Text strong>{column.name}</Typography.Text><span>{tasksByStatus[column.key]?.length || 0}</span></header>
            <div className="project-board-cards">
              {(tasksByStatus[column.key] || []).map((task) => {
                const priority = priorityLabels[task.priority || "medium"] || priorityLabels.medium
                return <button className="project-task-card" draggable key={task.id} type="button" onClick={() => setEditingTaskId(task.id)} onDragStart={() => setDraggedTaskId(task.id)} onDragEnd={() => setDraggedTaskId(undefined)}>
                  <span className="project-task-card__title">{task.title}</span>
                  <span className="project-task-card__meta"><Tag color={priority.color}>{priority.label}</Tag>{task.dueDate ? <span>{task.dueDate}</span> : null}{task.assigneeStaff?.fullName || task.assigneeStaff?.code ? <span>{task.assigneeStaff.fullName || task.assigneeStaff.code}</span> : null}</span>
                </button>
              })}
            </div>
          </section>
        ))}
      </div>

      <Modal destroyOnHidden footer={null} open={creating} title="Thêm công việc" onCancel={() => setCreating(false)}>
        <RecordFormContent compact hiddenFieldKeys={["projectId", "status", "sortOrder"]} initialValues={{ projectId, status: columns[0]?.key, priority: "medium", sortOrder: tasksByStatus[columns[0]?.key]?.length || 0 }} resource="tasks" onCancel={() => setCreating(false)} onSuccess={() => { setCreating(false); void load() }} />
      </Modal>
      <Modal destroyOnHidden footer={null} open={Boolean(editingTaskId)} title="Cập nhật công việc" onCancel={() => setEditingTaskId(undefined)}>
        {editingTaskId ? <RecordFormContent compact hiddenFieldKeys={["projectId", "status", "sortOrder"]} id={editingTaskId} resource="tasks" onCancel={() => setEditingTaskId(undefined)} onSuccess={() => { setEditingTaskId(undefined); void load() }} /> : null}
      </Modal>
      <Modal destroyOnHidden okText="Lưu cột" open={columnsOpen} title="Cấu hình cột Kanban" confirmLoading={savingColumns} onCancel={() => setColumnsOpen(false)} onOk={() => void saveColumns()}>
        <div className="project-board-column-settings">
          {draftColumns.map((column, index) => <div key={column.key}>
            <Input value={column.name} onChange={(event) => setDraftColumns((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} />
            <Select mode="multiple" value={column.allowedToKeys || []} options={draftColumns.filter((item) => item.key !== column.key).map((item) => ({ value: item.key, label: item.name || item.key }))} placeholder="Được kéo đến" onChange={(allowedToKeys) => setDraftColumns((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, allowedToKeys } : item))} />
            <Button danger icon={<DeleteOutlined />} disabled={draftColumns.length <= 1} onClick={() => setDraftColumns((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Bỏ cột" />
          </div>)}
          <Button icon={<PlusOutlined />} onClick={() => setDraftColumns((current) => [...current, { key: `status_${Date.now()}`, name: "Cột mới" }])}>Thêm cột</Button>
        </div>
      </Modal>
    </div>
  )
}
