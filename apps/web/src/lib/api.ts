import { hc } from 'hono/client'

import type { AppType } from '@nicenote/contract'

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim() || '/api'

const client = hc<AppType>(apiBaseUrl)

export const api = client
