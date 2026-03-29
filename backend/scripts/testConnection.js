/**
 * Azure OpenAI Realtime API への接続テストスクリプト
 *
 * 使い方:
 *   cd backend
 *   node scripts/testConnection.js
 */

import WebSocket from 'ws'
import dotenv from 'dotenv'
dotenv.config()

const { AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, AZURE_OPENAI_DEPLOYMENT } = process.env

if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY || !AZURE_OPENAI_DEPLOYMENT) {
  console.error('❌ .env に AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY / AZURE_OPENAI_DEPLOYMENT を設定してください')
  process.exit(1)
}

const base = AZURE_OPENAI_ENDPOINT.replace(/^https/, 'wss').replace(/\/$/, '')
const url  = `${base}/openai/realtime?api-version=2025-04-01-preview&deployment=${AZURE_OPENAI_DEPLOYMENT}`

console.log('接続テスト開始')
console.log('  エンドポイント:', AZURE_OPENAI_ENDPOINT)
console.log('  デプロイ名    :', AZURE_OPENAI_DEPLOYMENT)
console.log('  WebSocket URL :', url)
console.log()

const ws = new WebSocket(url, { headers: { 'api-key': AZURE_OPENAI_API_KEY } })

const timeout = setTimeout(() => {
  console.error('❌ タイムアウト（10秒以内に応答なし）')
  ws.terminate()
  process.exit(1)
}, 10000)

ws.on('open', () => {
  console.log('✅ WebSocket 接続成功')
})

ws.on('message', (data) => {
  const event = JSON.parse(data)
  console.log('受信イベント:', event.type)

  if (event.type === 'session.created') {
    console.log('✅ Azure OpenAI Realtime API セッション確立成功')
    console.log('   セッションID:', event.session?.id)
    clearTimeout(timeout)
    ws.close()
    process.exit(0)
  }

  if (event.type === 'error') {
    console.error('❌ Azure エラー:', event.error?.message)
    clearTimeout(timeout)
    ws.close()
    process.exit(1)
  }
})

ws.on('unexpected-response', (_, res) => {
  console.error(`❌ HTTP ${res.statusCode} ${res.statusMessage}`)
  if (res.statusCode === 404) {
    console.error('   → デプロイ名が存在しません。Azure AI Foundry でデプロイを作成してください。')
    console.error('   → デプロイ名:', AZURE_OPENAI_DEPLOYMENT)
  }
  if (res.statusCode === 401) {
    console.error('   → 認証エラー。AZURE_OPENAI_API_KEY を確認してください。')
  }
  clearTimeout(timeout)
  process.exit(1)
})

ws.on('error', (err) => {
  console.error('❌ 接続エラー:', err.message)
  clearTimeout(timeout)
  process.exit(1)
})
