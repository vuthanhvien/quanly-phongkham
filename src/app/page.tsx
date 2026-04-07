"use client";

import React, { useState, useRef, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { tokens as t } from "@/components/ui/tokens";
import { Building2, Send, Bot, User, Sparkles } from "lucide-react";
import Link from "next/link";

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const pulse = keyframes`
  0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
  40%            { transform: scale(1); opacity: 1; }
`;

// ─── Layout ───────────────────────────────────────────────────────────────────

const Page = styled.div`
  min-height: 100vh;
  background: ${t.colorBgNeutral};
  display: flex;
  flex-direction: column;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 56px;
  background: white;
  border-bottom: 1px solid ${t.colorBorder};
  position: sticky;
  top: 0;
  z-index: 10;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const LogoIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${t.radiusMd};
  background: ${t.colorBrandBold};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  svg { width: 18px; height: 18px; }
`;

const LogoName = styled.span`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeLg};
  font-weight: 700;
  color: ${t.colorText};
`;

const AdminLink = styled(Link)`
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  color: ${t.colorTextSubtle};
  text-decoration: none;
  padding: 6px 14px;
  border: 1px solid ${t.colorBorder};
  border-radius: ${t.radiusMd};
  transition: all ${t.durationFast};
  &:hover {
    color: ${t.colorText};
    border-color: ${t.colorBorderInputHovered};
    background: ${t.colorBgNeutral};
  }
`;

const Hero = styled.div`
  text-align: center;
  padding: 48px 24px 32px;
`;

const HeroBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: ${t.colorBrandSubtlest};
  border: 1px solid ${t.colorBrandSubtle};
  border-radius: 100px;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  font-weight: 500;
  color: ${t.colorBrandBold};
  margin-bottom: 16px;
  svg { width: 13px; height: 13px; }
`;

const HeroTitle = styled.h1`
  margin: 0 0 10px;
  font-family: ${t.fontFamily};
  font-size: 28px;
  font-weight: 800;
  color: ${t.colorText};
  letter-spacing: -0.5px;
`;

const HeroSub = styled.p`
  margin: 0;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${t.colorTextSubtle};
`;

// ─── Chat Container ───────────────────────────────────────────────────────────

const ChatWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  padding: 0 16px 24px;
  gap: 0;
`;

const MessageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0 16px;
  flex: 1;
`;

const MessageRow = styled.div<{ $isUser: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  flex-direction: ${(p) => (p.$isUser ? "row-reverse" : "row")};
  animation: ${fadeIn} 0.2s ease;
`;

const Avatar = styled.div<{ $isUser: boolean }>`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(p) => (p.$isUser ? t.colorBrandBold : "white")};
  border: 1px solid ${(p) => (p.$isUser ? t.colorBrandBold : t.colorBorder)};
  color: ${(p) => (p.$isUser ? "white" : t.colorText)};
  svg { width: 14px; height: 14px; }
`;

const Bubble = styled.div<{ $isUser: boolean }>`
  max-width: 75%;
  padding: 10px 14px;
  border-radius: ${(p) => (p.$isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px")};
  background: ${(p) => (p.$isUser ? t.colorBrandBold : "white")};
  border: 1px solid ${(p) => (p.$isUser ? t.colorBrandBold : t.colorBorder)};
  color: ${(p) => (p.$isUser ? "white" : t.colorText)};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  line-height: 1.55;
  white-space: pre-wrap;
`;

const TypingDots = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 14px 16px;
  background: white;
  border: 1px solid ${t.colorBorder};
  border-radius: 16px 16px 16px 4px;
  width: fit-content;
`;

const Dot = styled.span<{ $i: number }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${t.colorTextSubtle};
  display: inline-block;
  animation: ${pulse} 1.2s ease-in-out ${(p) => p.$i * 0.2}s infinite;
`;

// ─── Input Bar ────────────────────────────────────────────────────────────────

const InputBar = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-end;
  background: white;
  border: 1.5px solid ${t.colorBorderInput};
  border-radius: 16px;
  padding: 10px 10px 10px 16px;
  transition: border-color ${t.durationFast};
  &:focus-within {
    border-color: ${t.colorBorderFocused};
    box-shadow: 0 0 0 2px ${t.colorBrandSubtlest};
  }
`;

const ChatInput = styled.textarea`
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${t.colorText};
  resize: none;
  min-height: 24px;
  max-height: 120px;
  line-height: 1.5;
  &::placeholder { color: ${t.colorTextSubtlest}; }
`;

const SendBtn = styled.button<{ $active: boolean }>`
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  background: ${(p) => (p.$active ? t.colorBrandBold : t.colorBgNeutral)};
  color: ${(p) => (p.$active ? "white" : t.colorTextSubtlest)};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${(p) => (p.$active ? "pointer" : "default")};
  transition: background ${t.durationFast}, color ${t.durationFast};
  flex-shrink: 0;
  svg { width: 16px; height: 16px; }
  &:hover { background: ${(p) => (p.$active ? t.colorBrand : t.colorBgNeutral)}; }
`;

const Hint = styled.p`
  text-align: center;
  font-family: ${t.fontFamily};
  font-size: 11px;
  color: ${t.colorTextSubtlest};
  margin: 8px 0 0;
`;

// ─── Quick replies ────────────────────────────────────────────────────────────

const QuickReplies = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`;

const QuickBtn = styled.button`
  padding: 6px 14px;
  border-radius: 100px;
  border: 1px solid ${t.colorBorder};
  background: white;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  color: ${t.colorText};
  cursor: pointer;
  transition: all ${t.durationFast};
  &:hover { border-color: ${t.colorBrandBold}; color: ${t.colorBrandBold}; background: ${t.colorBrandSubtlest}; }
`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Xin chào! Tôi là trợ lý đặt lịch của Phòng Khám. Tôi có thể giúp bạn đặt lịch tư vấn hoặc thực hiện dịch vụ thẩm mỹ. Bạn muốn tìm hiểu về dịch vụ gì?",
};

