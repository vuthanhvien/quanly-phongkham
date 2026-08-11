import { CloseOutlined, RobotOutlined, SendOutlined } from '@ant-design/icons'
import { Button, Input, Popconfirm, Spin, Tooltip, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { api } from '../api'

type ChatRole = 'user' | 'assistant'

interface ChatMessage {
  role: ChatRole
  content: string
  actions?: ChatAction[]
}

interface ChatAction {
  type: 'navigate' | 'mutation'
  label: string
  summary?: string
  path?: string
  operation?: 'create' | 'update' | 'archive'
  resource?: string
  recordId?: string
  values?: Record<string, unknown>
}

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: 'Chào bạn, tôi là trợ lý CMS. Tôi có thể hướng dẫn theo màn hình hiện tại, tra cứu/check dữ liệu, hỗ trợ báo cáo và chuẩn bị thao tác nhập liệu.',
}

export function AdminChatbotWidget() {
  const location = useLocation()
  const navigate = useNavigate()
  const [enabled, setEnabled] = useState(false)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<any>(null)

  useEffect(() => {
    api.get('/admin/chatbot/config')
      .then((response) => setEnabled(Boolean(response.data?.data?.enabled)))
      .catch(() => setEnabled(false))
  }, [])

  useEffect(() => {
    if (!open) return
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
    window.setTimeout(() => inputRef.current?.focus?.(), 100)
  }, [messages, open])

  async function send() {
    const content = input.trim()
    if (!content || loading) return
    const nextMessages = [...messages, { role: 'user' as const, content }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    try {
      const response = await api.post('/admin/chatbot/chat', {
        messages: nextMessages.map(({ role, content: messageContent }) => ({ role, content: messageContent })),
        context: getPageContext(location.pathname, location.search),
      })
      const data = response.data?.data || {}
      setMessages((current) => [...current, {
        role: 'assistant',
        content: String(data.message || 'Tôi chưa nhận được phản hồi. Vui lòng thử lại.'),
        actions: Array.isArray(data.actions) ? data.actions : [],
      }])
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: 'Không thể kết nối trợ lý lúc này. Vui lòng thử lại.' }])
    } finally {
      setLoading(false)
    }
  }

  async function execute(action: ChatAction) {
    if (action.type === 'navigate' && action.path) {
      navigate(action.path)
      setOpen(false)
      return
    }
    try {
      await api.post('/admin/chatbot/action', action)
      setMessages((current) => [...current, { role: 'assistant', content: `Đã thực hiện: ${action.summary || action.label}.` }])
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: 'Không thể thực hiện thao tác. Hãy kiểm tra quyền hoặc dữ liệu và thử lại.' }])
    }
  }

  if (!enabled) return null

  return (
    <div className="admin-chatbot">
      {open && (
        <section className="admin-chatbot-panel" aria-label="Trợ lý CMS">
          <header className="admin-chatbot-header">
            <span className="admin-chatbot-avatar"><RobotOutlined /></span>
            <div>
              <Typography.Text strong>Trợ lý CMS</Typography.Text>
              <Typography.Text type="secondary">Dữ liệu, báo cáo & hướng dẫn</Typography.Text>
            </div>
            <Button aria-label="Đóng trợ lý" icon={<CloseOutlined />} onClick={() => setOpen(false)} size="small" type="text" />
          </header>
          <div className="admin-chatbot-context">Đang xem: <code>{location.pathname || '/'}</code></div>
          <div className="admin-chatbot-messages">
            {messages.map((message, index) => (
              <div className={`admin-chatbot-message admin-chatbot-message--${message.role}`} key={`${message.role}-${index}`}>
                <div>{message.content}</div>
                {message.actions?.map((action, actionIndex) => (
                  action.type === 'navigate' ? (
                    <Button block key={actionIndex} onClick={() => void execute(action)} size="small">{action.label}</Button>
                  ) : (
                    <Popconfirm
                      cancelText="Hủy"
                      description={action.summary || 'Thao tác này sẽ ghi thay đổi vào hệ thống.'}
                      key={actionIndex}
                      okButtonProps={{ danger: action.operation === 'archive' }}
                      okText={action.operation === 'archive' ? 'Lưu trữ' : 'Xác nhận'}
                      onConfirm={() => void execute(action)}
                      title="Xác nhận thao tác dữ liệu"
                    >
                      <Button block danger={action.operation === 'archive'} size="small" type="primary">{action.label}</Button>
                    </Popconfirm>
                  )
                ))}
              </div>
            ))}
            {loading && <div className="admin-chatbot-message admin-chatbot-message--assistant"><Spin size="small" /> Đang xử lý…</div>}
            <div ref={endRef} />
          </div>
          <div className="admin-chatbot-compose">
            <Input.TextArea
              autoSize={{ minRows: 1, maxRows: 4 }}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void send()
                }
              }}
              placeholder="Ví dụ: kiểm tra lịch hẹn hôm nay…"
              ref={inputRef}
              value={input}
            />
            <Tooltip title="Gửi">
              <Button disabled={!input.trim() || loading} icon={<SendOutlined />} onClick={() => void send()} type="primary" />
            </Tooltip>
          </div>
        </section>
      )}
      <Tooltip title="Trợ lý CMS">
        <Button aria-label="Mở trợ lý CMS" className="admin-chatbot-fab" icon={open ? <CloseOutlined /> : <RobotOutlined />} onClick={() => setOpen((value) => !value)} shape="circle" type="primary" />
      </Tooltip>
    </div>
  )
}

function getPageContext(path: string, search: string) {
  const segments = path.split('/').filter(Boolean)
  const resource = segments[0] || ''
  const recordId = segments.length > 1 && !['import', 'new'].includes(segments[1]) ? segments[1] : ''
  return { path, resource, recordId, query: Object.fromEntries(new URLSearchParams(search)) }
}
