import {
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  MessageOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  QrcodeOutlined,
  StopOutlined,
} from "@ant-design/icons"
import {
  Avatar,
  Button,
  Card,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  message,
} from "antd"
import dayjs from "dayjs"
import { useEffect, useMemo, useState } from "react"
import { api } from "../api"
import { getApiErrorMessage } from "../utils/apiError"

interface ZaloAccount {
  id: string
  label: string
  staffId?: string
  branchId?: string
  displayName?: string
  avatarUrl?: string
  connectionStatus: string
  listenerEnabled: boolean
  listenerActive: boolean
  note?: string
  loginState?: LoginState | null
  lastConnectedAt?: string
  lastMessageAt?: string
}

interface ZaloConversation {
  id: string
  displayName: string
  threadType: string
  customerId?: string
  leadId?: string
  contactPhone?: string
  lastMessageText?: string
  lastMessageAt?: string
  unreadCount: number
}

interface ZaloMessage {
  id: string
  direction: string
  senderName?: string
  contentText?: string
  contentJson?: Record<string, unknown>
  sentAt: string
}

interface LoginState {
  status: "IDLE" | "QR_PENDING" | "QR_SCANNED" | "CONNECTED" | "ERROR"
  qrImage?: string
  scannedDisplayName?: string
  scannedAvatar?: string
  error?: string
}

interface OptionItem {
  value: string
  label: string
}

