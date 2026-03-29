import { useEffect, useRef } from 'react'
import type { Message } from '../types'

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-end gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-xs flex-shrink-0 mb-0.5">
          🌸
        </div>
        <div className="bg-purple-950/60 border border-purple-700/30 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

function ChatMessage({ msg }: { msg: Message }) {
  const isAi = msg.role === 'ai'
  return (
    <div className={`flex mb-4 ${isAi ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex items-end gap-2 max-w-[75%] ${isAi ? '' : 'flex-row-reverse'}`}>
        {isAi && (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-xs flex-shrink-0 mb-0.5">
            🌸
          </div>
        )}
        <div>
          <div
            className={`px-4 py-2.5 text-sm leading-relaxed ${
              isAi
                ? 'bg-purple-950/60 border border-purple-700/30 rounded-2xl rounded-bl-sm text-purple-100'
                : 'bg-gradient-to-br from-pink-600/80 to-purple-600/80 border border-pink-500/30 rounded-2xl rounded-br-sm text-white'
            }`}
          >
            {msg.text}
          </div>
          <p className={`text-[10px] text-purple-600 mt-1 ${isAi ? 'text-left ml-1' : 'text-right mr-1'}`}>
            {msg.time}
          </p>
        </div>
      </div>
    </div>
  )
}

interface Props {
  messages: Message[]
  isSpeaking: boolean
}

export default function ChatPanel({ messages, isSpeaking }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSpeaking])

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4">
      <div className="max-w-2xl mx-auto">
        {/* Date separator */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-purple-900/40" />
          <span className="text-xs text-purple-600">今日</span>
          <div className="flex-1 h-px bg-purple-900/40" />
        </div>

        {messages.map(msg => (
          <ChatMessage key={msg.id} msg={msg} />
        ))}

        {isSpeaking && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
