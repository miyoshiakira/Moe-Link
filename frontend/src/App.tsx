import { useState } from 'react'
import CharacterPanel from './components/CharacterPanel'
import ChatPanel from './components/ChatPanel'
import VoiceButton from './components/VoiceButton'
import StatusBar from './components/StatusBar'
import CallScreen from './components/CallScreen'
import type { Message } from './types'
import './index.css'

const MOCK_MESSAGES: Message[] = [
  { id: 1, role: 'ai', text: 'おかえりなさい！今日も会えて嬉しいよ〜♪', time: '14:32' },
  { id: 2, role: 'user', text: '今日の調子はどう？', time: '14:32' },
  { id: 3, role: 'ai', text: 'バッチリだよ！ちょうど昨日みんなで行った公園のこと考えてたとこなの。楽しかったね〜', time: '14:33' },
]

export default function App() {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking]   = useState(false)
  const [messages, setMessages]       = useState<Message[]>(MOCK_MESSAGES)
  const [inputText, setInputText]     = useState('')
  const [inCall, setInCall]           = useState(false)

  const handleVoiceToggle = () => {
    if (isListening) {
      setIsListening(false)
      setTimeout(() => {
        setIsSpeaking(true)
        const now = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        setMessages(prev => [
          ...prev,
          { id: Date.now(),     role: 'user', text: '（音声入力）', time: now },
          { id: Date.now() + 1, role: 'ai',   text: 'ふふっ、それは面白いね！もっと聞かせてほしいな〜♪', time: now },
        ])
        setTimeout(() => setIsSpeaking(false), 2500)
      }, 500)
    } else {
      setIsListening(true)
    }
  }

  const handleSendText = () => {
    if (!inputText.trim()) return
    const now = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', text: inputText, time: now }])
    setInputText('')
    setTimeout(() => {
      setIsSpeaking(true)
      setMessages(prev => [
        ...prev,
        { id: Date.now(), role: 'ai', text: 'なるほどね〜！それって昨日の話と関係あるのかな？詳しく教えてほしいな♪', time: now },
      ])
      setTimeout(() => setIsSpeaking(false), 2500)
    }, 800)
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#0f0a1e] via-[#1a0f2e] to-[#0d1526]">
      {inCall && <CallScreen onEnd={() => setInCall(false)} />}
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-purple-900/40 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-sm font-bold text-white">M</div>
          <span className="text-lg font-semibold text-purple-100 tracking-wide">Moe-Link</span>
          <span className="text-xs text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded-full border border-purple-700/40">β</span>
        </div>
        <div className="flex items-center gap-3">
          <StatusBar isListening={isListening} isSpeaking={isSpeaking} />
          <button
            onClick={() => setInCall(true)}
            className="flex items-center gap-2 bg-green-600/80 hover:bg-green-500/90 border border-green-500/40 text-white text-sm font-medium px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95 shadow-[0_2px_12px_rgba(34,197,94,0.3)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" clipRule="evenodd" />
            </svg>
            通話
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <CharacterPanel isSpeaking={isSpeaking} isListening={isListening} />

        <div className="flex flex-col flex-1 min-w-0">
          <ChatPanel messages={messages} isSpeaking={isSpeaking} />

          {/* Input area */}
          <div className="p-4 border-t border-purple-900/40 bg-black/20 backdrop-blur-sm">
            <div className="flex items-center gap-3 max-w-2xl mx-auto">
              <VoiceButton isListening={isListening} onToggle={handleVoiceToggle} />
              <div className="flex-1 flex items-center gap-2 bg-purple-950/40 border border-purple-700/40 rounded-2xl px-4 py-2.5 focus-within:border-purple-500/60 transition-colors">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendText()}
                  placeholder="テキストでも話しかけてね…"
                  className="flex-1 bg-transparent text-sm text-purple-100 placeholder:text-purple-600 outline-none"
                />
                <button
                  onClick={handleSendText}
                  disabled={!inputText.trim()}
                  className="text-purple-400 hover:text-purple-200 disabled:opacity-30 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M3.105 2.289a.75.75 0 00-.826.95l1.414 4.925A1.5 1.5 0 005.135 9.25h6.115a.75.75 0 010 1.5H5.135a1.5 1.5 0 00-1.442 1.086l-1.414 4.926a.75.75 0 00.826.95 28.896 28.896 0 0015.293-7.154.75.75 0 000-1.115A28.897 28.897 0 003.105 2.289z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
