import { MessageOutlined, ReloadOutlined } from '@ant-design/icons'
import { Button, Card, Drawer, Space, Table, Tag, Typography, message } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from '../api'

interface ConversationSummary {
  id: string
  title?: string
  userName: string
  updatedAt: string
  latestMessage: string
}

interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
}

export function ChatbotHistoryPage({ embedded = false }: { embedded?: boolean }) {
  const [items, setItems] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ConversationSummary>()
  const [messages, setMessages] = useState<StoredMessage[]>([])
  const [detailLoading, setDetailLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/chatbot/conversations')
      setItems(response.data?.data || [])
    } catch {
      message.error('Không thể tải lịch sử GIS AI')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function openConversation(item: ConversationSummary) {
    setSelected(item)
    setDetailLoading(true)
    try {
      const response = await api.get(`/admin/chatbot/conversations/${item.id}`)
      setMessages(response.data?.data?.messages || [])
    } catch {
      message.error('Không thể tải nội dung hội thoại')
      setMessages([])
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <>
      {!embedded && <div className="page-header">
        <div>
          <Typography.Title level={3}>Lịch sử GIS AI</Typography.Title>
        </div>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>Tải lại</Button>
      </div>}

      <Card className="glass-card" title={embedded ? 'Hội thoại của nhân viên với GIS AI' : undefined} extra={embedded ? <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>Tải lại</Button> : undefined}>
        <Table<ConversationSummary>
          columns={[
            { title: 'Người dùng', dataIndex: 'userName', key: 'userName', width: 220, render: (value) => <Typography.Text strong>{value}</Typography.Text> },
            { title: 'Chủ đề', dataIndex: 'title', key: 'title', render: (value) => value || 'Hội thoại GIS AI' },
            { title: 'Tin nhắn gần nhất', dataIndex: 'latestMessage', key: 'latestMessage', ellipsis: true, render: (value) => <Typography.Text>{value}</Typography.Text> },
            { title: 'Cập nhật', dataIndex: 'updatedAt', key: 'updatedAt', width: 180, render: (value) => value ? new Date(value).toLocaleString('vi-VN') : '—' },
            { title: '', key: 'action', width: 110, render: (_, item) => <Button icon={<MessageOutlined />} onClick={() => void openConversation(item)} size="small">Xem chat</Button> },
          ]}
          dataSource={items}
          loading={loading}
          pagination={{ pageSize: 20 }}
          rowKey="id"
        />
      </Card>

      <Drawer destroyOnClose onClose={() => setSelected(undefined)} open={Boolean(selected)} title={selected ? `GIS AI · ${selected.userName}` : 'GIS AI'} width={560}>
        <div className="giscat-history-messages">
          {detailLoading ? <Typography.Text type="secondary">Đang tải hội thoại…</Typography.Text> : messages.map((item, index) => (
            <div className={`giscat-history-message giscat-history-message--${item.role}`} key={index}>
              <Tag color={item.role === 'user' ? 'blue' : 'purple'}>{item.role === 'user' ? selected?.userName : 'GIS AI'}</Tag>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.content}</ReactMarkdown>
            </div>
          ))}
        </div>
      </Drawer>
    </>
  )
}
