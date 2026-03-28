const MEMORIES = [
  { icon: '🌸', text: '昨日、公園でお散歩した' },
  { icon: '🍓', text: '好物はイチゴ' },
  { icon: '🎮', text: '一緒にゲームした記憶' },
]

export default function CharacterPanel({ isSpeaking, isListening }) {
  return (
    <aside className="w-72 flex-shrink-0 flex flex-col border-r border-purple-900/40 bg-black/10">
      {/* Character display */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Glow effect */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 ${isSpeaking ? 'opacity-100' : 'opacity-0'}`}
          style={{
            background: 'radial-gradient(ellipse at center 60%, rgba(192,132,252,0.15) 0%, transparent 70%)',
          }}
        />

        {/* Avatar */}
        <div className="relative mb-4">
          <div
            className={`w-40 h-40 rounded-full border-2 overflow-hidden relative transition-all duration-300 ${
              isSpeaking
                ? 'border-pink-400 shadow-[0_0_24px_rgba(244,114,182,0.5)]'
                : isListening
                ? 'border-purple-400 shadow-[0_0_16px_rgba(167,139,250,0.4)]'
                : 'border-purple-700/60'
            }`}
          >
            {/* Placeholder avatar — will be replaced with actual character art */}
            <div className="w-full h-full bg-gradient-to-b from-[#2d1a4a] to-[#1a0f2e] flex items-center justify-center">
              <span className="text-7xl select-none">🌸</span>
            </div>
          </div>

          {/* Speaking animation rings */}
          {isSpeaking && (
            <>
              <div className="absolute inset-0 rounded-full border border-pink-400/40 animate-ping" style={{ animationDuration: '1.2s' }} />
              <div className="absolute -inset-2 rounded-full border border-pink-400/20 animate-ping" style={{ animationDuration: '1.8s' }} />
            </>
          )}

          {/* Listening animation */}
          {isListening && (
            <div className="absolute inset-0 rounded-full border border-purple-400/50 animate-pulse" />
          )}
        </div>

        {/* Character name */}
        <h2 className="text-xl font-bold text-pink-200 mb-1">モエ</h2>
        <p className="text-xs text-purple-400 mb-3">AI companion · v0.1</p>

        {/* Emotion badge */}
        <div className="flex items-center gap-2 bg-purple-950/50 border border-purple-700/30 rounded-full px-3 py-1.5 text-xs">
          <span>{isSpeaking ? '😊' : isListening ? '👂' : '😴'}</span>
          <span className="text-purple-300">
            {isSpeaking ? '話し中…' : isListening ? '聞いてるだぞ…' : '待機中'}
          </span>
        </div>
      </div>

      {/* RAG memory panel */}
      <div className="p-4 border-t border-purple-900/40">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-xs font-medium text-purple-400 uppercase tracking-wider">記憶 (RAG)</span>
        </div>
        <ul className="space-y-2">
          {MEMORIES.map((m, i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-purple-300 bg-purple-950/40 rounded-lg px-3 py-2 border border-purple-800/30">
              <span>{m.icon}</span>
              <span>{m.text}</span>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-purple-600 mt-2 text-center">Azure AI Search より</p>
      </div>
    </aside>
  )
}
