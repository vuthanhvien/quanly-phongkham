import { CheckOutlined, EyeOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Checkbox, Drawer, Form, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { baseFields, entityLabels, type FieldSpec, type LandingFormField } from '../models'
import { createId } from '../utils/createId'
import { getApiErrorMessage } from '../utils/apiError'

type LandingFormRecord = { id: string; name: string; title: string; targetResource: string; fields: LandingFormField[]; description?: string; submitLabel: string; successMessage: string; createdAt: string }
type Submission = { id: string; payload: Record<string, unknown>; status: string; createdAt: string; approvedRecordId?: string }
type CreateValues = { name: string; title: string; targetResource: string; fieldKeys: string[]; description?: string }

function toLandingField(field: FieldSpec): LandingFormField {
  const fieldType = field.type === 'textarea' ? 'textarea'
    : field.type === 'number' ? 'number'
      : field.type === 'date' ? 'date'
        : field.type === 'datetime' ? 'datetime'
          : field.type === 'select' ? 'select'
            : field.key.toLowerCase().includes('email') ? 'email'
              : field.key.toLowerCase().includes('phone') ? 'tel' : 'text'
  return { id: createId(), name: field.key, label: field.label, type: fieldType, required: Boolean(field.required), span: field.width === '100' ? 12 : 6, placeholder: field.placeholder, options: field.options }
}

export function LandingFormsPage() {
  const [items, setItems] = useState<LandingFormRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [model, setModel] = useState('leads')
  const [submissionForm, setSubmissionForm] = useState<LandingFormRecord | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [submissionLoading, setSubmissionLoading] = useState(false)
  const [approvingId, setApprovingId] = useState<string>()
  const [form] = Form.useForm<CreateValues>()

  const modelFields = useMemo(() => (baseFields[model] || []).filter((field) => !['relative', 'file', 'image', 'images', 'dynamic-table', 'multi-select'].includes(field.type || 'text')), [model])

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    try {
      const formsResponse = await api.get('/settings/landing-forms')
      setItems(formsResponse.data.data || [])
    } catch (error) { message.error(getApiErrorMessage(error, 'Không tải được Landing Forms')) }
    finally { setLoading(false) }
  }

  function openCreate() {
    const defaultModel = 'leads'
    setModel(defaultModel)
    form.resetFields()
    form.setFieldsValue({ targetResource: defaultModel, name: 'lead-dang-ky', title: 'Đăng ký tư vấn', fieldKeys: (baseFields[defaultModel] || []).filter((field) => !['relative', 'file', 'image', 'images', 'dynamic-table', 'multi-select'].includes(field.type || 'text')).map((field) => field.key) })
    setOpen(true)
  }

  function onModelChange(targetResource: string) {
    setModel(targetResource)
    form.setFieldsValue({ fieldKeys: (baseFields[targetResource] || []).filter((field) => !['relative', 'file', 'image', 'images', 'dynamic-table', 'multi-select'].includes(field.type || 'text')).map((field) => field.key) })
  }

  async function createForm(values: CreateValues) {
    const fields = modelFields.filter((field) => values.fieldKeys.includes(field.key)).map(toLandingField)
    if (!fields.length) return message.error('Chọn ít nhất một trường dữ liệu')
    setSaving(true)
    try {
      await api.post('/settings/landing-forms', { name: values.name, title: values.title, targetResource: values.targetResource, description: values.description, fields })
      message.success('Đã tạo form. Gắn form vào Landing Page trong block Form.')
      setOpen(false)
      await load()
    } catch (error) { message.error(getApiErrorMessage(error, 'Không thể tạo form')) }
    finally { setSaving(false) }
  }

  async function showSubmissions(item: LandingFormRecord) {
    setSubmissionForm(item)
    setSubmissionLoading(true)
    try { setSubmissions((await api.get(`/settings/landing-forms/${item.id}/submissions`)).data.data || []) }
    catch (error) { message.error(getApiErrorMessage(error, 'Không tải được submissions')) }
    finally { setSubmissionLoading(false) }
  }

  async function approve(submission: Submission) {
    setApprovingId(submission.id)
    try {
      await api.post(`/settings/landing-form-submissions/${submission.id}/approve`)
      message.success('Đã duyệt và lưu vào dữ liệu chính')
      if (submissionForm) await showSubmissions(submissionForm)
    } catch (error) { message.error(getApiErrorMessage(error, 'Không thể duyệt submission')) }
    finally { setApprovingId(undefined) }
  }

  return <>
    <div className="page-header"><Typography.Title level={3}>Landing Forms</Typography.Title><Button className="primary-glow" type="primary" icon={<PlusOutlined />} onClick={openCreate}>Tạo form</Button></div>
    <Card className="glass-card"><Table rowKey="id" loading={loading} dataSource={items} columns={[
      { title: 'Tên form', dataIndex: 'name' }, { title: 'Tiêu đề', dataIndex: 'title' },
      { title: 'Model', render: (_value, item) => <Tag>{entityLabels[item.targetResource] || item.targetResource}</Tag> },
      { title: 'Fields', render: (_value, item) => item.fields?.length || 0 },
      { title: '', width: 70, render: (_value, item) => <Tooltip title="Xem submissions"><Button type="text" icon={<EyeOutlined />} onClick={() => void showSubmissions(item)} /></Tooltip> },
    ]} /></Card>
    <Modal destroyOnHidden footer={null} open={open} title="Tạo Landing Form" onCancel={() => setOpen(false)} width={680}>
      <Form form={form} layout="vertical" onFinish={(values) => void createForm(values)}>
        <Space style={{ display: 'flex' }}><Form.Item name="name" label="Tên form" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="title" label="Tiêu đề hiển thị" rules={[{ required: true }]}><Input /></Form.Item></Space>
        <Form.Item name="targetResource" label="Model lưu sau khi duyệt" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" onChange={onModelChange} options={Object.keys(baseFields).map((key) => ({ value: key, label: entityLabels[key] || key }))} /></Form.Item>
        <Form.Item name="fieldKeys" label="Field hiển thị cho người dùng" rules={[{ required: true, message: 'Chọn ít nhất một field' }]}><Checkbox.Group style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }} options={modelFields.map((field) => ({ value: field.key, label: `${field.label}${field.required ? ' *' : ''}` }))} /></Form.Item>
        <Form.Item name="description" label="Mô tả"><Input.TextArea /></Form.Item>
        <Space><Button className="primary-glow" htmlType="submit" loading={saving} type="primary">Tạo form</Button><Button onClick={() => setOpen(false)}>Hủy</Button></Space>
      </Form>
    </Modal>
    <Drawer open={Boolean(submissionForm)} title={submissionForm ? `Submissions: ${submissionForm.title}` : 'Submissions'} width={760} onClose={() => setSubmissionForm(null)}>
      <Table rowKey="id" loading={submissionLoading} dataSource={submissions} columns={[
        { title: 'Thời gian', dataIndex: 'createdAt', render: (value) => new Date(value).toLocaleString('vi-VN') },
        { title: 'Dữ liệu', render: (_value, item) => <Space direction="vertical" size={0}>{Object.entries(item.payload || {}).map(([key, value]) => <span key={key}><b>{submissionForm?.fields?.find((field) => field.name === key)?.label || key}:</b> {String(value ?? '-')}</span>)}</Space> },
        { title: 'Trạng thái', render: (_value, item) => <Tag color={item.status === 'APPROVED' ? 'green' : 'gold'}>{item.status === 'APPROVED' ? 'Đã duyệt' : 'Chờ duyệt'}</Tag> },
        { title: '', render: (_value, item) => item.status !== 'APPROVED' ? <Button icon={<CheckOutlined />} loading={approvingId === item.id} type="primary" onClick={() => void approve(item)}>Duyệt</Button> : null },
      ]} />
    </Drawer>
  </>
}
