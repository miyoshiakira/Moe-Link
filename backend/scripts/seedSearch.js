/**
 * Azure AI Search にインデックスを作成してデータを投入するスクリプト
 *
 * 使い方:
 *   cd backend
 *   cp .env.example .env   # .env を編集して Azure 認証情報を設定
 *   npm run seed
 */

import { SearchIndexClient, AzureKeyCredential } from '@azure/search-documents'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

dotenv.config()

const __dir = dirname(fileURLToPath(import.meta.url))

const endpoint = process.env.AZURE_SEARCH_ENDPOINT
const apiKey = process.env.AZURE_SEARCH_API_KEY

if (!endpoint || !apiKey) {
  console.error('AZURE_SEARCH_ENDPOINT と AZURE_SEARCH_API_KEY を .env に設定してください')
  process.exit(1)
}

const adminClient = new SearchIndexClient(endpoint, new AzureKeyCredential(apiKey))

// ──────────────────────────────────────────
// インデックス定義（共通スキーマ）
// ──────────────────────────────────────────
function buildIndexDefinition(name) {
  return {
    name,
    fields: [
      { name: 'id',       type: 'Edm.String',  key: true,  searchable: false },
      { name: 'title',    type: 'Edm.String',  searchable: true,  filterable: true  },
      { name: 'category', type: 'Edm.String',  searchable: false, filterable: true  },
      { name: 'content',  type: 'Edm.String',  searchable: true,  filterable: false },
    ],
  }
}

// ──────────────────────────────────────────
// インデックス作成 → ドキュメント投入
// ──────────────────────────────────────────
async function seedIndex(indexName, dataFile) {
  console.log(`\n▶ ${indexName} の処理を開始します`)

  // インデックスを作成（既存の場合は上書き）
  await adminClient.createOrUpdateIndex(buildIndexDefinition(indexName))
  console.log(`  ✓ インデックス作成/更新完了`)

  // データ読み込み
  const docs = JSON.parse(readFileSync(join(__dir, '..', 'data', dataFile), 'utf-8'))

  // SearchClient でドキュメントを投入
  const { SearchClient } = await import('@azure/search-documents')
  const searchClient = new SearchClient(endpoint, indexName, new AzureKeyCredential(apiKey))
  const result = await searchClient.uploadDocuments(docs)

  const succeeded = result.results.filter(r => r.succeeded).length
  const failed    = result.results.filter(r => !r.succeeded).length
  console.log(`  ✓ ドキュメント投入: ${succeeded} 件成功 / ${failed} 件失敗`)
}

// ──────────────────────────────────────────
// メイン
// ──────────────────────────────────────────
async function main() {
  console.log('=== Moe-Link Azure AI Search シードスクリプト ===')
  console.log(`エンドポイント: ${endpoint}`)

  await seedIndex('char-profile', 'char-profile.json')
  await seedIndex('user-memory',  'user-memory.json')

  console.log('\n✅ すべてのインデックスへのデータ投入が完了しました')
  console.log('   Azure Portal > AI Search > インデックス から確認できます')
}

main().catch(err => {
  console.error('シードスクリプトエラー:', err)
  process.exit(1)
})
