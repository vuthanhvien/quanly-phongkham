import { AudioOutlined, CloseOutlined, PlusOutlined, SendOutlined, StopOutlined } from '@ant-design/icons'
import { Button, Input, Popconfirm, Spin, Tooltip, Typography } from 'antd'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useLocation, useNavigate } from 'react-router-dom'
import remarkGfm from 'remark-gfm'
import { api } from '../api'
import giscatIcon from '../assets/giscat-catbot.png'
import { requestCmsDataRefresh } from '../utils/dataRefresh'

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
  results: { length: number; [index: number]: { [index: number]: { transcript: string } } }
}

interface SpeechRecognitionInstance {
  lang: string
  interimResults: boolean
  continuous: boolean
  onerror: (() => void) | null
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

const WELCOME: ChatMessage = {
  role: 'assistant',
  content: 'Chào bạn, tôi là **GIS AI** — trợ lý CMS. Tôi có thể hướng dẫn theo màn hình hiện tại, tra cứu/check dữ liệu, hỗ trợ báo cáo và chuẩn bị thao tác nhập liệu.',
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
  const [bubblePosition, setBubblePosition] = useState<{ side: 'left' | 'right'; topPercent: number }>()
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number }>()
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<any>(null)
  const dragRef = useRef<{ pointerId: number; originX: number; originY: number; startX: number; startY: number; width: number; height: number; moved: boolean; x: number; y: number } | undefined>(undefined)
  const justDraggedRef = useRef(false)
  const voiceRecognitionRef = useRef<SpeechRecognitionInstance | undefined>(undefined)
  const voiceActiveRef = useRef(false)
  const voiceTranscriptRef = useRef('')
  const voicePrefixRef = useRef('')
  const dockedLeft = bubblePosition?.side === 'left'
  const panelBelow = Boolean(bubblePosition && bubblePosition.topPercent < 45)
  const panelHeight = bubblePosition
    ? Math.max(150, Math.floor(
      panelBelow
        ? window.innerHeight * (1 - bubblePosition.topPercent / 100) - 78
        : window.innerHeight * (bubblePosition.topPercent / 100) - 78,
    ))
    : undefined

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

