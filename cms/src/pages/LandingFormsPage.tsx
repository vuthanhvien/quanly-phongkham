import { Button, Card, Table, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { LandingPage } from '../models'
type FormRow = { id: string; pageId: string; pageTitle: string; formName: string; target?: string; fields: number }
export function LandingFormsPage() {
  const [rows, setRows] = useState<FormRow[]>([]); const [loading, setLoading] = useState(true); const navigate = useNavigate()
  useEffect(() => { api.get('/settings/landing-pages').then((r) => setRows((r.data.data || []).flatMap((p: LandingPage) => (p.blocks || []).filter((b: any) => b.type === 'form').map((b: any) => ({ id: b.id, pageId: p.id, pageTitle: p.title, formName: b.title || 'Form', target: b.targetResource, fields: (b.fields || []).length }))))).finally(() => setLoading(false)) }, [])
  return <><div className="page-header"><Typography.Title level={3}>Landing Forms</Typography.Title></div><Card className="glass-card"><Table rowKey="id" loading={loading} dataSource={rows} columns={[{ title: 'Form', dataIndex: 'formName' }, { title: 'Page', dataIndex: 'pageTitle' }, { title: 'Target', render: (_, r) => <Tag>{r.target || 'leads'}</Tag> }, { title: 'Fields', dataIndex: 'fields' }, { title: '', render: (_, r) => <Button type="link" onClick={() => navigate(`/landing/pages/${r.pageId}`)}>Sửa</Button> }]} /></Card></>
}
