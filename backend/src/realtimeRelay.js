import WebSocket from 'ws'
import { config } from './config.js'
import { SESSION_CONFIG } from './characterData.js'
import { searchMemory } from './rag.js'

/**
 * ブラウザ WebSocket ↔ Azure OpenAI Realtime API のリレー
 *
 * フロントエンドとのメッセージ仕様:
 *
 * [フロント → バックエンド]
 *   { type: "audio.append", data: "<base64 PCM16 24kHz>" }
 *
 * [バックエンド → フロント]
 *   { type: "audio.delta", data: "<base64 PCM16>" }   ─ AI音声チャンク
 *   { type: "audio.done" }                             ─ AI音声1ターン完了
 *   { type: "transcript.ai",  text: "..." }           ─ AIテキスト（ストリーム）
 *   { type: "transcript.user", text: "..." }          ─ ユーザー音声認識結果
 *   { type: "status", state: "listening"|"thinking"|"speaking"|"idle" }
 *   { type: "error", message: "..." }
 */
export function attachRelay(browserWs) {
  // Azure OpenAI Realtime API の WebSocket URL を構築
  // Preview 形式: /openai/realtime?api-version=2025-04-01-preview&deployment=<name>
  const { endpoint, apiKey, deployment } = config.azureOpenAI
  const baseWss = endpoint.replace(/^https/, 'wss').replace(/\/$/, '')
  const azureWsUrl =
    `${baseWss}/openai/realtime` +
    `?api-version=2025-04-01-preview&deployment=${deployment}`

  const azureWs = new WebSocket(azureWsUrl, {
    headers: { 'api-key': apiKey },
  })

  // 関数呼び出しの引数を蓄積するバッファ
  // call_id → { name, args }
  const pendingCalls = new Map()
  const callNames = new Map() // call_id → function name (output_item.added で取得)

  // ──────────────────────────────────────────
  // Azure → ブラウザ
  // ──────────────────────────────────────────
  azureWs.on('open', () => {
    console.log('[Relay] Azure OpenAI Realtime API に接続しました')

    // キャラクター設定を送信
    azureWs.send(JSON.stringify({
      type: 'session.update',
      session: SESSION_CONFIG,
    }))
  })

  azureWs.on('message', async (raw) => {
    let event
    try {
      event = JSON.parse(raw)
    } catch {
      return
    }

    // audio.delta 以外は全てログ出力
    if (event.type !== 'response.audio.delta') {
      console.log(`[Azure→] ${event.type}`)
    }

    switch (event.type) {
      // ── セッション準備完了 ──
      case 'session.created':
        console.log('[Relay] セッション確立 ID:', event.session?.id)
        send(browserWs, { type: 'status', state: 'idle' })
        break
      case 'session.updated':
        send(browserWs, { type: 'status', state: 'idle' })
        break

      // ── VAD：ユーザーが話し始めた ──
      case 'input_audio_buffer.speech_started':
        console.log('[VAD] 発話検知')
        send(browserWs, { type: 'status', state: 'listening' })
        break

      // ── VAD：ユーザーが話し終わった ──
      case 'input_audio_buffer.speech_stopped':
        console.log('[VAD] 発話終了 → 応答生成開始')
        send(browserWs, { type: 'status', state: 'thinking' })
        break

      // ── AI の応答生成が始まった ──
      case 'response.created':
        console.log('[AI] 応答生成中...')
        send(browserWs, { type: 'status', state: 'speaking' })
        break

      // ── AI 音声チャンク ──
      case 'response.audio.delta':
        send(browserWs, { type: 'audio.delta', data: event.delta })
        break

      // ── AI 音声 1 ターン完了 ──
      case 'response.audio.done':
        send(browserWs, { type: 'audio.done' })
        break

      // ── AI テキスト（ストリーム） ──
      case 'response.audio_transcript.delta':
        send(browserWs, { type: 'transcript.ai', text: event.delta })
        break

      // ── ユーザー音声認識結果 ──
      case 'conversation.item.input_audio_transcription.completed':
        send(browserWs, { type: 'transcript.user', text: event.transcript })
        break

      // ── 関数呼び出し：output_item で name を記録 ──
      case 'response.output_item.added':
        if (event.item?.type === 'function_call') {
          callNames.set(event.item.call_id, event.item.name)
        }
        break

      // ── 関数呼び出し：引数ストリームを蓄積 ──
      case 'response.function_call_arguments.delta': {
        const { call_id, delta } = event
        const current = pendingCalls.get(call_id) ?? { name: callNames.get(call_id) ?? '', args: '' }
        pendingCalls.set(call_id, { ...current, args: current.args + delta })
        break
      }

      // ── 関数呼び出し：引数確定 ──
      case 'response.function_call_arguments.done': {
        const { call_id, arguments: finalArgs } = event
        const entry = pendingCalls.get(call_id) ?? { name: callNames.get(call_id) ?? '', args: '' }
        pendingCalls.set(call_id, { ...entry, args: finalArgs })
        break
      }

      // ── response 完了：pending な関数呼び出しをここで一括処理 ──
      case 'response.done': {
        if (pendingCalls.size === 0) {
          send(browserWs, { type: 'status', state: 'idle' })
          break
        }

        console.log(`[Relay] ${pendingCalls.size} 件の RAG 検索を実行します`)

        for (const [callId, { name, args }] of pendingCalls) {
          let result
          try {
            const parsed = JSON.parse(args)
            console.log(`[RAG] ${name}("${parsed.query}", "${parsed.index}")`)
            result = await searchMemory(parsed.query, parsed.index)
            console.log(`[RAG] 結果: ${result.slice(0, 80)}…`)
          } catch (err) {
            console.error('[RAG] エラー:', err.message)
            result = `エラー: ${err.message}`
          }

          // 関数の結果を会話に追加
          azureWs.send(JSON.stringify({
            type: 'conversation.item.create',
            item: {
              type: 'function_call_output',
              call_id: callId,
              output: result,
            },
          }))
        }

        pendingCalls.clear()
        callNames.clear()

        // RAG 結果を踏まえて応答を再生成
        azureWs.send(JSON.stringify({ type: 'response.create' }))
        break
      }

      // ── エラー ──
      case 'error':
        console.error('[Azure] エラー:', event.error)
        send(browserWs, { type: 'error', message: event.error?.message ?? '不明なエラー' })
        break

      default:
        // その他のイベントはデバッグログのみ
        // console.debug('[Azure]', event.type)
        break
    }
  })

  azureWs.on('error', (err) => {
    console.error('[Azure] WebSocket エラー:', err.message)
    send(browserWs, { type: 'error', message: `Azure 接続エラー: ${err.message}` })
  })

  azureWs.on('close', (code, reason) => {
    console.log(`[Azure] 切断 (${code}): ${reason}`)
    if (browserWs.readyState === WebSocket.OPEN) {
      browserWs.close()
    }
  })

  // ──────────────────────────────────────────
  // ブラウザ → Azure
  // ──────────────────────────────────────────
  browserWs.on('message', (raw) => {
    let msg
    try {
      msg = JSON.parse(raw)
    } catch {
      return
    }

    if (azureWs.readyState !== WebSocket.OPEN) return

    if (msg.type === 'audio.append') {
      // PCM16 音声チャンクをそのまま Azure へ転送
      azureWs.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: msg.data,
      }))
    }
  })

  browserWs.on('close', () => {
    console.log('[Relay] ブラウザが切断しました')
    if (azureWs.readyState === WebSocket.OPEN) {
      azureWs.close()
    }
  })

  browserWs.on('error', (err) => {
    console.error('[Browser] WebSocket エラー:', err.message)
  })
}

// ──────────────────────────────────────────
// ヘルパー
// ──────────────────────────────────────────
function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload))
  }
}
