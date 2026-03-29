import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import cors from 'cors'
import { config } from './config.js'
import { attachRelay } from './realtimeRelay.js'

// タイムスタンプ付きログ（全モジュール共通）
const _origLog   = console.log.bind(console)
const _origError = console.error.bind(console)
const _origWarn  = console.warn.bind(console)
function ts() {
  return new Date().toLocaleTimeString('ja-JP', { hour12: false,
    hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
console.log   = (...a) => _origLog(`[${ts()}]`, ...a)
console.error = (...a) => _origError(`[${ts()}]`, ...a)
console.warn  = (...a) => _origWarn(`[${ts()}]`, ...a)

const app = express()
const httpServer = createServer(app)

// ──────────────────────────────────────────
// ミドルウェア
// ──────────────────────────────────────────
app.use(cors({ origin: config.frontendUrl }))
app.use(express.json())

// ──────────────────────────────────────────
// REST エンドポイント
// ──────────────────────────────────────────

// ヘルスチェック（フロントエンドが接続前に確認する用）
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    deployment: config.azureOpenAI.deployment,
    searchEndpoint: config.azureSearch.endpoint,
  })
})

// RAG データのプレビュー（フロントの記憶パネル表示用）
app.get('/api/memories', async (_req, res) => {
  // 静的なモック。本番では Azure AI Search から取得する。
  // seedSearch.js 実行後に動的取得に切り替えられる。
  res.json([
    { icon: '🌸', category: 'char-profile', title: '好物', content: 'イチゴが大好きだよ！毎日食べたいくらい' },
    { icon: '😊', category: 'char-profile', title: '口癖', content: '「〜だよ」「〜だね」「〜かな」を自然に使う' },
    { icon: '🌳', category: 'user-memory',  title: '昨日の出来事', content: '公園をお散歩した' },
  ])
})

// ──────────────────────────────────────────
// WebSocket サーバー（/realtime）
// ──────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer, path: '/realtime' })

wss.on('connection', (browserWs, req) => {
  const ip = req.socket.remoteAddress
  console.log(`[Server] ブラウザ接続: ${ip}`)
  attachRelay(browserWs)
})

// ──────────────────────────────────────────
// 起動
// ──────────────────────────────────────────
httpServer.listen(config.port, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   Moe-Link Backend                    ║
  ║   http://localhost:${config.port}              ║
  ║   ws://localhost:${config.port}/realtime       ║
  ╚═══════════════════════════════════════╝
  `)
})
