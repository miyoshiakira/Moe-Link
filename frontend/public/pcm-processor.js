/**
 * AudioWorklet プロセッサ
 * マイク入力の Float32 サンプルを PCM16 (24kHz) に変換し、
 * ArrayBuffer としてメインスレッドに転送する。
 *
 * ※ AudioWorkletGlobalScope には btoa が存在しないため、
 *    base64 変換はメインスレッド側（useRealtimeCall.js）で行う。
 */
class PCMProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0]
    if (!input || !input[0] || input[0].length === 0) return true

    const float32 = input[0]
    const int16   = new Int16Array(float32.length)

    // Float32 [-1, 1] → Int16 [-32768, 32767]
    for (let i = 0; i < float32.length; i++) {
      const clamped = Math.max(-1, Math.min(1, float32[i]))
      int16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
    }

    // ArrayBuffer をメインスレッドへ転送（ゼロコピー）
    this.port.postMessage(int16.buffer, [int16.buffer])
    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)
