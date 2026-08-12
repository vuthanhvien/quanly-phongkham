import { AuditOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Card, Input, Space, Table, Tooltip, Typography, type TableProps } from 'antd'
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
}

const sortableFields = new Set(['createdAt', 'userName', 'action', 'module', 'targetId'])

export function AuditPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [rows, setRows] = useState<AuditLog[]>([])
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
      const response = await api.get('/audit-logs', { params: { page, pageSize, search, sort, order } })
      const result = response.data?.data || {}
      setRows(Array.isArray(result.data) ? result.data : [])
      setTotal(Number(result.total || 0))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [page, pageSize, search, sort, order])

  useEffect(() => {
    const next = new URLSearchParams()
    if (search) next.set('search', search)
    if (page > 1) next.set('page', String(page))
    if (pageSize !== 30) next.set('pageSize', String(pageSize))
    if (sort !== 'createdAt') next.set('sort', sort)
    if (order !== 'desc') next.set('order', order)
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true })
  }, [search, page, pageSize, sort, order, searchParams, setSearchParams])

  const columns: TableProps<AuditLog>['columns'] = [
    { title: 'Thời gian', dataIndex: 'createdAt', key: 'createdAt', sorter: true, sortOrder: sort === 'createdAt' ? order === 'asc' ? 'ascend' : 'descend' : null, render: (value: string) => value ? new Date(value).toLocaleString('vi-VN') : '-' },
    { title: 'Người dùng', dataIndex: 'userName', key: 'userName', sorter: true, sortOrder: sort === 'userName' ? order === 'asc' ? 'ascend' : 'descend' : null, render: (value?: string) => value || '-' },
    { title: 'Hành động', dataIndex: 'action', key: 'action', sorter: true, sortOrder: sort === 'action' ? order === 'asc' ? 'ascend' : 'descend' : null },
    { title: 'Phân hệ', dataIndex: 'module', key: 'module', sorter: true, sortOrder: sort === 'module' ? order === 'asc' ? 'ascend' : 'descend' : null },
    { title: 'Bản ghi', dataIndex: 'targetId', key: 'targetId', sorter: true, sortOrder: sort === 'targetId' ? order === 'asc' ? 'ascend' : 'descend' : null, render: (value?: string) => value || '-' },
  ]

  const handleTableChange: TableProps<AuditLog>['onChange'] = (pagination, _filters, sorter) => {
    setPage(pagination.current || 1)
    setPageSize(pagination.pageSize || 30)
    const nextSorter = Array.isArray(sorter) ? sorter[0] : sorter
    const nextSort = String(nextSorter?.field || '')
    if (sortableFields.has(nextSort)) {
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
            placeholder="Tìm người dùng, hành động, phân hệ…"
          />
        </Space>
      </div>
      <Card className="glass-card table-card">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
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