  async function send(textOverride?: string) {
    const content = (textOverride ?? input).trim()
    if (!content || loading) return
    const nextMessages = [...messages, { role: 'user' as const, content }]
    setMessages(nextMessages)
    setInput('')
    voiceTranscriptRef.current = ''
    voicePrefixRef.current = ''
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
      if (data.reload) requestCmsDataRefresh(getPageContext(location.pathname, location.search).resource)
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: 'Không thể kết nối trợ lý lúc này. Vui lòng thử lại.' }])
    } finally {
      setLoading(false)
    }
  }

  function transcribeVoice() {
    if (listening) {
      stopVoiceListening(true)
      return
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) {
      setMessages((current) => [...current, { role: 'assistant', content: 'Trình duyệt này chưa hỗ trợ nhập giọng nói. Hãy dùng Chrome hoặc Edge và cho phép quyền micro.' }])
      return
    }
    const recognition: SpeechRecognitionInstance = new Recognition()
    recognition.lang = 'vi-VN'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.onresult = (event) => {
      if (!voiceActiveRef.current) return
      const transcript = Array.from({ length: event.results.length }, (_, index) => event.results[index]?.[0]?.transcript?.trim())
        .filter(Boolean)
        .join(' ')
      const nextText = `${voicePrefixRef.current}${transcript}`.trim()
      voiceTranscriptRef.current = nextText
      setInput(nextText)
    }
    recognition.onerror = () => stopVoiceListening(false)
    recognition.onend = () => {
      if (!voiceActiveRef.current) return
      window.setTimeout(() => {
        if (!voiceActiveRef.current) return
        try { recognition.start() } catch { /* recognition is already restarting */ }
      }, 250)
    }
    voiceRecognitionRef.current = recognition
    voiceActiveRef.current = true
    voicePrefixRef.current = input.trim() ? `${input.trim()} ` : ''
    voiceTranscriptRef.current = input.trim()
    setListening(true)
    recognition.start()
  }

  function stopVoiceListening(sendAfterStop: boolean) {
    voiceActiveRef.current = false
    try { voiceRecognitionRef.current?.stop() } catch { /* it may already be stopped */ }
    setListening(false)
    const capturedText = voiceTranscriptRef.current.trim()
    if (sendAfterStop && capturedText) {
      window.setTimeout(() => void send(capturedText), 0)
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
      requestCmsDataRefresh(getPageContext(location.pathname, location.search).resource)
    } catch {
      setMessages((current) => [...current, { role: 'assistant', content: 'Không thể thực hiện thao tác. Hãy kiểm tra quyền hoặc dữ liệu và thử lại.' }])
    }
  }

  function startNewConversation() {
    setConversationId('')
    clearConversationId()
    setMessages([WELCOME])
    setInput('')
  }

  function startBubbleDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    dragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX - rect.left,
      originY: event.clientY - rect.top,
      startX: rect.left,
      startY: rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
      x: rect.left,
      y: rect.top,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function moveBubble(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const x = clamp(event.clientX - drag.originX, 12, window.innerWidth - drag.width - 12)
    const y = clamp(event.clientY - drag.originY, 12, window.innerHeight - drag.height - 12)
    drag.x = x
    drag.y = y
    drag.moved ||= Math.abs(x - drag.startX) > 3 || Math.abs(y - drag.startY) > 3
    setDragPosition({ x, y })
  }

  function endBubbleDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const side = drag.x + drag.width / 2 < window.innerWidth / 2 ? 'left' : 'right'
    const y = clamp(drag.y, 12, window.innerHeight - drag.height - 12)
    setDragPosition(undefined)
    setBubblePosition({ side, topPercent: (y / window.innerHeight) * 100 })
    justDraggedRef.current = drag.moved
    dragRef.current = undefined
  }

  if (!enabled) return null

  return (
    <div
      className={`admin-chatbot${dockedLeft ? ' admin-chatbot--left' : ''}${panelBelow ? ' admin-chatbot--panel-below' : ''}`}
      style={dragPosition
        ? { left: dragPosition.x, top: dragPosition.y, right: 'auto', bottom: 'auto' }
        : bubblePosition
          ? { [bubblePosition.side]: 12, top: `clamp(12px, ${bubblePosition.topPercent}%, calc(100vh - 64px))`, right: bubblePosition.side === 'left' ? 'auto' : 12, bottom: 'auto' }
          : undefined}
    >
      {open && (
        <section className="admin-chatbot-panel" aria-label="GIS AI — trợ lý CMS" style={panelHeight ? { height: panelHeight } : undefined}>
          <header className="admin-chatbot-header">
            <span className="admin-chatbot-avatar"><img alt="GIS AI" src={giscatIcon} /></span>
            <div>
              <Typography.Text strong>GIS AI</Typography.Text>
              <Typography.Text type="secondary">Dữ liệu, báo cáo & hướng dẫn</Typography.Text>
            </div>
            <Tooltip title="Cuộc trò chuyện mới">
              <Button aria-label="Tạo chat mới" icon={<PlusOutlined />} onClick={startNewConversation} size="small" type="text" />
            </Tooltip>
            <Button aria-label="Đóng GIS AI" icon={<CloseOutlined />} onClick={() => setOpen(false)} size="small" type="text" />
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
                      zIndex={1401}
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
              autoSize={{ minRows: 2, maxRows: 5 }}
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
            <Tooltip title={listening ? 'Dừng nghe và gửi' : 'Bắt đầu nhập bằng giọng nói'}>
              <Button danger={listening} icon={listening ? <StopOutlined /> : <AudioOutlined />} onClick={transcribeVoice}>
                {listening ? 'Dừng & gửi' : undefined}
              </Button>
            </Tooltip>
            <Tooltip title="Gửi">
              <Button disabled={!input.trim() || loading} icon={<SendOutlined />} onClick={() => void send()} type="primary" />
            </Tooltip>
          </div>
        </section>
      )}
      <Tooltip title="GIS AI — Trợ lý CMS">
        <Button
          aria-label="Mở GIS AI"
          className="admin-chatbot-fab"
          icon={open ? <CloseOutlined /> : <img alt="" src={giscatIcon} />}
          onClick={() => {
            if (justDraggedRef.current) {
              justDraggedRef.current = false
              return
            }
            setOpen((value) => !value)
          }}
          onPointerDown={startBubbleDrag}
          onPointerMove={moveBubble}
          onPointerUp={endBubbleDrag}
          shape="circle"
          type="primary"
        />
      </Tooltip>
    </div>
  )
}

function getPageContext(path: string, search: string) {
  const segments = path.split('/').filter(Boolean)
  const resource = segments[0] || ''
  const query = Object.fromEntries(new URLSearchParams(search))
  const recordId = segments.length > 1 && !['import', 'new'].includes(segments[1])
    ? segments[1]
    : String(query.detail || query.recordId || query.id || '')
  return { path, resource, recordId, query }
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

function clearConversationId() {
  try {
    localStorage.removeItem(conversationStorageKey())
  } catch {
    // Storage is optional; a new conversation will be created on the next message.
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance
  }
}
