import { DeleteOutlined, EditOutlined, GlobalOutlined, PlusOutlined } from "@ant-design/icons"
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tooltip, Typography, message } from "antd"
import { useEffect, useState } from "react"
import { api } from "../api"
import { ModalTitleBar } from "../components/ModalTitleBar"
import { getApiErrorMessage } from "../utils/apiError"

type LandingDomain = { id: string; name: string; domain: string }

export function LandingDomainsPage() {
  const [rows, setRows] = useState<LandingDomain[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<LandingDomain | null>(null)
  const [open, setOpen] = useState(false)
  const [fullscreenPopup, setFullscreenPopup] = useState(false)
  const [form] = Form.useForm()

  useEffect(() => { void load() }, [])

  async function load() {
    setLoading(true)
    try {
      const domainsResponse = await api.get("/settings/landing-domains")
      setRows(domainsResponse.data.data || [])
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
    form.setFieldsValue({ name: row.name, domain: row.domain })
    setOpen(true)
  }

  async function save(values: { name: string; domain: string }) {
    try {
      if (editing) await api.patch(`/settings/landing-domains/${encodeURIComponent(editing.domain)}`, values)
      else await api.post("/settings/landing-domains", values)
      message.success(editing ? "Đã cập nhật domain" : "Đã thêm domain")
      setOpen(false)
      setFullscreenPopup(false)
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
      <Typography.Title level={3}>Tên miền trang đích</Typography.Title>
      <Button className="primary-glow" icon={<PlusOutlined />} type="primary" onClick={openCreate}>Thêm domain</Button>
    </div>
    <Card className="table-card">
      <Table
        dataSource={rows}
        loading={loading}
        pagination={false}
        rowKey="domain"
        columns={[
          { title: "Tên", dataIndex: "name" },
          { title: "Tên miền", dataIndex: "domain", render: (domain: string) => <Space><GlobalOutlined /><strong>{domain}</strong></Space> },
          { title: "", width: 90, render: (_value, row) => <Space size={2}>
            <Tooltip title="Sửa"><Button icon={<EditOutlined />} type="text" onClick={() => openEdit(row)} /></Tooltip>
            <Popconfirm cancelText="Hủy" okButtonProps={{ danger: true }} okText="Gỡ" title={`Gỡ domain ${row.domain}?`} onConfirm={() => void remove(row.domain)}>
              <Tooltip title="Gỡ domain"><Button danger icon={<DeleteOutlined />} type="text" /></Tooltip>
            </Popconfirm>
          </Space> },
        ]}
      />
    </Card>
    <Modal
      className={`quick-drawer${fullscreenPopup ? " quick-drawer-fullscreen" : ""}`}
      destroyOnHidden
      footer={null}
      open={open}
      title={<ModalTitleBar fullscreen={fullscreenPopup} title={editing ? "Cập nhật domain" : "Thêm domain"} onToggleFullscreen={() => setFullscreenPopup((current) => !current)} />}
      width={fullscreenPopup ? "calc(100vw - 24px)" : 560}
      onCancel={() => {
        setOpen(false)
        setFullscreenPopup(false)
      }}
    >
      <Form form={form} layout="vertical" onFinish={(values) => void save(values)}>
        <Form.Item label="Tên" name="name" rules={[{ required: true, message: "Nhập tên" }]}><Input placeholder="Website chính" /></Form.Item>
        <Form.Item label="Domain" name="domain" rules={[{ required: true, message: "Nhập domain" }]} extra="Có thể kèm port, ví dụ clinic.example.com:8080."><Input placeholder="clinic.example.com:8080" /></Form.Item>
        <Space><Button className="primary-glow" htmlType="submit" type="primary">Lưu</Button><Button onClick={() => { setOpen(false); setFullscreenPopup(false) }}>Hủy</Button></Space>
      </Form>
    </Modal>
  </>
}
