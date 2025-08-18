// src/routes/pages/common/Main/GlobalChat.jsx
import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import ChatDock from "./ChatDock";
import ChatPanel from "./ChatPanel";

import botIcon from "./chatbot-logo.png";
import headerIcon from "./chat-intro-v2.png";
import introImage from "./chat-intro-v2.png";

import "./Main.css";

// 기존 히스토리 키(그대로 유지)
const CHAT_HISTORY_KEY = "snapcook_chat_history_v1";
// ✅ 사용 여부만 별도로 기록
const CHAT_USED_KEY = "snapcook_chat_used_v1";

export default function GlobalChat() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isChatPanelOpen, setIsChatPanelOpen] = useState(false);

  // ✅ “한 번이라도 사용했는지”만 본다
  const hasUsed = useCallback(() => {
    try {
      return localStorage.getItem(CHAT_USED_KEY) === "1";
    } catch {
      return false;
    }
  }, []);

  const handleFabClick = () => {
    if (hasUsed()) {
      // 사용 이력이 있으면 바로 패널
      setIsChatPanelOpen(true);
      setIsChatOpen(false);
    } else {
      // 처음이면 인트로(도킹)
      setIsChatOpen(true);
    }
  };

  return (
    <>
      <ChatDock
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onStart={() => {
          setIsChatOpen(false);
          setIsChatPanelOpen(true);
        }}
        imageSrc={introImage}
      />

      <ChatPanel
        open={isChatPanelOpen}
        onClose={() => setIsChatPanelOpen(false)}
        logoSrc={headerIcon}
        storageKey={CHAT_HISTORY_KEY}
        usedKey={CHAT_USED_KEY}  // ✅ 추가
      />

      {createPortal(
        <button
          type="button"
          className="sc-fab fixed-fab"
          aria-label="챗 열기"
          onClick={handleFabClick}
        >
          <img
            src={botIcon}
            alt="SnapCook Bot"
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        </button>,
        document.body
      )}
    </>
  );
}
