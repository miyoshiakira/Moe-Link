export default function VoiceButton({ isListening, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
        isListening
          ? 'bg-gradient-to-br from-pink-500 to-purple-600 shadow-[0_0_20px_rgba(244,114,182,0.5)]'
          : 'bg-purple-950/60 border border-purple-700/40 hover:border-purple-500/60 hover:bg-purple-900/40'
      }`}
      title={isListening ? 'タップして送信' : 'マイクをオン'}
    >
      {/* Pulse ring when listening */}
      {isListening && (
        <span className="absolute inset-0 rounded-full bg-pink-500/30 animate-ping" />
      )}

      {/* Mic icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`w-5 h-5 relative z-10 transition-colors ${isListening ? 'text-white' : 'text-purple-400'}`}
      >
        <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
        <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
      </svg>
    </button>
  )
}
