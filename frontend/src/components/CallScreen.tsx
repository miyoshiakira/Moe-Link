import { useState, useEffect } from 'react'
import { useRealtimeCall } from '../hooks/useRealtimeCall'

function useCallTimer(active: boolean): string {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!active) { setElapsed(0); return }
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [active])
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const s = String(elapsed % 60).padStart(2, '0')
  return `${m}:${s}`
}

interface AudioWaveProps {
  active: boolean
  color?: 'pink' | 'purple'
}

function AudioWave({ active, color = 'pink' }: AudioWaveProps) {
  const bars = [3, 5, 8, 6, 10, 7, 4, 9, 5, 3]
  const colorClass = color === 'pink' ? 'bg-pink-400' : 'bg-purple-400'
  return (
    <div className="flex items-end gap-1 h-10">
      {bars.map((h, i) => (
        <div
          key={i}
          className={`w-1 rounded-full ${colorClass} transition-all`}
          style={{
            height: active ? `${h * 3}px` : '4px',
            opacity: active ? 1 : 0.2,
            animation: active ? 'wave 0.8s ease-in-out infinite alternate' : 'none',
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
      <style>{`@keyframes wave { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }`}</style>
    </div>
  )
}

interface Props {
  onEnd: () => void
}

export default function CallScreen({ onEnd }: Props) {
  const {
    phase, isMuted, aiSpeaking, userSpeaking,
    aiTranscript, error, connect, disconnect, toggleMute,
  } = useRealtimeCall()

  const [isSpeaker, setIsSpeaker] = useState(true)
  const timer = useCallTimer(phase === 'connected')

  // 画面を開いたら即接続
  useEffect(() => {
    connect()
    return () => disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEnd = () => {
    disconnect()
    onEnd()
  }

  const statusLabel = {
    idle:       '待機中',
    connecting: '接続中…',
    connected:  '通話中',
    error:      'エラー',
  }[phase] ?? '…'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-[#1a0a2e] via-[#12082a] to-[#080414] px-8">
      {/* Top bar */}
      <div className="w-full flex items-center justify-between pt-6 pb-2">
        <button onClick={handleEnd} className="text-purple-400 hover:text-purple-200 transition-colors p-2 -ml-2">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
          </svg>
        </button>
        <span className="text-xs text-purple-500 tracking-widest uppercase">{statusLabel}</span>
        <div className="w-9" />
      </div>

      {/* Center */}
      <div className="flex flex-col items-center gap-6 flex-1 justify-center w-full max-w-sm">
        {/* Avatar with ripple */}
        <div className="relative flex items-center justify-center">
          {(phase === 'connecting' || aiSpeaking) && (
            <>
              <div className="absolute w-56 h-56 rounded-full border border-pink-500/20 animate-ping" style={{ animationDuration: '1.5s' }} />
              <div className="absolute w-44 h-44 rounded-full border border-pink-500/30 animate-ping" style={{ animationDuration: '2s' }} />
            </>
          )}
          <div className={`w-36 h-36 rounded-full border-4 overflow-hidden transition-all duration-500 ${
            aiSpeaking
              ? 'border-pink-400 shadow-[0_0_40px_rgba(244,114,182,0.6)]'
              : userSpeaking
              ? 'border-purple-400 shadow-[0_0_24px_rgba(167,139,250,0.5)]'
              : phase === 'connecting'
              ? 'border-purple-700/60 animate-pulse'
              : 'border-purple-700/50'
          }`}>
            <div className="w-full h-full bg-gradient-to-b from-[#2d1a4a] to-[#1a0f2e] flex items-center justify-center">
              <span className="text-6xl select-none">🌸</span>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-1 tracking-wide">モエ</h1>
          <p className="text-sm text-purple-400">AI companion · Azure GPT-4o Realtime</p>
        </div>

        {/* Status area */}
        <div className="text-center min-h-[60px] flex flex-col items-center justify-center gap-2">
          {error ? (
            <p className="text-red-400 text-sm text-center px-4">{error}</p>
          ) : phase === 'connecting' ? (
            <p className="text-purple-300 text-base animate-pulse">呼び出し中…</p>
          ) : aiSpeaking ? (
            <>
              <AudioWave active color="pink" />
              <p className="text-pink-300 text-sm">モエが話し中…</p>
            </>
          ) : userSpeaking ? (
            <>
              <AudioWave active color="purple" />
              <p className="text-purple-300 text-sm">あなたの声を聞いてるよ…</p>
            </>
          ) : (
            <p className="text-purple-300 text-xl font-mono tabular-nums">{timer}</p>
          )}
        </div>

        {/* AI transcript（ストリーミングテキスト） */}
        {aiTranscript && (
          <div className="w-full">
            {/* ラベル行 */}
            <div className="flex items-center gap-2 mb-2 px-1">
              <span className="text-sm leading-none">🌸</span>
              <span className="text-[10px] font-semibold tracking-[0.2em] text-pink-300 uppercase">Moe</span>
              <div className="h-px flex-1 bg-gradient-to-r from-pink-400/50 to-transparent" />
            </div>

            {/* 吹き出し本体 */}
            <div className="relative bg-gradient-to-br from-[#2a0f3d]/90 to-[#180820]/90 rounded-2xl rounded-tl-sm border border-pink-400/20 px-5 py-4 shadow-[0_0_24px_rgba(244,114,182,0.12),inset_0_1px_0_rgba(255,255,255,0.04)]">
              {/* 装飾クォート */}
              <span className="absolute top-2 left-3 text-3xl text-pink-400/15 font-serif leading-none select-none">"</span>

              <p className="relative text-sm text-purple-50 leading-relaxed pl-3 max-h-20 overflow-y-auto">
                {aiTranscript}
                {/* ストリーミングカーソル */}
                <span className="inline-block w-[2px] h-[0.9em] bg-pink-400 ml-0.5 align-text-bottom rounded-full animate-pulse" />
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="w-full pb-10">
        <div className="flex items-center justify-center gap-8">
          {/* Mute */}
          <button onClick={toggleMute} className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
              isMuted ? 'bg-white/20 border-2 border-white/30' : 'bg-white/10 border border-white/10 hover:bg-white/15'
            }`}>
              {isMuted ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                  <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                  <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                </svg>
              )}
            </div>
            <span className="text-xs text-white/60">{isMuted ? 'ミュート中' : 'ミュート'}</span>
          </button>

          {/* End call */}
          <button onClick={handleEnd} className="flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center shadow-[0_4px_20px_rgba(239,68,68,0.5)] transition-all duration-200 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-white rotate-[135deg]">
                <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs text-white/60">通話終了</span>
          </button>

          {/* Speaker */}
          <button onClick={() => setIsSpeaker(s => !s)} className="flex flex-col items-center gap-2">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
              isSpeaker ? 'bg-white/10 border border-white/10 hover:bg-white/15' : 'bg-white/20 border-2 border-white/30'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
              </svg>
            </div>
            <span className="text-xs text-white/60">{isSpeaker ? 'スピーカー' : 'イヤホン'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
