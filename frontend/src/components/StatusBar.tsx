interface Props {
  isListening: boolean
  isSpeaking: boolean
}

export default function StatusBar({ isListening, isSpeaking }: Props) {
  const status = isSpeaking
    ? { label: 'AIが話し中', color: 'text-pink-400',  dot: 'bg-pink-400' }
    : isListening
    ? { label: '音声認識中…', color: 'text-purple-300', dot: 'bg-purple-400' }
    : { label: '接続済み',    color: 'text-green-400',  dot: 'bg-green-400' }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${status.dot} ${isListening || isSpeaking ? 'animate-pulse' : ''}`} />
        <span className={`text-xs ${status.color}`}>{status.label}</span>
      </div>

      {/* Mock latency */}
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-purple-600">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm.75-10.25a.75.75 0 0 0-1.5 0v4.69L5.03 7.22a.75.75 0 0 0-1.06 1.06l2.5 2.5a.75.75 0 0 0 1.06 0l2.5-2.5a.75.75 0 1 0-1.06-1.06L8.75 9.44V4.75Z" clipRule="evenodd" />
        </svg>
        <span>~120ms</span>
      </div>

      {/* Azure badge */}
      <div className="hidden sm:flex items-center gap-1.5 bg-blue-950/40 border border-blue-700/30 rounded-full px-2.5 py-1 text-xs text-blue-300">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
        Azure OpenAI
      </div>
    </div>
  )
}
