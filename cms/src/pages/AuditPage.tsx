import { AuditOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Card, Input, Space, Table, Tabs, Tag, Tooltip, Typography, type TableProps } from 'antd'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'

type AuditLog = {
  id: string
  createdAt: string
  userName?: string
  action: string
  module: string
  targetId?: string
  payload?: Record<string, unknown>
}

type SystemErrorLog = {
  id: string
  createdAt: string
  status: number
  method: string
  path: string
  userEmail?: string
  requestId?: string
  errorName?: string
  message: string
  stack?: string
  params?: Record<string, unknown>
  query?: Record<string, unknown>
  body?: Record<string, unknown>
  headers?: Record<string, unknown>
  files?: Array<Record<string, unknown>>
}

const auditSortableFields = new Set(['createdAt', 'userName', 'action', 'module', 'targetId'])
const errorSortableFields = new Set(['createdAt', 'status', 'userEmail', 'message'])

function formatLogValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '-'
  try {
    return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function renderErrorDetail(row: SystemErrorLog) {
  const blocks: Array<[string, unknown]> = [
    ['Thông tin request', {
      requestId: row.requestId,
      errorName: row.errorName,
      method: row.method,
      path: row.path,
      userEmail: row.userEmail,
    }],
    ['Params', row.params],
    ['Query', row.query],
    ['Body', row.body],
    ['Files', row.files],
    ['Headers', row.headers],
    ['Stack', row.stack],
  ]
  return (
    <div className="system-error-detail">
      {blocks.map(([label, value]) => (
        <div key={label} className="system-error-detail-block">
          <Typography.Text strong>{label}</Typography.Text>
          <pre>{formatLogValue(value)}</pre>
        </div>
      ))}
    </div>
  )
}

function renderAuditDetail(row: AuditLog) {
  const blocks: Array<[string, unknown]> = [
    ['Thông tin thao tác', {
      userName: row.userName,
      action: row.action,
      module: row.module,
      targetId: row.targetId,
      createdAt: row.createdAt,
    }],
    ['Data gửi lên / thay đổi', row.payload],
  ]
  return (
    <div className="system-error-detail audit-log-detail">
      {blocks.map(([label, value]) => (
        <div key={label} className="system-error-detail-block">
          <Typography.Text strong>{label}</Typography.Text>
          <pre>{formatLogValue(value)}</pre>
        </div>
      ))}
    </div>
  )
}

export function AuditPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [mode, setMode] = useState<'logs' | 'errors'>(() => searchParams.get('tab') === 'errors' ? 'errors' : 'logs')
  const [rows, setRows] = useState<Array<AuditLog | SystemErrorLog>>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [page, setPage] = useState(() => Number(searchParams.get('page') || 1))
  const [pageSize, setPageSize] = useState(() => Number(searchParams.get('pageSize') || 30))
  const [sort, setSort] = useState(() => searchParams.get('sort') || 'createdAt')
  const [order, setOrder] = useState<'asc' | 'desc'>(() => searchParams.get('order') === 'asc' ? 'asc' : 'desc')

  async function load() {
    setLoading(true)
    try {
      const response = await api.get(mode === 'errors' ? '/system-error-logs' : '/audit-logs', { params: { page, pageSize, search, sort, order } })
      const result = response.data || {}
      setRows(Array.isArray(result.data) ? result.data : [])
      setTotal(Number(result.total || 0))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [mode, page, pageSize, search, sort, order])

  useEffect(() => {
    const next = new URLSearchParams()
    if (mode === 'errors') next.set('tab', 'errors')
    if (search) next.set('search', search)
    if (page > 1) next.set('page', String(page))
    if (pageSize !== 30) next.set('pageSize', String(pageSize))
    if (sort !== 'createdAt') next.set('sort', sort)
    if (order !== 'desc') next.set('order', order)
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [mode, search, page, pageSize, sort, order, searchParams, setSearchParams])

  const auditColumns: TableProps<AuditLog>['columns'] = [
    { title: 'Thời gian', dataIndex: 'createdAt', key: 'createdAt', sorter: true, sortOrder: sort === 'createdAt' ? order === 'asc' ? 'ascend' : 'descend' : null, render: (value: string) => value ? new Date(value).toLocaleString('vi-VN') : '-' },
    { title: 'Người dùng', dataIndex: 'userName', key: 'userName', sorter: true, sortOrder: sort === 'userName' ? order === 'asc' ? 'ascend' : 'descend' : null, render: (value?: string) => value || '-' },
    { title: 'Hành động', dataIndex: 'action', key: 'action', sorter: true, sortOrder: sort === 'action' ? order === 'asc' ? 'ascend' : 'descend' : null },
    { title: 'Phân hệ', dataIndex: 'module', key: 'module', sorter: true, sortOrder: sort === 'module' ? order === 'asc' ? 'ascend' : 'descend' : null },
    { title: 'Bản ghi', dataIndex: 'targetId', key: 'targetId', sorter: true, sortOrder: sort === 'targetId' ? order === 'asc' ? 'ascend' : 'descend' : null, render: (value?: string) => value || '-' },
  ]

  const errorColumns: TableProps<SystemErrorLog>['columns'] = [
    { title: 'Thời gian', dataIndex: 'createdAt', key: 'createdAt', sorter: true, sortOrder: sort === 'createdAt' ? order === 'asc' ? 'ascend' : 'descend' : null, render: (value: string) => value ? new Date(value).toLocaleString('vi-VN') : '-' },
    { title: 'Mã lỗi', dataIndex: 'status', key: 'status', width: 90, sorter: true, sortOrder: sort === 'status' ? order === 'asc' ? 'ascend' : 'descend' : null, render: (value: number) => <Tag color="red">{value}</Tag> },
    { title: 'Request', key: 'request', render: (_, row) => <><Typography.Text strong>{row.method}</Typography.Text><br /><Typography.Text type="secondary">{row.path}</Typography.Text></> },
    { title: 'Người dùng', dataIndex: 'userEmail', key: 'userEmail', sorter: true, sortOrder: sort === 'userEmail' ? order === 'asc' ? 'ascend' : 'descend' : null, render: (value?: string) => value || '-' },
    { title: 'Thông báo lỗi', dataIndex: 'message', key: 'message', sorter: true, sortOrder: sort === 'message' ? order === 'asc' ? 'ascend' : 'descend' : null, ellipsis: true },
  ]

  const handleTableChange: TableProps<AuditLog | SystemErrorLog>['onChange'] = (pagination, _filters, sorter) => {
    setPage(pagination.current || 1)
    setPageSize(pagination.pageSize || 30)
    const nextSorter = Array.isArray(sorter) ? sorter[0] : sorter
    const nextSort = String(nextSorter?.field || '')
    const allowedSorts = mode === 'errors' ? errorSortableFields : auditSortableFields
    if (allowedSorts.has(nextSort)) {
      setSort(nextSort)
      setOrder(nextSorter?.order === 'ascend' ? 'asc' : 'desc')
    }
  }

  return (
    <>
      <div className="page-header">
        <Typography.Title className="page-title-with-icon" level={3}><AuditOutlined /><span>Nhật ký hệ thống</span></Typography.Title>
        <Space className="page-header-actions">
          <Tooltip title="Làm mới dữ liệu"><Button aria-label="Làm mới dữ liệu" icon={<ReloadOutlined />} loading={loading} onClick={() => void load()} /></Tooltip>
          <Input.Search
            allowClear
            className="page-search"
            defaultValue={search}
            onSearch={(value) => { setPage(1); setSearch(value.trim()) }}
            placeholder={mode === 'errors' ? 'Tìm URL, người dùng, thông báo lỗi…' : 'Tìm người dùng, hành động, phân hệ…'}
          />
        </Space>
      </div>
      <Card className="glass-card table-card">
        <Tabs
          activeKey={mode}
          className="audit-log-tabs"
          items={[
            { key: 'logs', label: 'Hoạt động hệ thống' },
            { key: 'errors', label: 'Lỗi hệ thống (500)' },
          ]}
          onChange={(key) => { setMode(key === 'errors' ? 'errors' : 'logs'); setPage(1); setSort('createdAt'); setOrder('desc') }}
        />
        <Table<any>
          rowKey="id"
          columns={mode === 'errors' ? errorColumns : auditColumns}
          dataSource={rows}
          expandable={{ expandedRowRender: (row) => mode === 'errors' ? renderErrorDetail(row as SystemErrorLog) : renderAuditDetail(row as AuditLog) }}
          loading={loading}
          onChange={handleTableChange}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: (value) => `${value} nhật ký` }}
          scroll={{ x: 'max-content' }}
          size="small"
        />
      </Card>
    </>
  )
}