const QUICK_REPLIES = [
  "Tư vấn nâng mũi",
  "Cắt mí mắt",
  "Tiêm filler / botox",
  "Trẻ hóa da",
  "Đặt lịch ngay",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiMessages, setApiMessages] = useState<{ role: string; content: unknown }[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setLoading(true);

    const newApiMsgs = [...apiMessages, { role: "user", content: trimmed }];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newApiMsgs }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages([...newMessages, { role: "assistant", content: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại." }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: data.text }]);
        setApiMessages(data.messages);
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Không thể kết nối. Vui lòng kiểm tra lại đường truyền." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const showQuickReplies = messages.length === 1 && !loading;

  return (
    <Page>
      <Header>
        <Logo>
          <LogoIcon><Building2 /></LogoIcon>
          <LogoName>Phòng Khám</LogoName>
        </Logo>
        <AdminLink href="/admin/login">Đăng nhập quản lý</AdminLink>
      </Header>

      <Hero>
        <HeroBadge>
          <Sparkles />
          Trợ lý AI đặt lịch 24/7
        </HeroBadge>
        <HeroTitle>Đặt lịch tư vấn thẩm mỹ</HeroTitle>
        <HeroSub>Chat với trợ lý AI để tìm hiểu dịch vụ và đặt lịch hẹn trong vài giây</HeroSub>
      </Hero>

      <ChatWrapper>
        <MessageList>
          {messages.map((msg, i) => (
            <MessageRow key={i} $isUser={msg.role === "user"}>
              <Avatar $isUser={msg.role === "user"}>
                {msg.role === "user" ? <User /> : <Bot />}
              </Avatar>
              <Bubble $isUser={msg.role === "user"}>{msg.content}</Bubble>
            </MessageRow>
          ))}

          {loading && (
            <MessageRow $isUser={false}>
              <Avatar $isUser={false}><Bot /></Avatar>
              <TypingDots>
                <Dot $i={0} /><Dot $i={1} /><Dot $i={2} />
              </TypingDots>
            </MessageRow>
          )}

          <div ref={bottomRef} />
        </MessageList>

        {showQuickReplies && (
          <QuickReplies>
            {QUICK_REPLIES.map((q) => (
              <QuickBtn key={q} onClick={() => send(q)}>{q}</QuickBtn>
            ))}
          </QuickReplies>
        )}

        <InputBar>
          <ChatInput
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(); }}
            onKeyDown={handleKey}
            placeholder="Nhập tin nhắn... (Enter để gửi)"
            rows={1}
          />
          <SendBtn $active={!!input.trim() && !loading} onClick={() => send(input)}>
            <Send />
          </SendBtn>
        </InputBar>
        <Hint>Shift + Enter để xuống dòng · Trợ lý AI có thể mắc lỗi</Hint>
      </ChatWrapper>
    </Page>
  );
}
