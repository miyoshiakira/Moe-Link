import { useState, useRef, useCallback } from 'react'

const BACKEND_WS = 'ws://localhost:3001/realtime'
const SAMPLE_RATE = 24000 // Azure OpenAI Realtime API が期待するサンプルレート

export type Phase = 'idle' | 'connecting' | 'connected' | 'error'

type ServerMessage =
  | { type: 'status';           state: string }
  | { type: 'audio.delta';      data: string }
  | { type: 'audio.done' }
  | { type: 'transcript.ai';    text: string }
  | { type: 'transcript.user';  text: string }
  | { type: 'error';            message: string }

/**
 * バックエンド WebSocket を通じて Azure OpenAI Realtime API と通信するフック
 *
 * 返り値:
 *   phase        : 'idle' | 'connecting' | 'connected' | 'error'
 *   isMuted      : boolean
 *   aiSpeaking   : boolean
 *   userSpeaking : boolean
 *   aiTranscript : string（ストリーミングで積み上がる）
 *   userTranscript: string
 *   error        : string | null
 *   connect()    : 通話開始
 *   disconnect() : 通話終了
 *   toggleMute() : ミュート切り替え
 */
export function useRealtimeCall() {
  const [phase,          setPhase]          = useState<Phase>('idle')
  const [isMuted,        setIsMuted]        = useState(false)
  const [aiSpeaking,     setAiSpeaking]     = useState(false)
  const [userSpeaking,   setUserSpeaking]   = useState(false)
  const [aiTranscript,   setAiTranscript]   = useState('')
  const [userTranscript, setUserTranscript] = useState('')
  const [error,          setError]          = useState<string | null>(null)

  const wsRef           = useRef<WebSocket | null>(null)
  const audioCtxRef     = useRef<AudioContext | null>(null)
  const streamRef       = useRef<MediaStream | null>(null)
  const isMutedRef      = useRef(false)          // closure から最新値を参照するため
  const audioChunksRef  = useRef<string[]>([])   // 1ターン分の音声チャンクを蓄積
  const scheduledEndRef = useRef(0)              // 次の再生開始時刻（AudioContext.currentTime）

  // ────────────────────────────────────────
  // サーバーメッセージのハンドラ
  // ────────────────────────────────────────
  const handleMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'status':
        setAiSpeaking(msg.state === 'speaking')
        setUserSpeaking(msg.state === 'listening')
        if (msg.state === 'idle') {
          setAiSpeaking(false)
          setUserSpeaking(false)
        }
        break

      case 'audio.delta':
        // 1ターン分のチャンクを蓄積
        audioChunksRef.current.push(msg.data)
        // チャンクが溜まったら随時デコードして再生（低遅延化）
        if (audioChunksRef.current.length % 4 === 0) {
          flushAudioChunks(false)
        }
        break

      case 'audio.done':
        // ターン終了 → 残りのチャンクを全て再生
        flushAudioChunks(true)
        audioChunksRef.current = []
        break

      case 'transcript.ai':
        setAiTranscript(prev => prev + msg.text)
        break

      case 'transcript.user':
        setUserTranscript(msg.text)
        break

      case 'error':
        setError(msg.message)
        console.error('[useRealtimeCall] サーバーエラー:', msg.message)
        break
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ────────────────────────────────────────
  // PCM16 base64 チャンクをデコードして再生
  // ────────────────────────────────────────
  function flushAudioChunks(flush: boolean) {
    const ctx = audioCtxRef.current
    if (!ctx || audioChunksRef.current.length === 0) return

    const chunks = flush ? [...audioChunksRef.current] : audioChunksRef.current.splice(0, 4)
    if (chunks.length === 0) return

    // base64 → Uint8Array
    const combined = chunks.join('')
    let binary: string
    try {
      binary = atob(combined)
    } catch {
      return
    }
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

    // PCM16 → Float32
    const samples = new Float32Array(bytes.byteLength / 2)
    const view    = new DataView(bytes.buffer)
    for (let i = 0; i < samples.length; i++) {
      samples[i] = view.getInt16(i * 2, true) / 32768
    }

    // AudioBuffer に変換して再生（連続した AudioBufferSource をキューイング）
    const buffer = ctx.createBuffer(1, samples.length, SAMPLE_RATE)
    buffer.copyToChannel(samples, 0)

    const source     = ctx.createBufferSource()
    source.buffer    = buffer
    source.connect(ctx.destination)

    const now      = ctx.currentTime
    const startAt  = Math.max(now, scheduledEndRef.current)
    source.start(startAt)
    scheduledEndRef.current = startAt + buffer.duration
  }

  // ────────────────────────────────────────
  // 通話開始
  // ────────────────────────────────────────
  const connect = useCallback(async () => {
    setPhase('connecting')
    setError(null)
    setAiTranscript('')
    setUserTranscript('')
    audioChunksRef.current = []
    scheduledEndRef.current = 0

    try {
      // マイク取得
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      // AudioContext を 24kHz で作成（Azure Realtime API と同じサンプルレート）
      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
      audioCtxRef.current = ctx

      // ブラウザのオートプレイポリシーで suspended になる場合があるため強制 resume
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      console.log('[AudioContext] state:', ctx.state, '/ sampleRate:', ctx.sampleRate)

      // AudioWorklet をロード
      await ctx.audioWorklet.addModule('/pcm-processor.js')

      const micSource  = ctx.createMediaStreamSource(stream)
      const worklet    = new AudioWorkletNode(ctx, 'pcm-processor')
      micSource.connect(worklet)

      // WebSocket 接続
      const ws = new WebSocket(BACKEND_WS)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[WS] バックエンド接続完了 / AudioContext state:', ctx.state)
        setPhase('connected')

        // AudioContext がまだ suspended なら resume を再試行
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => console.log('[AudioContext] resume 完了'))
        }

        let audioSentCount = 0
        // マイク音声を WebSocket 経由でバックエンドへ送信
        // e.data は ArrayBuffer（ワークレットから転送）→ メインスレッドで base64 変換
        worklet.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
          if (ws.readyState === WebSocket.OPEN && !isMutedRef.current) {
            const bytes = new Uint8Array(e.data)
            let binary = ''
            const chunkSize = 8192
            for (let i = 0; i < bytes.length; i += chunkSize) {
              binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)))
            }
            const base64 = btoa(binary)
            if (audioSentCount < 5) {
              console.log('[Audio] 送信中... count:', ++audioSentCount)
            }
            ws.send(JSON.stringify({ type: 'audio.append', data: base64 }))
          }
        }
      }

      ws.onmessage = (e: MessageEvent<string>) => {
        try {
          handleMessage(JSON.parse(e.data) as ServerMessage)
        } catch { /* ignore parse errors */ }
      }

      ws.onerror = () => {
        setError('WebSocket 接続に失敗しました。バックエンドが起動しているか確認してください。')
        setPhase('error')
      }

      ws.onclose = (event: CloseEvent) => {
        console.log('[WS] 切断:', event.code, event.reason, '/ wasClean:', event.wasClean)
        setPhase('idle')
        setAiSpeaking(false)
        setUserSpeaking(false)
      }

    } catch (err) {
      console.error('[useRealtimeCall] 接続エラー:', err)
      setError(err instanceof Error ? err.message : String(err))
      setPhase('error')
      cleanup()
    }
  }, [handleMessage])

  // ────────────────────────────────────────
  // 通話終了
  // ────────────────────────────────────────
  const disconnect = useCallback(() => {
    cleanup()
    setPhase('idle')
    setAiSpeaking(false)
    setUserSpeaking(false)
  }, [])

  function cleanup() {
    wsRef.current?.close()
    streamRef.current?.getTracks().forEach(t => t.stop())
    audioCtxRef.current?.close()
    wsRef.current       = null
    streamRef.current   = null
    audioCtxRef.current = null
  }

  // ────────────────────────────────────────
  // ミュート切り替え
  // ────────────────────────────────────────
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      isMutedRef.current = !prev
      return !prev
    })
  }, [])

  return {
    phase,
    isMuted,
    aiSpeaking,
    userSpeaking,
    aiTranscript,
    userTranscript,
    error,
    connect,
    disconnect,
    toggleMute,
  }
}
