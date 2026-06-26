'use client'

import { useEffect, useRef, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'Xin chào! Tôi là trợ lý của phòng khám Thiện Chánh. Tôi có thể giúp bạn tìm hiểu dịch vụ hoặc đặt lịch hẹn. Bạn cần hỗ trợ gì?',
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    void checkEnabled()
  }, [])

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open, messages])

  async function checkEnabled() {
    try {
      const res = await fetch(`${API_URL}/public/chatbot/config`)
      if (res.ok) {
        const data = await res.json() as { data: { enabled: boolean } }
        setEnabled(data.data.enabled)
      }
    } catch {
      setEnabled(false)
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/public/chatbot/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      })
      const data = await res.json() as { data: { message: string } }
      setMessages((prev) => [...prev, { role: 'assistant', content: data.data.message }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  if (!enabled) return null

  return (
    <>
      <button
        className="chatbot-fab"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Mở chatbot tư vấn"
        title="Tư vấn & đặt lịch"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <div className="chatbot-avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <div className="chatbot-header-name">Trợ lý Thiện Chánh</div>
              <div className="chatbot-header-sub">Tư vấn & đặt lịch 24/7</div>
            </div>
            <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="Đóng">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`chatbot-msg chatbot-msg--${msg.role}`}>
                <div className="chatbot-bubble">{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="chatbot-msg chatbot-msg--assistant">
                <div className="chatbot-bubble chatbot-bubble--typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-footer">
            <textarea
              ref={inputRef}
              className="chatbot-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu hỏi... (Enter để gửi)"
              rows={1}
              disabled={loading}
            />
            <button
              className="chatbot-send"
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              aria-label="Gửi"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
