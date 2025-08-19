// src/App/App.js (또는 App.jsx)
import Router from "../routes";
import GlobalChat from "../routes/pages/common/Chatbot/GlobalChat";

function App() {
  return (
    <>
      <Router />
      {/* 전역 챗봇 오버레이: 모든 라우트 위에서 동작 */}
      <GlobalChat />
    </>
  );
}

export default App;
