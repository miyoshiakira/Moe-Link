/**
 * AudioWorklet プロセッサ
 * マイク入力の Float32 サンプルを PCM16 (24kHz) に変換し、
 * base64 文字列としてメインスレッドに送信する。
 *
 * Azure OpenAI GPT-4o Realtime API は PCM16 / 24000Hz を期待している。
 * AudioContext を { sampleRate: 24000 } で作成することでリサンプリングを回避する。
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

    // ArrayBuffer → base64
    const bytes  = new Uint8Array(int16.buffer)
    let binary   = ''
    const chunk  = 8192
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    }

    this.port.postMessage(btoa(binary))
    return true
  }
}

registerProcessor('pcm-processor', PCMProcessor)
