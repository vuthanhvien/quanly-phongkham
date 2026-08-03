import { DeleteOutlined, EditOutlined, GlobalOutlined, PlusOutlined } from "@ant-design/icons"
import { Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tag, Tooltip, Typography, message } from "antd"
import { useEffect, useState } from "react"
import { api } from "../api"
import { getApiErrorMessage } from "../utils/apiError"

type LandingPageOption = { id: string; title: string; path: string; isPublished: boolean }
type LandingDomain = { domain: string; landingPageId: string; landingPageTitle: string; landingPath: string; isPublished: boolean }

export function LandingDomainsPage() {
  const [rows, setRows] = useState<LandingDomain[]>([])
  const [pages, setPages] = useState<LandingPageOption[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<LandingDomain | null>(null)
  const [open, setOpen] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [domainsResponse, pagesResponse] = await Promise.all([api.get("/settings/landing-domains"), api.get("/settings/landing-pages")])
      setRows(domainsResponse.data.data || [])
      setPages(pagesResponse.data.data || [])
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không tải được danh sách domain"))
    } finally { setLoading(false) }
  }

  function openCreate() {
    setEditing(null)
    form.resetFields()
    setOpen(true)
  }

  function openEdit(row: LandingDomain) {
    setEditing(row)
    form.setFieldsValue({ domain: row.domain, landingPageId: row.landingPageId })
    setOpen(true)
  }

  async function save(values: { domain: string; landingPageId: string }) {
    try {
      if (editing) await api.patch(`/settings/landing-domains/${encodeURIComponent(editing.domain)}`, values)
      else await api.post("/settings/landing-domains", values)
      message.success(editing ? "Đã cập nhật domain" : "Đã thêm domain")
      setOpen(false)
      await load()
    } catch (error) { message.error(getApiErrorMessage(error, "Không thể lưu domain")) }
  }

  async function remove(domain: string) {
    try {
      await api.delete(`/settings/landing-domains/${encodeURIComponent(domain)}`)
      message.success("Đã gỡ domain")
      await load()
    } catch (error) { message.error(getApiErrorMessage(error, "Không thể gỡ domain")) }
  }

  return <>
    <div className="page-header">
      <Typography.Title level={3}>Domain Landing</Typography.Title>
      <Button className="primary-glow" icon={<PlusOutlined />} type="primary" onClick={openCreate}>Thêm domain</Button>
    </div>
    <Card className="table-card">
      <Table
        dataSource={rows}
        loading={loading}
        pagination={false}
        rowKey="domain"
        columns={[
          { title: "Domain", dataIndex: "domain", render: (domain: string) => <Space><GlobalOutlined /><strong>{domain}</strong></Space> },
          { title: "Landing page", dataIndex: "landingPageTitle" },
          { title: "Đường dẫn", dataIndex: "landingPath", render: (path: string) => <code>{path}</code> },
          { title: "Trạng thái page", render: (_value, row) => <Tag color={row.isPublished ? "green" : "default"}>{row.isPublished ? "Đã xuất bản" : "Nháp"}</Tag> },
          { title: "", width: 90, render: (_value, row) => <Space size={2}>
            <Tooltip title="Sửa"><Button icon={<EditOutlined />} type="text" onClick={() => openEdit(row)} /></Tooltip>
            <Popconfirm cancelText="Hủy" okButtonProps={{ danger: true }} okText="Gỡ" title={`Gỡ domain ${row.domain}?`} onConfirm={() => void remove(row.domain)}>
              <Tooltip title="Gỡ domain"><Button danger icon={<DeleteOutlined />} type="text" /></Tooltip>
            </Popconfirm>
          </Space> },
        ]}
      />
    </Card>
    <Modal destroyOnHidden footer={null} open={open} title={editing ? "Cập nhật domain" : "Thêm domain"} onCancel={() => setOpen(false)}>
      <Form form={form} layout="vertical" onFinish={(values) => void save(values)}>
        <Form.Item label="Domain" name="domain" rules={[{ required: true, message: "Nhập domain" }]} extra="Chỉ nhập domain, ví dụ clinic.example.com."><Input placeholder="clinic.example.com" /></Form.Item>
        <Form.Item label="Landing page" name="landingPageId" rules={[{ required: true, message: "Chọn landing page" }]}><Select showSearch optionFilterProp="label" options={pages.map((page) => ({ value: page.id, label: `${page.title} (${page.path})` }))} /></Form.Item>
        <Space><Button className="primary-glow" htmlType="submit" type="primary">Lưu</Button><Button onClick={() => setOpen(false)}>Hủy</Button></Space>
      </Form>
    </Modal>
  </>
}
