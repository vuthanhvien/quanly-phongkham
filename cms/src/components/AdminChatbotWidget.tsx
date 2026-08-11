import { AudioOutlined, CloseOutlined, SendOutlined } from '@ant-design/icons'
import { Button, Input, Popconfirm, Spin, Tooltip, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useLocation, useNavigate } from 'react-router-dom'
import remarkGfm from 'remark-gfm'
import { api } from '../api'
import giscatIcon from '../assets/giscat-catbot.png'

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

interface SpeechRecognitionResultEvent extends Event {
  results: { [index: number]: { [index: number]: { transcript: string } } }
}

interface SpeechRecognitionInstance {
  lang: string
  interimResults: boolean
  onerror: (() => void) | null
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
  onend: (() => void) | null
  start: () => void
}

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: 'Chào bạn, tôi là **GISCAT** — trợ lý CMS. Tôi có thể hướng dẫn theo màn hình hiện tại, tra cứu/check dữ liệu, hỗ trợ báo cáo và chuẩn bị thao tác nhập liệu.',
}

export function AdminChatbotWidget() {
  const location = useLocation()
  const navigate = useNavigate()
  const [enabled, setEnabled] = useState(false)
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [conversationId, setConversationId] = useState(() => readConversationId())
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<any>(null)

  useEffect(() => {
    api.get('/admin/chatbot/config')
      .then(async (response) => {
        const isEnabled = Boolean(response.data?.data?.enabled)
        setEnabled(isEnabled)
        if (!isEnabled || !conversationId) return
        const saved = await api.get(`/admin/chatbot/conversations/${conversationId}`)
        const savedMessages = saved.data?.data?.messages
        if (Array.isArray(savedMessages) && savedMessages.length > 0) setMessages(savedMessages)
      })
      .catch(() => setEnabled(false))
  }, [conversationId])

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
        conversationId,
      })
      const data = response.data?.data || {}
      if (data.conversationId) {
        const nextConversationId = String(data.conversationId)
        setConversationId(nextConversationId)
        saveConversationId(nextConversationId)
      }
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

  function transcribeVoice() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      setMessages((current) => [...current, { role: 'assistant', content: 'Trình duyệt này chưa hỗ trợ nhập giọng nói. Hãy dùng Chrome hoặc Edge và cho phép quyền micro.' }])
      return
    }
    const recognition: SpeechRecognitionInstance = new Recognition()
    recognition.lang = 'vi-VN'
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim()
      if (transcript) setInput((current) => current ? `${current} ${transcript}` : transcript)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    setListening(true)
    recognition.start()
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
        <section className="admin-chatbot-panel" aria-label="GISCAT — trợ lý CMS">
          <header className="admin-chatbot-header">
            <span className="admin-chatbot-avatar"><img alt="GISCAT" src={giscatIcon} /></span>
            <div>
              <Typography.Text strong>GISCAT</Typography.Text>
              <Typography.Text type="secondary">Dữ liệu, báo cáo & hướng dẫn</Typography.Text>
            </div>
            <Button aria-label="Đóng GISCAT" icon={<CloseOutlined />} onClick={() => setOpen(false)} size="small" type="text" />
          </header>
          <div className="admin-chatbot-context">Đang xem: <code>{location.pathname || '/'}</code></div>
          <div className="admin-chatbot-messages">
            {messages.map((message, index) => (
              <div className={`admin-chatbot-message admin-chatbot-message--${message.role}`} key={`${message.role}-${index}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
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
            <Tooltip title={listening ? 'Đang nghe…' : 'Nhập bằng giọng nói'}>
              <Button icon={<AudioOutlined />} loading={listening} onClick={transcribeVoice} />
            </Tooltip>
            <Tooltip title="Gửi">
              <Button disabled={!input.trim() || loading} icon={<SendOutlined />} onClick={() => void send()} type="primary" />
            </Tooltip>
          </div>
        </section>
      )}
      <Tooltip title="GISCAT — Trợ lý CMS">
        <Button aria-label="Mở GISCAT" className="admin-chatbot-fab" icon={open ? <CloseOutlined /> : <img alt="" src={giscatIcon} />} onClick={() => setOpen((value) => !value)} shape="circle" type="primary" />
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

function conversationStorageKey() {
  try {
    const user = JSON.parse(localStorage.getItem('clinic-user') || '{}') as { id?: string }
    return `clinic-admin-chatbot-conversation:${user.id || 'current'}`
  } catch {
    return 'clinic-admin-chatbot-conversation:current'
  }
}

function readConversationId() {
  try {
    return localStorage.getItem(conversationStorageKey()) || ''
  } catch {
    return ''
  }
}

function saveConversationId(value: string) {
  try {
    localStorage.setItem(conversationStorageKey(), value)
  } catch {
    // Storage is optional; the server still keeps the conversation.
  }
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}
