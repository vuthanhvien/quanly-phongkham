import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Space, Table, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { LandingPage } from '../models'

export function LandingPageListPage() {
  const [pages, setPages] = useState<LandingPage[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  useEffect(() => { api.get('/settings/landing-pages').then((r) => setPages(r.data.data || [])).finally(() => setLoading(false)) }, [])
  return <><div className="page-header"><Typography.Title level={3}>Trang đích</Typography.Title><Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/pages/new')}>Tạo trang</Button></div><Card className="glass-card"><Table rowKey="id" loading={loading} dataSource={pages} onRow={(row) => ({ onClick: () => navigate(`/pages/${row.id}`), style: { cursor: 'pointer' } })} columns={[{ title: 'Tên trang', dataIndex: 'title' }, { title: 'Đường dẫn', dataIndex: 'path' }, { title: 'Tên miền', render: (_, row) => <Space wrap>{row.domains?.length ? row.domains.map((domain: string) => <Tag key={domain}>{domain}</Tag>) : '-'}</Space> }, { title: 'Trạng thái', render: (_, row) => <Tag color={row.isPublished ? 'green' : 'default'}>{row.isPublished ? 'Đã xuất bản' : 'Nháp'}</Tag> }, { title: '', render: (_, row) => <Button type="link" onClick={(e) => { e.stopPropagation(); navigate(`/pages/${row.id}`) }}>Chi tiết / Sửa</Button> }]} /></Card></>
}
