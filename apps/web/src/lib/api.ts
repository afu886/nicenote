import type { AppType } from 'api'
import { hc } from 'hono/client'

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim() || '/api'

const client = hc<AppType>(apiBaseUrl)

export const api = client

export async function throwApiError(res: Response, fallback: string): Promise<never> {
  let message = fallback
  try {
    const body = (await res.json()) as { error?: string }
    if (body.error) message = body.error
  } catch {
    // JSON 解析失败（如服务端返回 HTML 错误页），使用 fallback
  }
  throw new Error(message)
}
