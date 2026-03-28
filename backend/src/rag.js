import { SearchClient, AzureKeyCredential } from '@azure/search-documents'
import { config } from './config.js'

const credential = new AzureKeyCredential(config.azureSearch.apiKey)

// インデックスごとにクライアントをキャッシュ
const clients = {}
function getClient(indexName) {
  if (!clients[indexName]) {
    clients[indexName] = new SearchClient(
      config.azureSearch.endpoint,
      indexName,
      credential,
    )
  }
  return clients[indexName]
}

/**
 * Azure AI Search でキャラクター設定 or ユーザー記憶を検索する
 *
 * @param {string} query   検索クエリ
 * @param {'char-profile'|'user-memory'} indexName  検索対象インデックス
 * @returns {Promise<string>}  モデルへ渡す検索結果テキスト
 */
export async function searchMemory(query, indexName) {
  const client = getClient(indexName)

  try {
    const results = await client.search(query, {
      top: 3,
      select: ['id', 'title', 'content', 'category'],
      // Azure AI Search のセマンティック検索を有効化している場合は以下を有効に
      // queryType: 'semantic',
      // semanticSearchOptions: { configurationName: 'default' },
    })

    const docs = []
    for await (const result of results.results) {
      docs.push(`[${result.document.title ?? result.document.category}]\n${result.document.content}`)
    }

    if (docs.length === 0) {
      return `「${query}」に関連する情報は見つかりませんでした。`
    }

    return docs.join('\n\n')
  } catch (err) {
    console.error(`[RAG] 検索エラー (${indexName}):`, err.message)
    return `検索中にエラーが発生しました: ${err.message}`
  }
}
