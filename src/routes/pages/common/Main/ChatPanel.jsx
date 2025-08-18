import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

/** 백엔드 챗 API 엔드포인트 */
const CHAT_API = "http://localhost:8000/api/chatbot";

export default function ChatPanel({
  open,
  onClose,
  logoSrc,
  storageKey = "snapcook_chat_history_v1", // 대화 내역 저장 키
  usedKey = "snapcook_chat_used_v1",      // 사용 이력(인트로 스킵) 플래그
}) {
  const defaultGreeting = "안녕하세요! 무엇을 도와드릴까요? 😊";

  // 초기 로드: 저장된 대화가 있으면 복구
  const [messages, setMessages] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) return arr;
      }
    } catch {}
    return [{ role: "assistant", content: defaultGreeting }];
  });

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bodyRef = useRef(null);

  // ESC 닫기만 유지 (바디 스크롤 잠금 제거)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // 새 메시지 추가 시 채팅창 하단으로
  useEffect(() => {
    if (!open) return;
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages]);

  // 대화 저장
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  // 의미 있는 대화가 있으면 사용 이력 플래그 세팅
  useEffect(() => {
    try {
      const meaningful = messages.some(
        (m) =>
          m.role === "user" ||
          (m.role === "assistant" && m.content && m.content !== defaultGreeting)
      );
      if (meaningful) localStorage.setItem(usedKey, "1");
    } catch {}
  }, [messages, usedKey]);

  if (!open) return null;

  const onSubmit = async (e) => {
    e.preventDefault();
    const userText = text.trim();
    if (!userText || sending) return;

    const userMsg = { role: "user", content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setText("");
    setSending(true);

    // 어시스턴트 자리 미리 확보
    const idx = messages.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        const errBody = ct.includes("application/json")
          ? JSON.stringify(await res.json())
          : await res.text();
        setMessages((prev) =>
          replaceAt(prev, idx, {
            role: "assistant",
            content: formatError(errBody) || `서버 오류 (HTTP ${res.status})`,
          })
        );
        return;
      }

      let replyText = "";
      if (ct.includes("application/json")) {
        const data = await res.json();
        replyText = data.reply ?? data.text ?? data.answer ?? "";
        if (!replyText && data.detail) {
          replyText =
            typeof data.detail === "string"
              ? data.detail
              : JSON.stringify(data.detail);
        }
      } else {
        replyText = await res.text();
      }
      if (!replyText) replyText = "빈 응답입니다.";

      setMessages((prev) =>
        replaceAt(prev, idx, { role: "assistant", content: replyText })
      );
    } catch {
      setMessages((prev) =>
        replaceAt(prev, idx, {
          role: "assistant",
          content: "죄송합니다. 응답 중 오류가 발생했습니다.",
        })
      );
    } finally {
      setSending(false);
    }
  };

  // 확인 없이 즉시 초기화
  const handleReset = () => {
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(usedKey);
    } catch {}
    setMessages([{ role: "assistant", content: defaultGreeting }]);
  };

  return createPortal(
    // ✅ 레이어 클릭 통과(닫기 없음) — 메인 스크롤 유지 목적
    <div className="chat-panel-layer">
      <div className="chat-panel">
        {/* 헤더 */}
        <div className="chat-panel__header">
          <button className="chat-panel__back" onClick={onClose} aria-label="닫기">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <img className="chat-panel__logo" src={logoSrc} alt="SnapCook Bot" />
          <div className="chat-panel__title">SNAPCOOK Chat</div>

          <div style={{ flex: 1 }} />

          {/* 되돌리기(초기화) 아이콘 버튼 */}
          <button
            type="button"
            className="chat-panel__reset"
            onClick={handleReset}
            aria-label="대화 초기화"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              {/* 반시계 방향 되돌리기 */}
              <path
                d="M21 12a9 9 0 1 1-3.3-6.9"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 3v6h-6"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="chat-panel__body" ref={bodyRef}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`chat-msg ${
                m.role === "user" ? "chat-msg--user" : "chat-msg--assistant"
              }`}
            >
              {m.role === "assistant" ? (
                <div className="md">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              ) : (
                m.content
              )}
            </div>
          ))}

          {sending && (
            <div className="chat-typing">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          )}
        </div>

        {/* 입력 바 */}
        <form className="chat-panel__inputbar" onSubmit={onSubmit}>
          <input
            type="text"
            placeholder="물어 보고 싶은걸 입력해 주세요."
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            className="chat-panel__send"
            aria-label="보내기"
            disabled={sending}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 12l18-8-8 18-2-7-8-3z" fill="currentColor" />
            </svg>
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}

/* ===== 유틸 ===== */
function replaceAt(arr, index, value) {
  return arr.map((v, i) => (i === index ? value : v));
}
function formatError(raw) {
  try {
    const obj = JSON.parse(raw);
    if (obj && obj.detail) {
      return typeof obj.detail === "string" ? obj.detail : JSON.stringify(obj.detail);
    }
    return JSON.stringify(obj);
  } catch {
    return raw;
  }
}