export function ZaloInboxPage() {
  const [accounts, setAccounts] = useState<ZaloAccount[]>([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [selectedAccountId, setSelectedAccountId] = useState<string>()
  const [conversations, setConversations] = useState<ZaloConversation[]>([])
  const [conversationsLoading, setConversationsLoading] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState<ZaloConversation | null>(null)
  const [messagesRows, setMessagesRows] = useState<ZaloMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<ZaloAccount | null>(null)
  const [submittingAccount, setSubmittingAccount] = useState(false)
  const [qrAccountId, setQrAccountId] = useState<string | null>(null)
  const [qrState, setQrState] = useState<LoginState | null>(null)
  const [staffOptions, setStaffOptions] = useState<OptionItem[]>([])
  const [branchOptions, setBranchOptions] = useState<OptionItem[]>([])
  const [customerOptions, setCustomerOptions] = useState<OptionItem[]>([])
  const [leadOptions, setLeadOptions] = useState<OptionItem[]>([])
  const [linking, setLinking] = useState(false)
  const [accountForm] = Form.useForm()

  useEffect(() => {
    void Promise.all([loadAccounts(), loadLookups()])
  }, [])

  useEffect(() => {
    if (!selectedAccountId && accounts.length > 0) {
      setSelectedAccountId(accounts[0].id)
      return
    }
    if (selectedAccountId && !accounts.some((item) => item.id === selectedAccountId)) {
      setSelectedAccountId(accounts[0]?.id)
    }
  }, [accounts, selectedAccountId])

  useEffect(() => {
    if (!selectedAccountId) {
      setConversations([])
      setSelectedConversation(null)
      return
    }
    void loadConversations(selectedAccountId)
  }, [selectedAccountId])

  useEffect(() => {
    if (!selectedConversation?.id) {
      setMessagesRows([])
      return
    }
    void loadMessages(selectedConversation.id)
  }, [selectedConversation?.id])

  useEffect(() => {
    if (!qrAccountId) return
    const timer = window.setInterval(() => {
      void refreshQrState(qrAccountId)
    }, 2000)
    void refreshQrState(qrAccountId)
    return () => window.clearInterval(timer)
  }, [qrAccountId])

  const selectedAccount = useMemo(
    () => accounts.find((item) => item.id === selectedAccountId) || null,
    [accounts, selectedAccountId],
  )

  async function loadAccounts() {
    setAccountsLoading(true)
    try {
      const response = await api.get("/zalo/accounts")
      setAccounts(response.data.data || [])
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không tải được danh sách tài khoản Zalo"))
    } finally {
      setAccountsLoading(false)
    }
  }

  async function loadLookups() {
    try {
      const [staffResponse, branchResponse, customerResponse, leadResponse] = await Promise.all([
        api.get("/records/staff", { params: { pageSize: 200 } }),
        api.get("/records/branches", { params: { pageSize: 200 } }),
        api.get("/records/customers", { params: { pageSize: 200 } }),
        api.get("/records/leads", { params: { pageSize: 200 } }),
      ])
      setStaffOptions(
        (staffResponse.data.data || []).map((row: Record<string, unknown>) => ({
          value: String(row.id),
          label: `${row.code || ""} - ${row.fullName || row.id}`,
        })),
      )
      setBranchOptions(
        (branchResponse.data.data || []).map((row: Record<string, unknown>) => ({
          value: String(row.id),
          label: `${row.slug || ""} - ${row.name || row.id}`,
        })),
      )
      setCustomerOptions(
        (customerResponse.data.data || []).map((row: Record<string, unknown>) => ({
          value: String(row.id),
          label: `${row.code || ""} - ${row.fullName || row.id}`,
        })),
      )
      setLeadOptions(
        (leadResponse.data.data || []).map((row: Record<string, unknown>) => ({
          value: String(row.id),
          label: `${row.code || ""} - ${row.fullName || row.id}`,
        })),
      )
    } catch {
      // ignore lookup load errors to keep inbox accessible
    }
  }

  async function loadConversations(accountId: string) {
    setConversationsLoading(true)
    try {
      const response = await api.get("/zalo/conversations", { params: { accountId } })
      const rows = response.data.data || []
      setConversations(rows)
      setSelectedConversation((current) => rows.find((item: ZaloConversation) => item.id === current?.id) || rows[0] || null)
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không tải được hội thoại Zalo"))
    } finally {
      setConversationsLoading(false)
    }
  }

  async function loadMessages(conversationId: string) {
    setMessagesLoading(true)
    try {
      const response = await api.get(`/zalo/conversations/${conversationId}/messages`, { params: { pageSize: 150 } })
      setMessagesRows(response.data.data || [])
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không tải được tin nhắn Zalo"))
    } finally {
      setMessagesLoading(false)
    }
  }

  function openCreateAccount() {
    setEditingAccount(null)
    accountForm.resetFields()
    accountForm.setFieldsValue({ listenerEnabled: true })
    setAccountModalOpen(true)
  }

  function openEditAccount(account: ZaloAccount) {
    setEditingAccount(account)
    accountForm.setFieldsValue({
      label: account.label,
      staffId: account.staffId,
      branchId: account.branchId,
      note: account.note,
      listenerEnabled: account.listenerEnabled,
    })
    setAccountModalOpen(true)
  }

  async function saveAccount(values: Record<string, unknown>) {
    setSubmittingAccount(true)
    try {
      if (editingAccount) {
        await api.patch(`/zalo/accounts/${editingAccount.id}`, values)
        message.success("Đã cập nhật tài khoản Zalo")
      } else {
        await api.post("/zalo/accounts", values)
        message.success("Đã tạo tài khoản Zalo")
      }
      setAccountModalOpen(false)
      accountForm.resetFields()
      await loadAccounts()
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không thể lưu tài khoản Zalo"))
    } finally {
      setSubmittingAccount(false)
    }
  }

  async function deleteAccount(id: string) {
    try {
      await api.delete(`/zalo/accounts/${id}`)
      message.success("Đã xóa tài khoản Zalo")
      if (selectedAccountId === id) {
        setSelectedAccountId(undefined)
        setSelectedConversation(null)
      }
      await loadAccounts()
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không thể xóa tài khoản Zalo"))
    }
  }

  async function startQrLogin(account: ZaloAccount) {
    try {
      await api.post(`/zalo/accounts/${account.id}/login/start`)
      setQrAccountId(account.id)
      setQrState({ status: "QR_PENDING" })
      message.info("Đã tạo mã QR, dùng Zalo trên điện thoại để quét")
      await loadAccounts()
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không thể khởi động QR login"))
    }
  }

  async function refreshQrState(accountId: string) {
    try {
      const response = await api.get(`/zalo/accounts/${accountId}/login-state`)
      const nextState = response.data.data?.loginState as LoginState
      setQrState(nextState)
      if (nextState?.status === "CONNECTED") {
        message.success("Tài khoản Zalo đã kết nối")
        setQrAccountId(null)
        await loadAccounts()
      }
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không đọc được trạng thái QR"))
      setQrAccountId(null)
    }
  }

  async function startListener(accountId: string) {
    try {
      await api.post(`/zalo/accounts/${accountId}/listener/start`)
      message.success("Đã bật listener Zalo")
      await loadAccounts()
      await loadConversations(accountId)
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không thể bật listener"))
    }
  }

  async function stopListener(accountId: string) {
    try {
      await api.post(`/zalo/accounts/${accountId}/listener/stop`)
      message.success("Đã tắt listener Zalo")
      await loadAccounts()
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không thể tắt listener"))
    }
  }

  async function saveConversationLink(values: Record<string, unknown>) {
    if (!selectedConversation) return
    setLinking(true)
    try {
      const response = await api.patch(`/zalo/conversations/${selectedConversation.id}/link`, values)
      message.success("Đã cập nhật liên kết CRM")
      const updated = response.data.data as ZaloConversation
      setSelectedConversation(updated)
      setConversations((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (error) {
      message.error(getApiErrorMessage(error, "Không thể lưu liên kết CRM"))
    } finally {
      setLinking(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <Typography.Text className="eyebrow">Zalo integration</Typography.Text>
          <Typography.Title level={2}>Zalo Inbox</Typography.Title>
        </div>
        <Space>
          <Button icon={<PlusOutlined />} type="primary" onClick={openCreateAccount}>
            Thêm tài khoản Zalo
          </Button>
          <Button onClick={() => void loadAccounts()}>Làm mới</Button>
        </Space>
      </div>

      <div className="zalo-inbox-layout">
        <Card
          className="glass-card zalo-account-panel"
          title="Tài khoản nhân viên"
          extra={<Tag className="soft-tag">{accounts.length} tài khoản</Tag>}
        >
          {accountsLoading ? (
            <div className="zalo-empty-state"><Spin /></div>
          ) : accounts.length === 0 ? (
            <div className="zalo-empty-state"><Empty description="Chưa có tài khoản Zalo" /></div>
          ) : (
            <List
              dataSource={accounts}
              renderItem={(account) => (
                <List.Item
                  className={`zalo-account-item${selectedAccountId === account.id ? " active" : ""}`}
                  onClick={() => setSelectedAccountId(account.id)}
                  actions={[
                    <Button key="qr" icon={<QrcodeOutlined />} type="text" onClick={(event) => {
                      event.stopPropagation()
                      void startQrLogin(account)
                    }} />,
                    account.listenerActive ? (
                      <Button key="stop" icon={<StopOutlined />} type="text" onClick={(event) => {
                        event.stopPropagation()
                        void stopListener(account.id)
                      }} />
                    ) : (
                      <Button key="start" icon={<PlayCircleOutlined />} type="text" onClick={(event) => {
                        event.stopPropagation()
                        void startListener(account.id)
                      }} />
                    ),
                    <Button key="edit" icon={<EditOutlined />} type="text" onClick={(event) => {
                      event.stopPropagation()
                      openEditAccount(account)
                    }} />,
                    <Popconfirm
                      key="delete"
                      title="Xóa tài khoản Zalo này?"
                      onConfirm={() => void deleteAccount(account.id)}
                    >
                      <Button danger icon={<DeleteOutlined />} type="text" onClick={(event) => event.stopPropagation()} />
                    </Popconfirm>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar src={account.avatarUrl} icon={<MessageOutlined />} />}
                    description={
                      <Space direction="vertical" size={4}>
                        <Typography.Text strong>{account.label}</Typography.Text>
                        <Space size={6} wrap>
                          <Tag color={statusColor(account.connectionStatus)}>{statusLabel(account.connectionStatus)}</Tag>
                          {account.listenerActive ? <Tag color="green">Listener ON</Tag> : <Tag>Listener OFF</Tag>}
                        </Space>
                        <Typography.Text type="secondary">
                          {account.displayName || "Chưa đăng nhập"} {account.lastMessageAt ? `• ${formatDateTime(account.lastMessageAt)}` : ""}
                        </Typography.Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        <Card
          className="glass-card zalo-conversation-panel"
          title={selectedAccount ? `Hội thoại - ${selectedAccount.label}` : "Hội thoại"}
          extra={selectedAccount ? <Tag className="soft-tag">{conversations.length} hội thoại</Tag> : null}
        >
          {!selectedAccount ? (
            <div className="zalo-empty-state"><Empty description="Chọn một tài khoản để xem hội thoại" /></div>
          ) : conversationsLoading ? (
            <div className="zalo-empty-state"><Spin /></div>
          ) : conversations.length === 0 ? (
            <div className="zalo-empty-state"><Empty description="Chưa có hội thoại nào được lưu" /></div>
          ) : (
            <List
              dataSource={conversations}
              renderItem={(item) => (
                <List.Item
                  className={`zalo-conversation-item${selectedConversation?.id === item.id ? " active" : ""}`}
                  onClick={() => setSelectedConversation(item)}
                >
                  <List.Item.Meta
                    avatar={<Avatar>{item.threadType === "GROUP" ? "G" : "U"}</Avatar>}
                    title={
                      <Space size={8} wrap>
                        <Typography.Text strong>{item.displayName}</Typography.Text>
                        {item.customerId ? <Tag color="blue">Đã link KH</Tag> : null}
                        {item.leadId ? <Tag color="purple">Đã link Lead</Tag> : null}
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size={2}>
                        <Typography.Text type="secondary">{item.lastMessageText || "Chưa có nội dung preview"}</Typography.Text>
                        <Typography.Text type="secondary">
                          {item.lastMessageAt ? formatDateTime(item.lastMessageAt) : "Chưa có thời gian"}
                        </Typography.Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        <Card
          className="glass-card zalo-message-panel"
          title={selectedConversation ? selectedConversation.displayName : "Tin nhắn"}
          extra={selectedConversation ? <Tag className="soft-tag">{messagesRows.length} tin</Tag> : null}
        >
          {selectedConversation ? (
            <div className="zalo-link-card">
              <Space direction="vertical" style={{ width: "100%" }}>
                <Typography.Text strong>
                  <LinkOutlined /> Liên kết CRM
                </Typography.Text>
                <Space wrap style={{ width: "100%" }}>
                  <Select
                    allowClear
                    className="zalo-link-select"
                    options={customerOptions}
                    placeholder="Link khách hàng"
                    showSearch
                    value={selectedConversation.customerId}
                    onChange={(value) => setSelectedConversation((current) => (current ? { ...current, customerId: value } : current))}
                  />
                  <Select
                    allowClear
                    className="zalo-link-select"
                    options={leadOptions}
                    placeholder="Link lead"
                    showSearch
                    value={selectedConversation.leadId}
                    onChange={(value) => setSelectedConversation((current) => (current ? { ...current, leadId: value } : current))}
                  />
                  <Input
                    className="zalo-link-select"
                    placeholder="Số điện thoại để tạo lead sau này"
                    value={selectedConversation.contactPhone}
                    onChange={(event) =>
                      setSelectedConversation((current) =>
                        current ? { ...current, contactPhone: event.target.value } : current,
                      )
                    }
                  />
                  <Button
                    loading={linking}
                    type="primary"
                    onClick={() =>
                      void saveConversationLink({
                        customerId: selectedConversation.customerId,
                        leadId: selectedConversation.leadId,
                        contactPhone: selectedConversation.contactPhone,
                      })
                    }
                  >
                    Lưu liên kết
                  </Button>
                </Space>
              </Space>
            </div>
          ) : null}

          {!selectedConversation ? (
            <div className="zalo-empty-state"><Empty description="Chọn hội thoại để xem tin nhắn" /></div>
          ) : messagesLoading ? (
            <div className="zalo-empty-state"><Spin /></div>
          ) : messagesRows.length === 0 ? (
            <div className="zalo-empty-state"><Empty description="Chưa có tin nhắn nào được listener lưu lại" /></div>
          ) : (
            <div className="zalo-message-list">
              {messagesRows.map((item) => (
                <div key={item.id} className={`zalo-message-bubble ${item.direction === "OUTBOUND" ? "outbound" : "inbound"}`}>
                  <Typography.Text strong>{item.senderName || (item.direction === "OUTBOUND" ? "Nhân viên" : "Khách Zalo")}</Typography.Text>
                  <Typography.Paragraph>
                    {item.contentText || renderContentPreview(item.contentJson)}
                  </Typography.Paragraph>
                  <Typography.Text type="secondary">{formatDateTime(item.sentAt)}</Typography.Text>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal
        destroyOnHidden
        confirmLoading={submittingAccount}
        open={accountModalOpen}
        title={editingAccount ? "Cập nhật tài khoản Zalo" : "Tạo tài khoản Zalo"}
        onCancel={() => {
          setAccountModalOpen(false)
          setEditingAccount(null)
        }}
        onOk={() => void accountForm.submit()}
      >
        <Form form={accountForm} layout="vertical" onFinish={(values) => void saveAccount(values)}>
          <Form.Item label="Tên hiển thị nội bộ" name="label" rules={[{ required: true, message: "Nhập tên tài khoản" }]}>
            <Input placeholder="VD: Zalo TVV - Hà Nội 1" />
          </Form.Item>
          <Form.Item label="Nhân viên sở hữu" name="staffId">
            <Select allowClear options={staffOptions} showSearch />
          </Form.Item>
          <Form.Item label="Chi nhánh" name="branchId">
            <Select allowClear options={branchOptions} showSearch />
          </Form.Item>
          <Form.Item label="Tự bật listener sau khi đăng nhập" name="listenerEnabled" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item label="Ghi chú" name="note">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        footer={null}
        open={Boolean(qrAccountId)}
        title="Đăng nhập Zalo bằng QR"
        onCancel={() => {
          setQrAccountId(null)
          setQrState(null)
        }}
      >
        <div className="zalo-qr-modal">
          {qrState?.status === "QR_PENDING" && qrState.qrImage ? (
            <>
              <img alt="QR Zalo login" className="zalo-qr-image" src={qrState.qrImage} />
              <Typography.Paragraph>
                Mở Zalo trên điện thoại của nhân viên, vào quét QR để đăng nhập tài khoản vào hệ thống.
              </Typography.Paragraph>
            </>
          ) : qrState?.status === "QR_SCANNED" ? (
            <Space direction="vertical" style={{ width: "100%" }}>
              <Avatar size={72} src={qrState.scannedAvatar} />
              <Typography.Title level={4}>{qrState.scannedDisplayName || "Đã quét QR"}</Typography.Title>
              <Typography.Text type="secondary">Đang chờ Zalo xác nhận đăng nhập...</Typography.Text>
            </Space>
          ) : qrState?.status === "ERROR" ? (
            <Empty description={qrState.error || "Không thể đăng nhập Zalo"} />
          ) : (
            <div className="zalo-empty-state"><Spin /></div>
          )}
        </div>
      </Modal>
    </>
  )
}

function statusColor(status: string) {
  switch (status) {
    case "CONNECTED":
      return "green"
    case "QR_PENDING":
      return "gold"
    case "ERROR":
      return "red"
    default:
      return "default"
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "CONNECTED":
      return "Đã kết nối"
    case "QR_PENDING":
      return "Chờ quét QR"
    case "ERROR":
      return "Lỗi"
    default:
      return "Chưa kết nối"
  }
}

function formatDateTime(value?: string) {
  if (!value) return ""
  return dayjs(value).format("DD/MM/YYYY HH:mm")
}

function renderContentPreview(content?: Record<string, unknown>) {
  if (!content) return "[Tin nhắn đính kèm]"
  if (typeof content.title === "string") return content.title
  if (typeof content.description === "string") return content.description
  return "[Tin nhắn đính kèm]"
}
