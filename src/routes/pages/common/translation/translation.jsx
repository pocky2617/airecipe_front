// src/routes/pages/common/translation/translation.jsx
import React from "react";
import "./translation.css"; // 같은 폴더의 CSS

export default function Translation({ value, onChange, className = "" }) {
  const options = [
    { code: "ko", label: "한국어 (KR)" },
    { code: "en", label: "English (EN)" },
    { code: "ja", label: "日本語 (JP)" },
    { code: "zh-cn", label: "中文 (CN)" },
  ];

  return (
    <div className={`lang-switch ${className}`}>
      <div className="lang-switch__group" role="tablist" aria-label="언어 선택">
        {options.map((opt) => {
          const active = value === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              className={`lang-chip ${active ? "is-active" : ""}`}
              aria-pressed={active}
              onClick={() => onChange?.(opt.code)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
