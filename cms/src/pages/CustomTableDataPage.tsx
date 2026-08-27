import { DownloadOutlined, EditOutlined, InboxOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { Button, Card, Checkbox, Empty, Form, Input, Modal, Popconfirm, Select, Space, Spin, Table, Tooltip, Typography, Upload, message } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { api } from '../api'
import { CmsBackButton } from '../components/CmsBackButton'
import { ModalTitleBar } from '../components/ModalTitleBar'

type Column = { key: string; label: string; dataType: string; required?: boolean; options?: string[] }
type Row = { id: string; values: Record<string, unknown> }
type DynamicTable = { id: string; key: string; name: string; description?: string; isActive: boolean; columns: Column[] }
const schemaTypes = [{ value: 'text', label: 'Văn bản' }, { value: 'number', label: 'Số' }, { value: 'date', label: 'Ngày' }, { value: 'boolean', label: 'Bật/tắt' }, { value: 'select', label: 'Danh sách chọn' }]

export function CustomTableDataPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [table, setTable] = useState<{ name: string; columns: Column[] }>()
  const [tables, setTables] = useState<DynamicTable[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<Row | null>(null)
  const [fullscreenPopup, setFullscreenPopup] = useState(false)
  const [form] = Form.useForm()
  const [schemaForm] = Form.useForm()
  const [schemaOpen, setSchemaOpen] = useState(false)
  const [editingSchema, setEditingSchema] = useState<DynamicTable | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void load()
  }, [id])

  async function load() {
    setLoading(true)
    try {
      const nextTables = (await api.get('/settings/custom-tables')).data.data || []
      setTables(nextTables)
      const selectedTable = nextTables.find((item: DynamicTable) => item.id === id)
      setTable(selectedTable)
      if (!id && nextTables[0]) {
        navigate(`/custom-tables/${nextTables[0].id}/data`, { replace: true })
        return
      }
      setRows(id && selectedTable ? (await api.get(`/settings/custom-tables/${id}/rows`)).data.data || [] : [])
    } catch {
      setTable(undefined)
      setRows([])
      message.error('Không tải được bảng dữ liệu động')
    } finally {
      setLoading(false)
    }
  }

  async function saveRow(values: Record<string, unknown>) {
    if (editingRow) await api.patch(`/settings/custom-tables/${id}/rows/${editingRow.id}`, { values })
    else await api.post(`/settings/custom-tables/${id}/rows`, { values })
    form.resetFields()
    setCreateOpen(false)
    setEditingRow(null)
    setFullscreenPopup(false)
    await load()
    message.success(editingRow ? 'Đã cập nhật dòng' : 'Đã thêm dòng')
  }

  function openCreate() {
    form.resetFields()
    setEditingRow(null)
    setCreateOpen(true)
  }

  function openEdit(row: Row) {
    form.setFieldsValue(row.values)
    setEditingRow(row)
    setCreateOpen(true)
  }

  function openSchema(tableToEdit?: DynamicTable) {
    setEditingSchema(tableToEdit || null)
    schemaForm.setFieldsValue(tableToEdit ? { ...tableToEdit, columns: tableToEdit.columns.map((column) => ({ ...column, options: column.options?.join(', ') })) } : { isActive: true, columns: [{ key: '', label: '', dataType: 'text' }] })
    setSchemaOpen(true)
  }

  async function saveSchema(values: Record<string, unknown>) {
    const payload = { ...values, columns: ((values.columns || []) as Array<Record<string, unknown>>).map((column, index) => ({ ...column, key: String(column.key || '').trim(), label: String(column.label || '').trim(), sortOrder: index, options: column.dataType === 'select' ? String(column.options || '').split(',').map((item) => item.trim()).filter(Boolean) : undefined })) }
    const saved = editingSchema ? await api.patch(`/settings/custom-tables/${editingSchema.id}`, payload) : await api.post('/settings/custom-tables', payload)
    setSchemaOpen(false)
    if (!editingSchema) navigate(`/custom-tables/${saved.data.data.id}/data`)
    else await load()
  }

  async function removeTable() {
    if (!table || !id) return
    await api.delete(`/settings/custom-tables/${id}`)
    navigate('/custom-tables/data', { replace: true })
  }

  function exportRows() {
    if (!table) return
    const sheet = XLSX.utils.json_to_sheet(
      rows.map((row) => Object.fromEntries(table.columns.map((column) => [column.key, row.values[column.key] ?? '']))),
    )
    const book = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(book, sheet, table.name)
    XLSX.writeFile(book, `${table.name}.xlsx`)
  }

  async function importRows(file: File) {
    const book = XLSX.read(await file.arrayBuffer())
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[book.SheetNames[0]], { defval: '' })
    const batchSize = 100
    for (let start = 0; start < data.length; start += batchSize) {
      const batch = data.slice(start, start + batchSize)
      await Promise.all(batch.map((values) => api.post(`/settings/custom-tables/${id}/rows`, { values })))
    }
    await load()
    message.success(`Đã import ${data.length} dòng`)
    return false
  }

  return (
    <>
      <div className="page-header">
        <Space align="center">
          <Typography.Title level={3} style={{ margin: 0 }}>Dữ liệu:</Typography.Title>
          <Select
            value={id}
            style={{ minWidth: 260 }}
            options={[{ value: '__new__', label: '+ Thêm bảng mới' }, ...tables.map((item) => ({ value: item.id, label: item.name }))]}
            onChange={(nextId) => nextId === '__new__' ? openSchema() : navigate(`/custom-tables/${nextId}/data`)}
          />
          <Button disabled={!table} icon={<EditOutlined />} onClick={() => openSchema(tables.find((item) => item.id === id))}>Schema</Button>
          <Popconfirm title="Lưu trữ bảng này?" onConfirm={() => void removeTable()}><Button disabled={!table} icon={<InboxOutlined />} style={{ color: '#1677ff' }}>Lưu trữ</Button></Popconfirm>
        </Space>
        <Space>
          <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={importRows}>
            <Button disabled={!table} icon={<UploadOutlined />}>Nhập Excel</Button>
          </Upload>
          <Button disabled={!table} icon={<DownloadOutlined />} onClick={exportRows}>Xuất Excel</Button>
          <Button disabled={!table} icon={<PlusOutlined />} type="primary" onClick={openCreate}>Thêm nhanh</Button>
          <CmsBackButton to="/custom-tables" />
        </Space>
      </div>

      <Card className="table-card">
        {loading ? <Spin /> : !table ? <Empty description="Chưa có bảng dữ liệu động" /> : <Table
          rowKey="id"
          dataSource={rows}
          pagination={{ pageSize: 50 }}
          scroll={{ x: 'max-content' }}
          columns={[
            ...table.columns.map((column) => ({
              title: column.label,
              render: (_: unknown, row: Row) => String(row.values[column.key] ?? ''),
            })),
            {
              title: 'Thao tác',
              key: 'actions',
              width: 96,
              fixed: 'right',
              render: (_: unknown, row: Row) => (
                <Space size={0}>
                  <Tooltip title="Sửa dòng"><Button aria-label="Sửa dòng" icon={<EditOutlined />} type="text" onClick={() => openEdit(row)} /></Tooltip>
                  <Popconfirm
                    title="Lưu trữ dòng này?"
                    onConfirm={async () => {
                      await api.delete(`/settings/custom-tables/${id}/rows/${row.id}`)
                      await load()
                    }}
                  >
                    <Tooltip title="Lưu trữ dòng"><Button aria-label="Lưu trữ dòng" icon={<InboxOutlined />} style={{ color: '#1677ff' }} type="text" /></Tooltip>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />}
      </Card>

      {table && <>
      <Modal
        className={`quick-drawer${fullscreenPopup ? " quick-drawer-fullscreen" : ""}`}
        title={
          <ModalTitleBar
            fullscreen={fullscreenPopup}
            title={`${editingRow ? 'Chỉnh sửa' : 'Thêm'} dữ liệu: ${table.name}`}
            onToggleFullscreen={() => setFullscreenPopup((current) => !current)}
          />
        }
        open={createOpen}
        width={fullscreenPopup ? "calc(100vw - 24px)" : 560}
        onCancel={() => {
          setCreateOpen(false)
          setEditingRow(null)
          setFullscreenPopup(false)
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(values) => void saveRow(values)}>
          {table.columns.map((column) => (
            <Form.Item
              key={column.key}
              name={column.key}
              label={column.label}
              rules={column.required ? [{ required: true, message: `Nhập ${column.label}` }] : []}
            >
              {column.dataType === 'select' ? (
                <Select options={(column.options || []).map((value) => ({ value, label: value }))} />
              ) : (
                <Input type={column.dataType === 'number' ? 'number' : column.dataType === 'date' ? 'date' : 'text'} />
              )}
            </Form.Item>
          ))}
        </Form>
      </Modal>
      </>}
      <Modal open={schemaOpen} title={editingSchema ? 'Sửa schema bảng' : 'Thêm bảng dữ liệu động'} width={1000} onCancel={() => setSchemaOpen(false)} onOk={() => schemaForm.submit()}>
        <Form form={schemaForm} layout="vertical" onFinish={(values) => void saveSchema(values)}>
          <Space.Compact block><Form.Item name="name" label="Tên bảng" rules={[{ required: true }]} style={{ flex: 1 }}><Input /></Form.Item><Form.Item name="key" label="Key" rules={[{ required: true }]} style={{ flex: 1 }}><Input disabled={Boolean(editingSchema)} /></Form.Item></Space.Compact>
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={2} /></Form.Item><Form.Item name="isActive" valuePropName="checked"><Checkbox>Đang sử dụng</Checkbox></Form.Item>
          <Form.List name="columns">{(fields, { add, remove }) => <Table dataSource={fields} pagination={false} rowKey="key" size="small" columns={[{ title: 'Tên cột', render: (_, field) => <Form.Item name={[field.name, 'label']} rules={[{ required: true }]} style={{ margin: 0 }}><Input /></Form.Item> }, { title: 'Key', render: (_, field) => <Form.Item name={[field.name, 'key']} rules={[{ required: true }]} style={{ margin: 0 }}><Input /></Form.Item> }, { title: 'Kiểu', render: (_, field) => <Form.Item name={[field.name, 'dataType']} initialValue="text" style={{ margin: 0 }}><Select options={schemaTypes} /></Form.Item> }, { title: 'Options', render: (_, field) => <Form.Item name={[field.name, 'options']} style={{ margin: 0 }}><Input placeholder="A, B, C" /></Form.Item> }, { title: '', render: (_, field) => <Button danger type="text" onClick={() => remove(field.name)}>Xóa</Button> }]} footer={() => <Button type="dashed" onClick={() => add({ dataType: 'text' })}>Thêm cột</Button>} />}</Form.List>
        </Form>
      </Modal>
    </>
  )
}
