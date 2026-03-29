# Azure 環境構築手順書

Moe-Link の動作に必要な Azure リソースを作成する手順です。
作業時間の目安：約 30〜45 分

---

## 前提

- Azure アカウントが作成済みであること
- サブスクリプションが有効であること
- Azure OpenAI Service の利用申請が承認済みであること
  ※ 未申請の場合は https://aka.ms/oai/access から申請（承認まで数日かかる場合あり）

---

## 作成するリソース一覧

| リソース種別 | 推奨名 | 用途 |
|---|---|---|
| リソースグループ | `rg-moelink` | 全リソースをまとめる入れ物 |
| Azure OpenAI Service | `aoai-moe-link` | gpt-realtime-1.5（音声通話） |
| Azure AI Search | `srch-moelink` | RAG（キャラ設定・記憶の検索） |

---

## 手順 1：リソースグループの作成

1. [Azure Portal](https://portal.azure.com) にサインイン
2. 上部検索バーで **「リソースグループ」** を検索して選択
3. **「＋ 作成」** をクリック
4. 以下を入力して **「確認および作成」→「作成」**

| 項目 | 値 |
|---|---|
| サブスクリプション | 使用するサブスクリプションを選択 |
| リソースグループ名 | `rg-moelink` |
| リージョン | `Japan East`（または最寄りのリージョン） |

---

## 手順 2：Azure OpenAI Service の作成

### 2-1. リソース作成

1. 上部検索バーで **「Azure OpenAI」** を検索して選択
2. **「＋ 作成」** をクリック
3. 以下を入力して **「次へ」** を繰り返し、**「作成」**

| 項目 | 値 |
|---|---|
| サブスクリプション | 手順1と同じ |
| リソースグループ | `rg-moelink` |
| リージョン | `East US 2` ※後述の注意点を参照 |
| 名前 | `aoai-moe-link`（グローバル一意） |
| 価格レベル | `Standard S0` |

> **リージョンの注意点**
> `gpt-realtime-1.5` は **East US 2** または **Sweden Central** でのみ利用可能。
> Japan East では現時点でデプロイできないため、East US 2 を推奨。

### 2-2. モデルのデプロイ

1. 作成した Azure OpenAI リソースを開く
2. 左メニューから **「Azure AI Foundry に移動」** をクリック（または `https://ai.azure.com` へ直接アクセス）
3. 左メニューの **「デプロイ」** を選択
4. **「＋ モデルのデプロイ」→「基本モデルをデプロイする」** をクリック
5. モデル一覧から **`gpt-realtime-1.5`** を選択して **「確認」**
6. 以下を設定して **「デプロイ」**

| 項目 | 値 |
|---|---|
| デプロイ名 | `gpt-realtime-1.5`（`.env` の `AZURE_OPENAI_DEPLOYMENT` に使用） |
| モデルバージョン | 最新版を選択 |
| デプロイの種類 | `Standard` |
| トークン/分のレート制限 | `10K`（開発用途では十分） |

> **モデルのバージョンについて**
>
> | モデル名 | 状態 | 備考 |
> |---|---|---|
> | `gpt-realtime-1.5` | ✅ 推奨（最新） | 多言語・指示追従が向上 |
> | `gpt-realtime` | ✅ 利用可 | 標準版 |
> | `gpt-realtime-mini` | ✅ 利用可 | 軽量・低コスト版 |
> | `gpt-4o-realtime-preview` | ❌ 廃止済み | 使用不可 |

### 2-3. エンドポイントと API キーの取得

1. Azure Portal で `aoai-moe-link` リソースを開く
2. 左メニューの **「キーとエンドポイント」** を選択
3. 以下をコピーして `.env` に貼り付ける

| `.env` の変数名 | 取得場所 |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | 「エンドポイント」欄（例：`https://aoai-moe-link.openai.azure.com`）末尾のスラッシュは不要 |
| `AZURE_OPENAI_API_KEY` | 「キー1」または「キー2」 |

---

## 手順 3：Azure AI Search の作成

### 3-1. リソース作成

1. 上部検索バーで **「AI Search」** を検索して選択
2. **「＋ 作成」** をクリック
3. 以下を入力して **「確認および作成」→「作成」**

| 項目 | 値 |
|---|---|
| サブスクリプション | 手順1と同じ |
| リソースグループ | `rg-moelink` |
| サービス名 | `srch-moelink`（グローバル一意） |
| 場所 | `Japan East` |
| 価格レベル | `Basic` ※下記参照 |

> **価格レベルについて**
> - `Free`：1サブスクリプションにつき1つまで。インデックス数3まで。開発試用に使用可。
> - `Basic`：インデックス数15まで。本番運用には Basic 以上を推奨。
> セマンティック検索（意味検索）を使う場合は `Standard` 以上が必要。

### 3-2. エンドポイントと API キーの取得

1. Azure Portal で `srch-moelink` リソースを開く
2. 左メニューの **「概要」** を選択
3. **「URL」** をコピー → `.env` の `AZURE_SEARCH_ENDPOINT` に設定
4. 左メニューの **「キー」** を選択
5. **「プライマリ管理者キー」** をコピー → `.env` の `AZURE_SEARCH_API_KEY` に設定

> **クエリキーではなく管理者キーを使用すること**
> `npm run seed` でインデックス作成・データ投入を行うため、書き込み権限のある管理者キーが必要。

---

## 手順 4：.env への反映

`backend/.env` を以下のように設定する（`.env.example` を `.env` にコピーして編集）。

```env
AZURE_OPENAI_ENDPOINT=https://aoai-moe-link.openai.azure.com
AZURE_OPENAI_API_KEY=（手順2-3でコピーしたキー）
AZURE_OPENAI_DEPLOYMENT=gpt-realtime-1.5

AZURE_SEARCH_ENDPOINT=https://srch-moelink.search.windows.net
AZURE_SEARCH_API_KEY=（手順3-2でコピーした管理者キー）

PORT=3001
FRONTEND_URL=http://localhost:5173
```

> **⚠️ セキュリティ注意事項**
> - `.env` は `.gitignore` で除外済みのため Git にコミットされない
> - `.env.example` はプレースホルダーのみ記載し、**実際のキーを絶対に書かないこと**
> - API キーが漏洩した場合は Azure Portal でキーを即座に再生成すること

---

## 手順 5：動作確認

### Azure OpenAI の疎通確認

Azure AI Foundry（`https://ai.azure.com`）の **「プレイグラウンド」→「リアルタイム音声」** から
デプロイした `gpt-realtime-1.5` に話しかけて応答が返れば正常。

### Azure AI Search のインデックス確認

`npm run seed` 実行後、Azure Portal で `srch-moelink` → **「インデックス」** を開き
`char-profile`（7件）と `user-memory`（6件）が表示されれば正常。

---

## コスト目安

開発・学習用途での概算（実際の利用量により変動）。

| リソース | 価格レベル | 月額目安 |
|---|---|---|
| Azure OpenAI gpt-realtime-1.5 | Standard / トークン従量 | 数百〜数千円（通話量による） |
| Azure AI Search | Basic | 約 ¥3,000/月 |
| Azure AI Search | Free | ¥0（開発用途のみ） |

> 不要になったリソースは必ず **リソースグループごと削除** してコストを止めること。
> Azure Portal → `rg-moelink` → **「リソースグループの削除」**

---

## トラブルシューティング

**「gpt-realtime-1.5 が一覧に表示されない」**
→ リソースのリージョンを East US 2 または Sweden Central に変更して再作成する。

**「Azure OpenAI Service の作成ができない」**
→ 利用申請（https://aka.ms/oai/access）が承認されていない可能性がある。申請状況を確認する。

**「seed スクリプトで 403 エラーが出る」**
→ `AZURE_SEARCH_API_KEY` にクエリキーではなく **管理者キー** を設定しているか確認する。

**「seed スクリプトで 404 エラーが出る」**
→ `AZURE_SEARCH_ENDPOINT` の URL が正しいか確認する（末尾にスラッシュ不要）。

**「WebSocket 接続エラーが出る」**
→ `AZURE_OPENAI_ENDPOINT` の末尾にスラッシュ（`/`）が含まれていないか確認する。
