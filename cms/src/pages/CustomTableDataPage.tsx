import { DownloadOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Typography, Upload, message } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { api } from '../api'
import { ModalTitleBar } from '../components/ModalTitleBar'

type Column = { key: string; label: string; dataType: string; required?: boolean; options?: string[] }
type Row = { id: string; values: Record<string, unknown> }

export function CustomTableDataPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [table, setTable] = useState<{ name: string; columns: Column[] }>()
  const [tables, setTables] = useState<Array<{ id: string; name: string }>>([])
  const [rows, setRows] = useState<Row[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [fullscreenPopup, setFullscreenPopup] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => {
    void load()
  }, [id])

  async function load() {
    const nextTables = (await api.get('/settings/custom-tables')).data.data
    setTables(nextTables)
    setTable(nextTables.find((item: { id: string }) => item.id === id))
    setRows((await api.get(`/settings/custom-tables/${id}/rows`)).data.data || [])
  }

  async function add(values: Record<string, unknown>) {
    await api.post(`/settings/custom-tables/${id}/rows`, { values })
    form.resetFields()
    setCreateOpen(false)
    setFullscreenPopup(false)
    await load()
    message.success('Đã thêm dòng')
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
    await Promise.all(data.map((values) => api.post(`/settings/custom-tables/${id}/rows`, { values })))
    await load()
    message.success(`Đã import ${data.length} dòng`)
    return false
  }

  if (!table) return null

  return (
    <>
      <div className="page-header">
        <Space align="center">
          <Typography.Title level={3} style={{ margin: 0 }}>Dữ liệu:</Typography.Title>
          <Select
            value={id}
            style={{ minWidth: 260 }}
            options={tables.map((item) => ({ value: item.id, label: item.name }))}
            onChange={(nextId) => navigate(`/custom-tables/${nextId}/data`)}
          />
        </Space>
        <Space>
          <Upload accept=".xlsx,.xls" showUploadList={false} beforeUpload={importRows}>
            <Button icon={<UploadOutlined />}>Nhập Excel</Button>
          </Upload>
          <Button icon={<DownloadOutlined />} onClick={exportRows}>Xuất Excel</Button>
          <Button icon={<PlusOutlined />} type="primary" onClick={() => setCreateOpen(true)}>Thêm nhanh</Button>
          <Button onClick={() => navigate('/custom-tables')}>Quay lại</Button>
        </Space>
      </div>

      <Card className="table-card">
        <Table
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
              title: '',
              render: (_: unknown, row: Row) => (
                <Popconfirm
                  title="Lưu trữ dòng này?"
                  onConfirm={async () => {
                    await api.delete(`/settings/custom-tables/${id}/rows/${row.id}`)
                    await load()
                  }}
                >
                  <Button danger type="link">Lưu trữ</Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        className={`quick-drawer${fullscreenPopup ? " quick-drawer-fullscreen" : ""}`}
        title={
          <ModalTitleBar
            fullscreen={fullscreenPopup}
            title={`Thêm dữ liệu: ${table.name}`}
            onToggleFullscreen={() => setFullscreenPopup((current) => !current)}
          />
        }
        open={createOpen}
        width={fullscreenPopup ? "calc(100vw - 24px)" : 560}
        onCancel={() => {
          setCreateOpen(false)
          setFullscreenPopup(false)
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(values) => void add(values)}>
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
    </>
  )
}
