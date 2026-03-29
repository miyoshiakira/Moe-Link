/**
 * Azure AI Search の記憶データを個別に更新・削除・一覧表示する CLI
 *
 * 使い方:
 *   npm run memory -- upsert <index> --id <id> --title <title> --category <cat> --content <content>
 *   npm run memory -- delete <index> --id <id>
 *   npm run memory -- list   <index>
 *
 * index:
 *   user-memory   ← ユーザーとの思い出・出来事
 *   char-profile  ← モエのキャラクター設定
 *
 * 例:
 *   npm run memory -- upsert user-memory --id um-007 --title "初めての映画" --category "outing" --content "一緒に映画を見に行ったぞ！"
 *   npm run memory -- delete user-memory --id um-007
 *   npm run memory -- list user-memory
 */

import { SearchClient, AzureKeyCredential } from '@azure/search-documents'
import dotenv from 'dotenv'

dotenv.config()

const endpoint = process.env.AZURE_SEARCH_ENDPOINT
const apiKey   = process.env.AZURE_SEARCH_API_KEY

if (!endpoint || !apiKey) {
  console.error('AZURE_SEARCH_ENDPOINT と AZURE_SEARCH_API_KEY を .env に設定してください')
  process.exit(1)
}

// ──────────────────────────────────────────
// 引数パーサ（--key value 形式）
// ──────────────────────────────────────────
function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2)
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true
      args[key] = val
    }
  }
  return args
}

const [command, indexName, ...rest] = process.argv.slice(2)
const args = parseArgs(rest)

const VALID_INDEXES = ['user-memory', 'char-profile']

if (!command || !indexName || !VALID_INDEXES.includes(indexName)) {
  console.error(`
使い方:
  npm run memory -- upsert <index> --id <id> --title <title> --category <cat> --content <content>
  npm run memory -- delete <index> --id <id>
  npm run memory -- list   <index>

index: ${VALID_INDEXES.join(' | ')}
`)
  process.exit(1)
}

const client = new SearchClient(endpoint, indexName, new AzureKeyCredential(apiKey))

// ──────────────────────────────────────────
// コマンド実行
// ──────────────────────────────────────────
async function main() {
  switch (command) {

    // ── upsert: 追加 or 上書き ──
    case 'upsert': {
      const { id, title, category, content } = args
      if (!id || !title || !category || !content) {
        console.error('upsert には --id --title --category --content が必要です')
        process.exit(1)
      }

      const doc = { id, title, category, content }
      const result = await client.mergeOrUploadDocuments([doc])
      const ok = result.results[0]

      if (ok.succeeded) {
        console.log(`✅ [${indexName}] upsert 成功: id="${id}"`)
        console.log(`   title   : ${title}`)
        console.log(`   category: ${category}`)
        console.log(`   content : ${content}`)
      } else {
        console.error(`❌ upsert 失敗:`, ok.errorMessage)
        process.exit(1)
      }
      break
    }

    // ── delete: 削除 ──
    case 'delete': {
      const { id } = args
      if (!id) {
        console.error('delete には --id が必要です')
        process.exit(1)
      }

      const result = await client.deleteDocuments([{ id }])
      const ok = result.results[0]

      if (ok.succeeded) {
        console.log(`✅ [${indexName}] 削除成功: id="${id}"`)
      } else {
        console.error(`❌ 削除失敗:`, ok.errorMessage)
        process.exit(1)
      }
      break
    }

    // ── list: 一覧表示 ──
    case 'list': {
      const results = await client.search('*', {
        select: ['id', 'title', 'category', 'content'],
        top: 100,
        orderBy: ['id asc'],
      })

      const docs = []
      for await (const r of results.results) {
        docs.push(r.document)
      }

      if (docs.length === 0) {
        console.log(`[${indexName}] ドキュメントなし`)
        break
      }

      console.log(`\n[${indexName}] ${docs.length} 件\n`)
      for (const d of docs) {
        console.log(`  id      : ${d.id}`)
        console.log(`  title   : ${d.title}`)
        console.log(`  category: ${d.category}`)
        console.log(`  content : ${d.content}`)
        console.log()
      }
      break
    }

    default:
      console.error(`不明なコマンド: ${command}`)
      console.error('upsert / delete / list のいずれかを指定してください')
      process.exit(1)
  }
}

main().catch(err => {
  console.error('エラー:', err.message)
  process.exit(1)
})
