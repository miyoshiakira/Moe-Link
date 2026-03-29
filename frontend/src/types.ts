export interface Message {
  id: number
  role: 'ai' | 'user'
  text: string
  time: string
}
