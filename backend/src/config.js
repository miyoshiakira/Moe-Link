import dotenv from 'dotenv'
dotenv.config()

function required(key) {
  const val = process.env[key]
  if (!val) throw new Error(`環境変数 ${key} が設定されていません。.env.example を参考に .env を作成してください。`)
  return val
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  azureOpenAI: {
    endpoint: required('AZURE_OPENAI_ENDPOINT'),
    apiKey: required('AZURE_OPENAI_API_KEY'),
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-realtime-preview',
  },

  azureSearch: {
    endpoint: required('AZURE_SEARCH_ENDPOINT'),
    apiKey: required('AZURE_SEARCH_API_KEY'),
    charProfileIndex: 'char-profile',
    userMemoryIndex: 'user-memory',
  },
}
